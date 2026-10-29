import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export class EstadoFinalError extends Error {}

/** Cambio de estado que no corresponde: mismo estado, o expediente/estado inexistente. */
export class CambioEstadoInvalidoError extends Error {}

/**
 * RN-2: registra el cambio de estado (trazabilidad) y actualiza estadoActual
 * del expediente en la misma transacción. Recibe el cliente de transacción
 * para poder componerse con otras operaciones (ej. registrar una salida y
 * cambiar el estado en un solo paso, RN-3).
 */
export async function cambiarEstado(
  tx: Prisma.TransactionClient,
  expedienteId: number,
  estadoNuevoId: number,
  observaciones?: string | null,
) {
  const expediente = await tx.expediente.findUnique({
    where: { id: expedienteId },
    include: { estadoActual: true },
  });

  if (!expediente) {
    throw new CambioEstadoInvalidoError('El expediente no existe.');
  }

  if (expediente.estadoActual.esFinal) {
    throw new EstadoFinalError('El expediente está en un estado final y no admite más cambios.');
  }

  if (estadoNuevoId === expediente.estadoActualId) {
    throw new CambioEstadoInvalidoError('El expediente ya está en ese estado.');
  }

  const estadoNuevo = await tx.estado.findUnique({ where: { id: estadoNuevoId } });
  if (!estadoNuevo) {
    throw new CambioEstadoInvalidoError(
      'El estado elegido ya no existe (puede haber sido eliminado). Recargá la página.',
    );
  }

  await tx.trazabilidad.create({
    data: {
      expedienteId,
      estadoAnteriorId: expediente.estadoActualId,
      estadoNuevoId,
      observaciones: observaciones || null,
    },
  });

  await tx.expediente.update({
    where: { id: expedienteId },
    data: { estadoActualId: estadoNuevoId },
  });
}

/** Variante standalone (abre su propia transacción) para usar fuera de otro flujo compuesto. */
export async function cambiarEstadoExpediente(
  expedienteId: number,
  estadoNuevoId: number,
  observaciones?: string | null,
) {
  return prisma.$transaction((tx) => cambiarEstado(tx, expedienteId, estadoNuevoId, observaciones));
}
