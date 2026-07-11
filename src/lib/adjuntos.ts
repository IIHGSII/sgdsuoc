import 'server-only';
import { prisma } from '@/lib/prisma';

export const MAX_BYTES_ADJUNTO = 10 * 1024 * 1024; // 10 MB: de sobra para PDFs escaneados livianos

export class ArchivoInvalidoError extends Error {}

/**
 * Valida y guarda un PDF subido por un <input type="file"> como Adjunto.
 * Devuelve null si no se adjuntó ningún archivo (campo opcional).
 */
export async function crearAdjuntoDesdeArchivo(
  file: File | null | undefined,
): Promise<number | null> {
  if (!file || file.size === 0) return null;

  if (file.type !== 'application/pdf') {
    throw new ArchivoInvalidoError('El archivo debe ser un PDF.');
  }
  if (file.size > MAX_BYTES_ADJUNTO) {
    throw new ArchivoInvalidoError(
      `El archivo supera el tamaño máximo permitido (${MAX_BYTES_ADJUNTO / (1024 * 1024)} MB).`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const adjunto = await prisma.adjunto.create({
    data: {
      nombreArchivo: file.name || 'documento.pdf',
      mimeType: file.type,
      tamanioBytes: file.size,
      contenido: buffer,
    },
  });
  return adjunto.id;
}
