import 'server-only';
import { prisma } from '@/lib/prisma';
import { diasDesdeIngreso } from '@/lib/tz';

// Seguimiento "fuera de la SUOC": cuando la SUOC ya hizo su parte (nota,
// derivación) pero la necesidad del hospital sigue abierta en otra dependencia,
// se marca el expediente para seguirlo y se anotan las novedades hasta cerrarlo.
// Es independiente del estado del expediente: puede estar Archivado y seguirse.

export class SeguimientoInvalidoError extends Error {}

export type DatosNovedad = {
  fecha: Date;
  /** Dependencia donde está el trámite (ej. "DGGIES"). */
  dondeEsta: string;
  detalle: string;
};

/**
 * Agrega una novedad. Si el expediente no se seguía (o se había cerrado),
 * abre el seguimiento con esta novedad; con `cerrar`, la novedad es el
 * resultado final y el seguimiento queda cerrado.
 */
export async function registrarNovedad(
  expedienteId: number,
  datos: DatosNovedad,
  opciones: { cerrar?: boolean } = {},
) {
  const dondeEsta = datos.dondeEsta.trim();
  const detalle = datos.detalle.trim();
  if (!dondeEsta) throw new SeguimientoInvalidoError('Indicá dónde está el trámite.');
  if (!detalle) throw new SeguimientoInvalidoError('Escribí la novedad.');

  return prisma.$transaction(async (tx) => {
    const expediente = await tx.expediente.findUnique({
      where: { id: expedienteId },
      select: { seguimiento: true },
    });
    if (!expediente) throw new SeguimientoInvalidoError('El expediente no existe.');
    if (opciones.cerrar && expediente.seguimiento !== 'ABIERTO') {
      throw new SeguimientoInvalidoError('El expediente no tiene un seguimiento abierto.');
    }

    const novedad = await tx.novedadSeguimiento.create({
      data: { expedienteId, fecha: datos.fecha, dondeEsta, detalle, cierre: !!opciones.cerrar },
    });
    await tx.expediente.update({
      where: { id: expedienteId },
      data: { seguimiento: opciones.cerrar ? 'CERRADO' : 'ABIERTO' },
    });
    return novedad;
  });
}

export type FilaSeguimiento = {
  expedienteId: number;
  nroSuoc: number;
  anioSuoc: number;
  asunto: string | null;
  dondeEsta: string;
  ultimaNovedad: string;
  fechaUltimaNovedad: Date;
  /** Días desde la última novedad: cuánto hace que no se sabe nada. */
  diasSinNovedad: number;
  /** Desde cuándo se sigue (primera novedad). */
  desde: Date;
};

/** Expedientes con seguimiento abierto, los que llevan más tiempo sin novedades primero. */
export async function listarSeguimientosAbiertos(): Promise<FilaSeguimiento[]> {
  const expedientes = await prisma.expediente.findMany({
    where: { seguimiento: 'ABIERTO' },
    select: {
      id: true,
      nroSuoc: true,
      anioSuoc: true,
      asunto: true,
      novedades: { orderBy: [{ fecha: 'asc' }, { id: 'asc' }] },
    },
  });

  return expedientes
    .filter((e) => e.novedades.length > 0)
    .map((e) => {
      const ultima = e.novedades[e.novedades.length - 1];
      return {
        expedienteId: e.id,
        nroSuoc: e.nroSuoc,
        anioSuoc: e.anioSuoc,
        asunto: e.asunto,
        dondeEsta: ultima.dondeEsta,
        ultimaNovedad: ultima.detalle,
        fechaUltimaNovedad: ultima.fecha,
        diasSinNovedad: diasDesdeIngreso(ultima.fecha),
        desde: e.novedades[0].fecha,
      };
    })
    .sort((a, b) => a.fechaUltimaNovedad.getTime() - b.fechaUltimaNovedad.getTime());
}
