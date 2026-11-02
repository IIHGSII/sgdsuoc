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

export type Debito = {
  cdp: number;
  codigoContratacion: string | null;
  concepto: string;
  tipo: string;
  prevision: number;
  compromiso: number;
};

/** Lo que informa Sistework sobre un rubro, a la fecha del informe. */
export type Ejecucion = {
  fechaInforme: Date;
  planFinanciero: number;
  prevision: number;
  compromiso: number;
  saldoPlan: number;
  diferenciaConAprobado: number;
  debitos: Debito[];
};

export type Partida = {
  objetoGasto: number;
  fuente: number;
  descripcion: string;
  aprobado: number;
  ejecucion?: Ejecucion;
};

export function calcularEjecucion(
  aprobado: number,
  planFinanciero: number,
  fechaInforme: Date,
  debitos: Debito[],
): Ejecucion {
  const prevision = debitos.reduce((suma, d) => suma + d.prevision, 0);
  const compromiso = debitos.reduce((suma, d) => suma + d.compromiso, 0);
  return {
    fechaInforme,
    planFinanciero,
    prevision,
    compromiso,
    saldoPlan: planFinanciero - prevision,
    diferenciaConAprobado: planFinanciero - aprobado,
    debitos,
  };
}

export type Subgrupo = { codigo: number; nombre: string; aprobado: number; partidas: Partida[] };
export type Grupo = { codigo: number; nombre: string; aprobado: number; subgrupos: Subgrupo[] };

export function agruparPartidas(partidas: Partida[]): Grupo[] {
  const grupos: Grupo[] = [];
  const ordenadas = [...partidas].sort(
    (a, b) => a.objetoGasto - b.objetoGasto || a.fuente - b.fuente,
  );
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
  const filas = await prisma.partidaPresupuesto.findMany({
    where: { anio },
    include: { debitos: { orderBy: { id: 'asc' } } },
  });
  const grupos = agruparPartidas(
    filas.map((f) => ({
      objetoGasto: f.objetoGasto,
      fuente: f.fuente,
      descripcion: f.descripcion,
      aprobado: Number(f.aprobado),
      ejecucion:
        f.planFinanciero !== null && f.fechaInforme !== null
          ? calcularEjecucion(
              Number(f.aprobado),
              Number(f.planFinanciero),
              f.fechaInforme,
              f.debitos.map((d) => ({
                cdp: d.cdp,
                codigoContratacion: d.codigoContratacion,
                concepto: d.concepto,
                tipo: d.tipo,
                prevision: Number(d.prevision),
                compromiso: Number(d.compromiso),
              })),
            )
          : undefined,
    })),
  );
  const reprogramaciones = await prisma.reprogramacionPresupuesto.findMany({
    where: { anio },
    orderBy: { id: 'asc' },
  });
  return {
    anio,
    grupos,
    total: grupos.reduce((suma, g) => suma + g.aprobado, 0),
    reprogramaciones: reprogramaciones.map((r) => ({
      id: r.id,
      fuente: r.fuente,
      objetoOrigen: r.objetoOrigen,
      objetoDestino: r.objetoDestino,
      monto: Number(r.monto),
    })),
  };
}
