import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { prisma } from './helpers/test-prisma';
import { crearExpedienteConFotos, editarExpediente } from '@/lib/expedientes';
import { FotoInvalidaError, leerFotosJpeg, unirFotosEnPdf } from '@/lib/fotos';

// Alta rápida desde el celular: fotos de las hojas → número SUOC en el
// momento, fotos y PDF unido guardados, expediente en la bandeja "Por
// procesar" hasta que se completan sus datos con la edición.

// JPEG chicos generados una vez (20x30 vertical y 30x20 horizontal).
const JPEG_VERTICAL = Buffer.from(
  '/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAeABQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKAAAAAAAAD/2Q==',
  'base64',
);
const JPEG_HORIZONTAL = Buffer.from(
  '/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAUAB4DASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AAAAAAAAA/9k=',
  'base64',
);

function archivo(contenido: Buffer | string, nombre = 'hoja.jpg') {
  const parte = typeof contenido === 'string' ? contenido : new Uint8Array(contenido);
  return new File([parte], nombre, { type: 'image/jpeg' });
}

describe('Validación de las fotos subidas', () => {
  it('acepta JPEG y conserva el orden', async () => {
    const fotos = await leerFotosJpeg([archivo(JPEG_VERTICAL), archivo(JPEG_HORIZONTAL)]);
    expect(fotos).toHaveLength(2);
    expect(fotos[0].equals(JPEG_VERTICAL)).toBe(true);
    expect(fotos[1].equals(JPEG_HORIZONTAL)).toBe(true);
  });

  it('rechaza un archivo que no es una imagen JPEG y la lista vacía', async () => {
    await expect(leerFotosJpeg([archivo('no soy una foto')])).rejects.toThrow(
      new FotoInvalidaError('La foto 1 no es una imagen válida.'),
    );
    await expect(leerFotosJpeg([])).rejects.toBeInstanceOf(FotoInvalidaError);
  });

  it('une las fotos en un PDF, una página por foto y con la orientación de cada una', async () => {
    const pdf = await unirFotosEnPdf([JPEG_VERTICAL, JPEG_HORIZONTAL], 'prueba.pdf');
    expect(pdf.mimeType).toBe('application/pdf');

    const doc = await PDFDocument.load(pdf.contenido);
    expect(doc.getPageCount()).toBe(2);
    const [p1, p2] = doc.getPages();
    expect(p1.getHeight()).toBeGreaterThan(p1.getWidth());
    expect(p2.getWidth()).toBeGreaterThan(p2.getHeight());
  });
});

describe('Alta de expediente con fotos (bandeja "Por procesar")', () => {
  let estadoId: number;
  let tipoDocumentoId: number;
  let servicioId: number;
  const expedienteIds: number[] = [];

  beforeAll(async () => {
    // Orden muy bajo: es el estado inicial mientras corren estos tests.
    estadoId = (
      await prisma.estado.create({
        data: { nombre: 'TEST_FOTOS_estado', orden: -500, esFinal: false },
      })
    ).id;
    tipoDocumentoId = (await prisma.tipoDocumento.create({ data: { nombre: 'TEST_FOTOS_tipo' } }))
      .id;
    servicioId = (await prisma.servicio.create({ data: { nombre: 'TEST_FOTOS_servicio' } })).id;
  });

  afterAll(async () => {
    const adjuntos = await prisma.expediente.findMany({
      where: { id: { in: expedienteIds } },
      select: { adjuntoId: true, fotos: { select: { adjuntoId: true } } },
    });
    const adjuntoIds = adjuntos.flatMap((e) => [
      ...(e.adjuntoId ? [e.adjuntoId] : []),
      ...e.fotos.map((f) => f.adjuntoId),
    ]);
    await prisma.expediente.deleteMany({ where: { id: { in: expedienteIds } } });
    await prisma.adjunto.deleteMany({ where: { id: { in: adjuntoIds } } });
    await prisma.estado.delete({ where: { id: estadoId } });
    await prisma.tipoDocumento.delete({ where: { id: tipoDocumentoId } });
    await prisma.servicio.delete({ where: { id: servicioId } });
  });

  it('asigna el número en el momento y guarda fotos, PDF y trazabilidad de ingreso', async () => {
    const ahora = new Date('2096-03-10T13:00:00Z');
    const e = await crearExpedienteConFotos([JPEG_VERTICAL, JPEG_HORIZONTAL], ahora);
    expedienteIds.push(e.id);

    expect(e.nroSuoc).toBe(1);
    expect(e.anioSuoc).toBe(2096);
    expect(e.fechaIngresoSuoc).toEqual(ahora);
    expect(e.porProcesar).toBe(true);
    expect(e.estadoActualId).toBe(estadoId);
    expect(e.nroMesaEntrada).toBeNull();
    expect(e.asunto).toBeNull();
    expect(e.tipoDocumentoId).toBeNull();

    const fotos = await prisma.fotoExpediente.findMany({
      where: { expedienteId: e.id },
      orderBy: { orden: 'asc' },
      include: { adjunto: true },
    });
    expect(fotos.map((f) => f.orden)).toEqual([1, 2]);
    expect(fotos[0].adjunto.mimeType).toBe('image/jpeg');
    expect(Buffer.from(fotos[1].adjunto.contenido).equals(JPEG_HORIZONTAL)).toBe(true);

    const pdf = await prisma.adjunto.findUniqueOrThrow({ where: { id: e.adjuntoId! } });
    expect(pdf.mimeType).toBe('application/pdf');
    expect((await PDFDocument.load(pdf.contenido)).getPageCount()).toBe(2);

    const trazas = await prisma.trazabilidad.findMany({ where: { expedienteId: e.id } });
    expect(trazas).toHaveLength(1);
    expect(trazas[0].fechaCambio).toEqual(ahora);
  });

  it('el siguiente expediente toma el número siguiente', async () => {
    const e = await crearExpedienteConFotos([JPEG_VERTICAL], new Date('2096-03-11T13:00:00Z'));
    expedienteIds.push(e.id);
    expect(e.nroSuoc).toBe(2);
  });

  it('al completar los datos con la edición, sale de la bandeja y conserva sus fotos', async () => {
    const ingreso = new Date('2096-04-01T13:00:00Z');
    const e = await crearExpedienteConFotos([JPEG_VERTICAL], ingreso);
    expedienteIds.push(e.id);

    const editado = await editarExpediente(e.id, {
      nroMesaEntrada: 'ME-123',
      fechaIngresoAdm: new Date('2096-04-01T11:00:00Z'),
      fechaIngresoSuoc: ingreso,
      tipoDocumentoId,
      servicioOrigenId: servicioId,
      asunto: 'Solicitud de prueba',
    });

    expect(editado.porProcesar).toBe(false);
    expect(editado.nroMesaEntrada).toBe('ME-123');
    expect(editado.adjuntoId).toBe(e.adjuntoId);
    expect(await prisma.fotoExpediente.count({ where: { expedienteId: e.id } })).toBe(1);
  });
});
