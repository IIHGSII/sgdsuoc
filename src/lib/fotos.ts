import 'server-only';
import { PDFDocument } from 'pdf-lib';
import type { ArchivoPdf } from '@/lib/adjuntos';

// Fotos de las hojas de un expediente cargado desde el celular. El navegador
// las achica y convierte a JPEG antes de subirlas (ver
// app/(app)/expedientes/rapido/cargar-fotos-form.tsx), así que acá solo se
// aceptan JPEG.

export const MAX_FOTOS = 20;
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;
export const MAX_BYTES_FOTOS_TOTAL = 20 * 1024 * 1024;

export class FotoInvalidaError extends Error {}

/** Valida y lee las fotos subidas, en el orden recibido (= orden de las hojas). */
export async function leerFotosJpeg(archivos: File[]): Promise<Buffer<ArrayBuffer>[]> {
  if (archivos.length === 0) throw new FotoInvalidaError('Sacá al menos una foto.');
  if (archivos.length > MAX_FOTOS) {
    throw new FotoInvalidaError(`Se pueden cargar hasta ${MAX_FOTOS} fotos por expediente.`);
  }
  const total = archivos.reduce((suma, a) => suma + a.size, 0);
  if (total > MAX_BYTES_FOTOS_TOTAL) {
    throw new FotoInvalidaError('Las fotos son demasiado pesadas en total. Probá con menos hojas.');
  }

  const fotos: Buffer<ArrayBuffer>[] = [];
  for (const [i, archivo] of archivos.entries()) {
    if (archivo.size > MAX_BYTES_FOTO) {
      throw new FotoInvalidaError(`La foto ${i + 1} es demasiado pesada.`);
    }
    const contenido = Buffer.from(await archivo.arrayBuffer());
    // Firma JPEG (FF D8 FF): no se confía en el tipo que declara el navegador.
    if (
      contenido.length < 3 ||
      contenido[0] !== 0xff ||
      contenido[1] !== 0xd8 ||
      contenido[2] !== 0xff
    ) {
      throw new FotoInvalidaError(`La foto ${i + 1} no es una imagen válida.`);
    }
    fotos.push(contenido);
  }
  return fotos;
}

const A4 = { ancho: 595.28, alto: 841.89 };

/**
 * Une las fotos en un PDF, una por página A4 (vertical u horizontal según la
 * foto), ajustada sin deformarla. Es el PDF que queda como adjunto del expediente.
 */
export async function unirFotosEnPdf(fotos: Buffer[], nombreArchivo: string): Promise<ArchivoPdf> {
  const pdf = await PDFDocument.create();
  for (const foto of fotos) {
    // Copia a un Uint8Array propio: un Buffer chico de Node puede vivir dentro
    // de un bloque compartido (byteOffset ≠ 0) y pdf-lib lo leería desde el
    // principio del bloque ("SOI not found in JPEG").
    const imagen = await pdf.embedJpg(new Uint8Array(foto));
    const horizontal = imagen.width > imagen.height;
    const pagina = pdf.addPage(horizontal ? [A4.alto, A4.ancho] : [A4.ancho, A4.alto]);
    const escala = Math.min(pagina.getWidth() / imagen.width, pagina.getHeight() / imagen.height);
    const ancho = imagen.width * escala;
    const alto = imagen.height * escala;
    pagina.drawImage(imagen, {
      x: (pagina.getWidth() - ancho) / 2,
      y: (pagina.getHeight() - alto) / 2,
      width: ancho,
      height: alto,
    });
  }
  const contenido = Buffer.from(await pdf.save());
  return {
    nombreArchivo,
    mimeType: 'application/pdf',
    tamanioBytes: contenido.length,
    contenido,
  };
}
