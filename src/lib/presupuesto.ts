import 'server-only';
import { prisma } from '@/lib/prisma';

// Presupuesto aprobado del hospital, agrupado como en el clasificador:
// grupo (100) > subgrupo (110) > objeto de gasto (111).

const NOMBRES: Record<number, string> = {
  200: 'Servicios no personales',
  240: 'Gastos por servicios de aseo, mantenimiento y reparaciones',
  300: 'Bienes de consumo e insumos',
  310: 'Productos alimenticios',
  320: 'Textiles y vestuarios',
  330: 'Productos de papel, cartón e impresos',
  340: 'Bienes de consumo de oficinas e insumos',
};

export type Partida = {
  objetoGasto: number;
  fuente: number;
  descripcion: string;
  aprobado: number;
};

export type Subgrupo = { codigo: number; nombre: string; aprobado: number; partidas: Partida[] };
export type Grupo = { codigo: number; nombre: string; aprobado: number; subgrupos: Subgrupo[] };

export function agruparPartidas(partidas: Partida[]): Grupo[] {
  const grupos: Grupo[] = [];
  const ordenadas = [...partidas].sort((a, b) => a.objetoGasto - b.objetoGasto);
  for (const partida of ordenadas) {
    const codigoGrupo = Math.floor(partida.objetoGasto / 100) * 100;
    const codigoSubgrupo = Math.floor(partida.objetoGasto / 10) * 10;

    let grupo = grupos.find((g) => g.codigo === codigoGrupo);
    if (!grupo) {
      grupo = {
        codigo: codigoGrupo,
        nombre: NOMBRES[codigoGrupo] ?? `Grupo ${codigoGrupo}`,
        aprobado: 0,
        subgrupos: [],
      };
      grupos.push(grupo);
    }

    let subgrupo = grupo.subgrupos.find((s) => s.codigo === codigoSubgrupo);
    if (!subgrupo) {
      subgrupo = {
        codigo: codigoSubgrupo,
        nombre: NOMBRES[codigoSubgrupo] ?? `Subgrupo ${codigoSubgrupo}`,
        aprobado: 0,
        partidas: [],
      };
      grupo.subgrupos.push(subgrupo);
    }

    subgrupo.partidas.push(partida);
    subgrupo.aprobado += partida.aprobado;
    grupo.aprobado += partida.aprobado;
  }
  return grupos;
}

/** Presupuesto del año más reciente cargado. */
export async function obtenerPresupuesto() {
  const ultimo = await prisma.partidaPresupuesto.aggregate({ _max: { anio: true } });
  const anio = ultimo._max.anio;
  if (anio === null) return null;
  const filas = await prisma.partidaPresupuesto.findMany({ where: { anio } });
  const grupos = agruparPartidas(
    filas.map((f) => ({
      objetoGasto: f.objetoGasto,
      fuente: f.fuente,
      descripcion: f.descripcion,
      aprobado: Number(f.aprobado),
    })),
  );
  return { anio, grupos, total: grupos.reduce((suma, g) => suma + g.aprobado, 0) };
}
