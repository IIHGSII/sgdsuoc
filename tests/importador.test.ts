import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from './helpers/test-prisma';
import { importarRegistros, type RegistroDumpdata } from '@/lib/importador';

// Importador: fixture chico en formato dumpdata (el mismo shape que
// data/datos_sgd.json, no ese archivo real) para probar el mapeo
// documento -> Expediente y trazabilidad, y la idempotencia al re-importar.

const fixture: RegistroDumpdata[] = [
  {
    model: 'contrataciones.estado',
    pk: 1,
    fields: { nombre: 'TEST_IMPORT_Ingresado', orden: -700, es_final: false },
  },
  {
    model: 'contrataciones.estado',
    pk: 2,
    fields: { nombre: 'TEST_IMPORT_Archivado', orden: -699, es_final: true },
  },
  {
    model: 'contrataciones.tipodocumento',
    pk: 1,
    fields: { nombre: 'TEST_IMPORT_Informe', es_proceso: false },
  },
  { model: 'contrataciones.servicio', pk: 1, fields: { nombre: 'TEST_IMPORT_Servicio' } },
  {
    model: 'contrataciones.documento',
    pk: 1,
    fields: {
      nro_exp_suoc: '1/2085',
      año_ingreso: 2085,
      nro_exp_adm: '100',
      nro_documento: null,
      fecha_ingreso_adm: '2085-01-01T10:00:00Z',
      fecha_ingreso_suoc: '2085-01-02T10:00:00Z',
      tipo_documento: 1,
      servicio: 1,
      objeto_o_resumen: 'Prueba de importación con ñ y tildes: año, José',
      monto_estimado: null,
      estado_actual: 2,
      responsable_actual: 'admin',
      fecha_ultima_act: '2085-01-05T10:00:00Z',
    },
  },
  {
    model: 'contrataciones.trazabilidad',
    pk: 1,
    fields: {
      expediente: 1,
      estado_anterior: null,
      estado_nuevo: 1,
      fecha_cambio: '2085-01-02T10:00:00Z',
      observaciones: 'Ingreso del expediente al sistema.',
    },
  },
  {
    model: 'contrataciones.trazabilidad',
    pk: 2,
    fields: {
      expediente: 1,
      estado_anterior: 1,
      estado_nuevo: 2,
      fecha_cambio: '2085-01-05T10:00:00Z',
      observaciones: 'Se archiva.',
    },
  },
];

describe('Importador de datos del sistema anterior', () => {
  let tipoDocumentoId: number;
  let servicioId: number;
  let estadoIngresadoId: number;
  let estadoArchivadoId: number;

  beforeAll(async () => {
    // Los catálogos ya deben existir (por prisma/seed.ts en la app real);
    // acá los creamos nosotros para simular ese estado previo.
    const tipo = await prisma.tipoDocumento.create({ data: { nombre: 'TEST_IMPORT_Informe' } });
    tipoDocumentoId = tipo.id;
    const servicio = await prisma.servicio.create({ data: { nombre: 'TEST_IMPORT_Servicio' } });
    servicioId = servicio.id;
    const ingresado = await prisma.estado.create({
      data: { nombre: 'TEST_IMPORT_Ingresado', orden: -700, esFinal: false },
    });
    estadoIngresadoId = ingresado.id;
    const archivado = await prisma.estado.create({
      data: { nombre: 'TEST_IMPORT_Archivado', orden: -699, esFinal: true },
    });
    estadoArchivadoId = archivado.id;
  });

  afterAll(async () => {
    const expediente = await prisma.expediente.findUnique({
      where: { nroSuoc_anioSuoc: { nroSuoc: 1, anioSuoc: 2085 } },
    });
    if (expediente) {
      await prisma.trazabilidad.deleteMany({ where: { expedienteId: expediente.id } });
      await prisma.expediente.delete({ where: { id: expediente.id } });
    }
    await prisma.tipoDocumento.delete({ where: { id: tipoDocumentoId } });
    await prisma.servicio.delete({ where: { id: servicioId } });
    await prisma.estado.deleteMany({
      where: { id: { in: [estadoIngresadoId, estadoArchivadoId] } },
    });
  });

  it('importa el documento como Expediente y la trazabilidad, preservando tildes/ñ', async () => {
    const resumen = await importarRegistros(fixture, prisma);

    expect(resumen.catalogosFaltantes).toEqual([]);
    expect(resumen.avisos).toEqual([]);
    expect(resumen.documentosCreados).toBe(1);
    expect(resumen.documentosOmitidos).toBe(0);
    expect(resumen.trazabilidadCreada).toBe(2);

    const expediente = await prisma.expediente.findUniqueOrThrow({
      where: { nroSuoc_anioSuoc: { nroSuoc: 1, anioSuoc: 2085 } },
    });
    expect(expediente.nroMesaEntrada).toBe('100');
    expect(expediente.asunto).toBe('Prueba de importación con ñ y tildes: año, José');
    expect(expediente.estadoActualId).toBe(estadoArchivadoId);

    const trazas = await prisma.trazabilidad.findMany({
      where: { expedienteId: expediente.id },
      orderBy: { fechaCambio: 'asc' },
    });
    expect(trazas).toHaveLength(2);
    expect(trazas[0].estadoAnteriorId).toBeNull();
    expect(trazas[0].estadoNuevoId).toBe(estadoIngresadoId);
    expect(trazas[1].estadoAnteriorId).toBe(estadoIngresadoId);
    expect(trazas[1].estadoNuevoId).toBe(estadoArchivadoId);
  });

  it('es idempotente: re-importar el mismo fixture no duplica nada', async () => {
    const resumen = await importarRegistros(fixture, prisma);

    expect(resumen.documentosCreados).toBe(0);
    expect(resumen.documentosActualizados).toBe(1);
    expect(resumen.trazabilidadCreada).toBe(0);
    expect(resumen.trazabilidadOmitida).toBe(2);

    const expediente = await prisma.expediente.findUniqueOrThrow({
      where: { nroSuoc_anioSuoc: { nroSuoc: 1, anioSuoc: 2085 } },
    });
    const trazas = await prisma.trazabilidad.findMany({ where: { expedienteId: expediente.id } });
    expect(trazas).toHaveLength(2);
  });

  it('reporta catálogos faltantes en vez de importar con referencias rotas', async () => {
    const fixtureConCatalogoFaltante: RegistroDumpdata[] = [
      {
        model: 'contrataciones.estado',
        pk: 99,
        fields: { nombre: 'TEST_IMPORT_NoExiste', orden: 1, es_final: false },
      },
    ];

    const resumen = await importarRegistros(fixtureConCatalogoFaltante, prisma);

    expect(resumen.catalogosFaltantes).toEqual(['Estado "TEST_IMPORT_NoExiste"']);
    expect(resumen.documentosCreados).toBe(0);
  });
});
