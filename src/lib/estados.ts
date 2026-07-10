import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export class EstadoFinalError extends Error {}

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
  const expediente = await tx.expediente.findUniqueOrThrow({
    where: { id: expedienteId },
    include: { estadoActual: true },
  });

  if (expediente.estadoActual.esFinal) {
    throw new EstadoFinalError('El expediente está en un estado final y no admite más cambios.');
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
