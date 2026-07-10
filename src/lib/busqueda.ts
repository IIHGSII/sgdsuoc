import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export type ResultadoBusqueda = {
  id: number;
  nroSuoc: number;
  anioSuoc: number;
  asunto: string;
  estado: string;
};

const LIMITE_DEFECTO = 10;

/** Entiende "N/AA" y "N/AAAA" (ej. "5/25" o "5/2025") como número SUOC + año. */
function parseNumeroSuoc(texto: string): { nro: number; anio: number } | null {
  const match = texto.match(/^(\d+)\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) return null;
  const nro = Number(match[1]);
  const anioTexto = match[2];
  const anio = anioTexto.length === 2 ? 2000 + Number(anioTexto) : Number(anioTexto);
  return { nro, anio };
}

/**
 * Filtro de texto libre por N° SUOC (N/AA o N/AAAA), N° de mesa de entrada,
 * SIMESE, asunto y texto de las salidas registradas. Reusado tanto por el
 * buscador instantáneo del header como por el listado con filtros.
 */
export function construirFiltroTexto(query: string): Prisma.ExpedienteWhereInput | null {
  const texto = query.trim();
  if (!texto) return null;

  const numeroSuoc = parseNumeroSuoc(texto);
  if (numeroSuoc) {
    return { nroSuoc: numeroSuoc.nro, anioSuoc: numeroSuoc.anio };
  }

  const comoNumero = Number(texto);
  const esEnteroPuro = Number.isInteger(comoNumero);

  return {
    OR: [
      { nroMesaEntrada: { contains: texto } },
      { nroSimese: { contains: texto } },
      { asunto: { contains: texto } },
      { salidas: { some: { descripcion: { contains: texto } } } },
      ...(esEnteroPuro ? [{ nroSuoc: comoNumero }] : []),
    ],
  };
}

/** Búsqueda instantánea para el buscador del header. */
export async function buscarExpedientes(
  query: string,
  limite = LIMITE_DEFECTO,
): Promise<ResultadoBusqueda[]> {
  const where = construirFiltroTexto(query);
  if (!where) return [];

  const expedientes = await prisma.expediente.findMany({
    where,
    include: { estadoActual: true },
    orderBy: { fechaIngresoSuoc: 'desc' },
    take: limite,
  });

  return expedientes.map((e) => ({
    id: e.id,
    nroSuoc: e.nroSuoc,
    anioSuoc: e.anioSuoc,
    asunto: e.asunto,
    estado: e.estadoActual.nombre,
  }));
}
