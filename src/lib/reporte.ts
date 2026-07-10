import 'server-only';
import { prisma } from '@/lib/prisma';

export type FilaReporte = {
  expedienteId: number;
  nroSuoc: number;
  anioSuoc: number;
  asunto: string;
  /** estadoId -> milisegundos acumulados en ese estado */
  tiempos: Map<number, number>;
};

export type EstadoColumna = { id: number; nombre: string };

/**
 * Tiempo de permanencia de cada expediente en cada estado, encadenando la
 * trazabilidad desde fecha_ingreso_suoc: la duración de cada tramo es la
 * diferencia entre un cambio y el siguiente, y el estado vigente acumula
 * hasta el momento del cálculo.
 */
export async function calcularReporteProductividad(anio?: number): Promise<{
  filas: FilaReporte[];
  estados: EstadoColumna[];
}> {
  const [estados, expedientes] = await Promise.all([
    prisma.estado.findMany({ orderBy: { orden: 'asc' } }),
    prisma.expediente.findMany({
      where: anio ? { anioSuoc: anio } : {},
      include: {
        trazabilidad: {
          orderBy: { fechaCambio: 'asc' },
          select: { fechaCambio: true, estadoNuevoId: true },
        },
      },
      orderBy: { fechaIngresoSuoc: 'desc' },
    }),
  ]);

  const ahora = Date.now();

  const filas: FilaReporte[] = expedientes.map((exp) => {
    const tiempos = new Map<number, number>();
    const eventos = exp.trazabilidad;

    for (let i = 0; i < eventos.length; i++) {
      const inicio = eventos[i].fechaCambio.getTime();
      const fin = i + 1 < eventos.length ? eventos[i + 1].fechaCambio.getTime() : ahora;
      const estadoId = eventos[i].estadoNuevoId;
      const duracionMs = Math.max(0, fin - inicio);
      tiempos.set(estadoId, (tiempos.get(estadoId) ?? 0) + duracionMs);
    }

    return {
      expedienteId: exp.id,
      nroSuoc: exp.nroSuoc,
      anioSuoc: exp.anioSuoc,
      asunto: exp.asunto,
      tiempos,
    };
  });

  return { filas, estados };
}

/** Formatea una duración en milisegundos como "Xd Yh Zm". */
export function formatearDuracion(ms: number): string {
  const minutosTotales = Math.floor(ms / 60000);
  const dias = Math.floor(minutosTotales / (24 * 60));
  const horas = Math.floor((minutosTotales % (24 * 60)) / 60);
  const minutos = minutosTotales % 60;
  return `${dias}d ${horas}h ${minutos}m`;
}
