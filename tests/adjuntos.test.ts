import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from './helpers/test-prisma';
import { cabeceraContentDisposition, type ArchivoPdf } from '@/lib/adjuntos';
import { crearExpediente, editarExpediente, NumeroSuocDuplicadoError } from '@/lib/expedientes';
import { crearSalida } from '@/lib/salidas';
import { EstadoFinalError } from '@/lib/estados';

// Adjuntos: la cabecera de descarga acepta cualquier nombre de archivo, y un
// PDF nunca queda huérfano en la base si falla la operación que lo usa.

const PREFIJO = 'TEST_ADJ_';

function pdf(nombre: string): ArchivoPdf {
  const contenido = Buffer.from('%PDF-1.4 prueba');
  return {
    nombreArchivo: `${PREFIJO}${nombre}`,
    mimeType: 'application/pdf',
    tamanioBytes: contenido.length,
    contenido,
  };
}

function contarAdjuntos(nombre: string) {
  return prisma.adjunto.count({ where: { nombreArchivo: `${PREFIJO}${nombre}` } });
}

describe('Content-Disposition de los adjuntos', () => {
  it.each(['nota – final.pdf', 'recepción año.pdf', 'a"b\\c.pdf', "nota (1) 'copia'*.pdf"])(
    'arma una cabecera válida que conserva el nombre: %s',
    (nombre) => {
      const valor = cabeceraContentDisposition(nombre);
      const respuesta = new Response('x', { headers: { 'Content-Disposition': valor } });

      const utf8 = respuesta.headers.get('Content-Disposition')!.split("filename*=UTF-8''")[1];
      expect(decodeURIComponent(utf8)).toBe(nombre);
    },
  );
});

describe('Adjuntos sin huérfanos', () => {
  let tipoDocumentoId: number;
  let servicioId: number;
  let estadoId: number;
  const expedienteIds: number[] = [];

  beforeAll(async () => {
    tipoDocumentoId = (await prisma.tipoDocumento.create({ data: { nombre: `${PREFIJO}tipo` } }))
      .id;
    servicioId = (await prisma.servicio.create({ data: { nombre: `${PREFIJO}servicio` } })).id;
    // Estado inicial y final a la vez: cualquier cambio de estado falla (EstadoFinalError).
    estadoId = (
      await prisma.estado.create({
        data: { nombre: `${PREFIJO}final`, orden: -800, esFinal: true },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.expediente.deleteMany({ where: { id: { in: expedienteIds } } });
    await prisma.adjunto.deleteMany({ where: { nombreArchivo: { startsWith: PREFIJO } } });
    await prisma.tipoDocumento.delete({ where: { id: tipoDocumentoId } });
    await prisma.servicio.delete({ where: { id: servicioId } });
    await prisma.estado.delete({ where: { id: estadoId } });
  });

  function datosBase(fechaIngresoSuoc: Date) {
    return {
      nroMesaEntrada: 'test-mesa',
      fechaIngresoAdm: fechaIngresoSuoc,
      fechaIngresoSuoc,
      tipoDocumentoId,
      servicioOrigenId: servicioId,
      asunto: 'Prueba adjuntos',
    };
  }

  it('guarda el adjunto junto con el expediente', async () => {
    const e = await crearExpediente({
      ...datosBase(new Date('2090-01-01T10:00:00Z')),
      adjunto: pdf('ok.pdf'),
    });
    expedienteIds.push(e.id);

    const adjunto = await prisma.adjunto.findUniqueOrThrow({ where: { id: e.adjuntoId! } });
    expect(adjunto.nombreArchivo).toBe(`${PREFIJO}ok.pdf`);
  });

  it('no deja el adjunto si el número SUOC manual está duplicado', async () => {
    const fecha = new Date('2091-01-01T10:00:00Z');
    const e = await crearExpediente({ ...datosBase(fecha), nroSuocManual: 1 });
    expedienteIds.push(e.id);

    await expect(
      crearExpediente({ ...datosBase(fecha), nroSuocManual: 1, adjunto: pdf('duplicado.pdf') }),
    ).rejects.toBeInstanceOf(NumeroSuocDuplicadoError);
    expect(await contarAdjuntos('duplicado.pdf')).toBe(0);
  });

  it('no deja la salida ni su adjunto si falla el cambio de estado', async () => {
    const e = await crearExpediente(datosBase(new Date('2092-01-01T10:00:00Z')));
    expedienteIds.push(e.id);

    await expect(
      crearSalida({
        expedienteId: e.id,
        tipo: 'OTRO',
        fecha: new Date('2092-01-02T10:00:00Z'),
        descripcion: 'Prueba',
        adjunto: pdf('salida.pdf'),
        cambiarEstado: { estadoNuevoId: estadoId },
      }),
    ).rejects.toBeInstanceOf(EstadoFinalError);
    expect(await contarAdjuntos('salida.pdf')).toBe(0);
    expect(await prisma.salida.count({ where: { expedienteId: e.id } })).toBe(0);
  });

  it('al editar, reemplaza el adjunto y borra el anterior', async () => {
    const fecha = new Date('2093-01-01T10:00:00Z');
    const e = await crearExpediente({ ...datosBase(fecha), adjunto: pdf('viejo.pdf') });
    expedienteIds.push(e.id);

    const editado = await editarExpediente(e.id, {
      ...datosBase(fecha),
      nuevoAdjunto: pdf('nuevo.pdf'),
    });

    expect(editado.adjuntoId).not.toBe(e.adjuntoId);
    expect(await contarAdjuntos('viejo.pdf')).toBe(0);
    expect(await contarAdjuntos('nuevo.pdf')).toBe(1);
  });

  it('al editar un expediente inexistente, no deja el adjunto nuevo', async () => {
    await expect(
      editarExpediente(999_999_999, {
        ...datosBase(new Date('2094-01-01T10:00:00Z')),
        nuevoAdjunto: pdf('inexistente.pdf'),
      }),
    ).rejects.toThrow();
    expect(await contarAdjuntos('inexistente.pdf')).toBe(0);
  });
});
