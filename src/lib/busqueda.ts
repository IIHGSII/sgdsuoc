import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export type ResultadoBusqueda = {
  id: number;
  nroSuoc: number;
  anioSuoc: number;
  /** null en los expedientes cargados con fotos que todavía no se procesaron. */
  asunto: string | null;
  estado: string;
};

const LIMITE_DEFECTO = 10;

const MAX_INT_MYSQL = 2_147_483_647;

/**
 * Convierte texto (ej. un parámetro de la URL) a un entero positivo que entre
 * en una columna INT; si no lo es, devuelve undefined. Así un "?anio=abc" o un
 * número gigante se ignoran en vez de hacer fallar la consulta.
 */
export function enteroDeParametro(valor: string | undefined): number | undefined {
  if (!valor) return undefined;
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 && n <= MAX_INT_MYSQL ? n : undefined;
}

/** Entiende "N/AA" y "N/AAAA" (ej. "5/25" o "5/2025") como número SUOC + año. */
function parseNumeroSuoc(texto: string): { nro: number; anio: number } | null {
  const match = texto.match(/^(\d+)\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) return null;
  const nro = enteroDeParametro(match[1]);
  if (nro === undefined) return null;
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

  const comoNumero = enteroDeParametro(texto);

  return {
    OR: [
      { nroMesaEntrada: { contains: texto } },
      { nroSimese: { contains: texto } },
      { asunto: { contains: texto } },
      { salidas: { some: { descripcion: { contains: texto } } } },
      ...(comoNumero !== undefined ? [{ nroSuoc: comoNumero }] : []),
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
