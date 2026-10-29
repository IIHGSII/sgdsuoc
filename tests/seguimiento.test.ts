import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from './helpers/test-prisma';
import { crearExpediente } from '@/lib/expedientes';
import {
  listarSeguimientosAbiertos,
  registrarNovedad,
  SeguimientoInvalidoError,
} from '@/lib/seguimiento';

// Seguimiento "fuera de la SUOC": la primera novedad lo abre, las siguientes
// se acumulan y la de cierre lo cierra; solo los abiertos aparecen en el listado.

describe('Seguimiento fuera de la SUOC', () => {
  let tipoDocumentoId: number;
  let servicioId: number;
  let estadoId: number;
  const expedienteIds: number[] = [];

  beforeAll(async () => {
    tipoDocumentoId = (await prisma.tipoDocumento.create({ data: { nombre: 'TEST_SEG_tipo' } })).id;
    servicioId = (await prisma.servicio.create({ data: { nombre: 'TEST_SEG_servicio' } })).id;
    estadoId = (await prisma.estado.create({ data: { nombre: 'TEST_SEG_inicial', orden: -950 } }))
      .id;
  });

  afterAll(async () => {
    await prisma.trazabilidad.deleteMany({ where: { expedienteId: { in: expedienteIds } } });
    await prisma.expediente.deleteMany({ where: { id: { in: expedienteIds } } });
    await prisma.tipoDocumento.delete({ where: { id: tipoDocumentoId } });
    await prisma.servicio.delete({ where: { id: servicioId } });
    await prisma.estado.delete({ where: { id: estadoId } });
  });

  async function crearExpedienteDePrueba(anio: number) {
    const fecha = new Date(`${anio}-01-01T10:00:00Z`);
    const e = await crearExpediente({
      nroMesaEntrada: 'test-mesa',
      fechaIngresoAdm: fecha,
      fechaIngresoSuoc: fecha,
      tipoDocumentoId,
      servicioOrigenId: servicioId,
      asunto: 'Prueba seguimiento',
    });
    expedienteIds.push(e.id);
    return e;
  }

  it('abre, acumula novedades y cierra el seguimiento', async () => {
    const e = await crearExpedienteDePrueba(2091);
    expect(e.seguimiento).toBeNull();

    await registrarNovedad(e.id, {
      fecha: new Date('2091-02-01T12:00:00Z'),
      dondeEsta: 'DGGIES',
      detalle: 'Se emitió nota pidiendo la provisión',
    });
    await registrarNovedad(e.id, {
      fecha: new Date('2091-03-01T12:00:00Z'),
      dondeEsta: 'DGGIES',
      detalle: 'Informan que está en proceso de compra',
    });

    const fila = (await listarSeguimientosAbiertos()).find((f) => f.expedienteId === e.id);
    expect(fila?.ultimaNovedad).toBe('Informan que está en proceso de compra');
    expect(fila?.desde).toEqual(new Date('2091-02-01T12:00:00Z'));

    await registrarNovedad(
      e.id,
      { fecha: new Date('2091-04-01T12:00:00Z'), dondeEsta: 'Hospital', detalle: 'Llegaron' },
      { cerrar: true },
    );
    const cerrado = await prisma.expediente.findUniqueOrThrow({ where: { id: e.id } });
    expect(cerrado.seguimiento).toBe('CERRADO');
    expect((await listarSeguimientosAbiertos()).some((f) => f.expedienteId === e.id)).toBe(false);
    expect(await prisma.novedadSeguimiento.count({ where: { expedienteId: e.id } })).toBe(3);
  });

  it('no cierra un seguimiento que no está abierto ni acepta novedades vacías', async () => {
    const e = await crearExpedienteDePrueba(2092);
    const fecha = new Date('2092-02-01T12:00:00Z');
    await expect(
      registrarNovedad(e.id, { fecha, dondeEsta: 'DGAF', detalle: 'x' }, { cerrar: true }),
    ).rejects.toBeInstanceOf(SeguimientoInvalidoError);
    await expect(
      registrarNovedad(e.id, { fecha, dondeEsta: ' ', detalle: 'x' }),
    ).rejects.toBeInstanceOf(SeguimientoInvalidoError);
    const sinCambios = await prisma.expediente.findUniqueOrThrow({ where: { id: e.id } });
    expect(sinCambios.seguimiento).toBeNull();
  });
});
