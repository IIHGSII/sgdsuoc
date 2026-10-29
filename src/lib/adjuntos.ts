import 'server-only';
import type { Prisma } from '@/generated/prisma/client';

export const MAX_BYTES_ADJUNTO = 10 * 1024 * 1024; // 10 MB: de sobra para PDFs escaneados livianos

/**
 * Tiempo máximo de las transacciones que guardan un adjunto: el default de
 * Prisma (5 s) puede no alcanzar para escribir un PDF de 10 MB en la base.
 */
export const TIMEOUT_TRANSACCION_CON_ADJUNTO_MS = 30_000;

export class ArchivoInvalidoError extends Error {}

export type ArchivoPdf = {
  nombreArchivo: string;
  mimeType: string;
  tamanioBytes: number;
  contenido: Buffer<ArrayBuffer>;
};

/**
 * Valida y lee un PDF subido por un <input type="file">, sin guardarlo todavía:
 * se guarda con guardarAdjunto dentro de la misma transacción que el expediente
 * o la salida, para que si esa operación falla no quede un adjunto huérfano.
 * Devuelve null si no se adjuntó ningún archivo (campo opcional).
 */
export async function leerArchivoPdf(file: File | null | undefined): Promise<ArchivoPdf | null> {
  if (!file || file.size === 0) return null;

  if (file.type !== 'application/pdf') {
    throw new ArchivoInvalidoError('El archivo debe ser un PDF.');
  }
  if (file.size > MAX_BYTES_ADJUNTO) {
    throw new ArchivoInvalidoError(
      `El archivo supera el tamaño máximo permitido (${MAX_BYTES_ADJUNTO / (1024 * 1024)} MB).`,
    );
  }

  return {
    nombreArchivo: file.name || 'documento.pdf',
    mimeType: file.type,
    tamanioBytes: file.size,
    contenido: Buffer.from(await file.arrayBuffer()),
  };
}

/** Guarda el adjunto con el cliente de transacción recibido y devuelve su id (o null si no hay). */
export async function guardarAdjunto(
  tx: Prisma.TransactionClient,
  archivo: ArchivoPdf | null | undefined,
): Promise<number | null> {
  if (!archivo) return null;
  const adjunto = await tx.adjunto.create({ data: archivo });
  return adjunto.id;
}

/**
 * Valor de Content-Disposition para servir un adjunto. El nombre va en
 * filename* (UTF-8, RFC 5987), así acepta tildes, ñ, rayas largas, comillas,
 * etc.; filename lleva una versión solo-ASCII para navegadores viejos. Poner el
 * nombre crudo rompe la respuesta con caracteres fuera de Latin-1 (ej. "–").
 */
export function cabeceraContentDisposition(nombreArchivo: string): string {
  const ascii = nombreArchivo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]|["\\]/g, '_');
  const utf8 = encodeURIComponent(nombreArchivo).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
