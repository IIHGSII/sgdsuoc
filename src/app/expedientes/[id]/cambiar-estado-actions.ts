'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifySession } from '@/lib/dal';
import { cambiarEstadoExpediente, EstadoFinalError } from '@/lib/estados';

const CambiarEstadoSchema = z.object({
  expedienteId: z.string().min(1),
  estadoNuevoId: z.string().min(1, 'Seleccioná el nuevo estado.'),
  observaciones: z.string().trim(),
});

export type CambiarEstadoState = { error?: string } | { success: true } | undefined;

export async function cambiarEstadoAction(
  _prevState: CambiarEstadoState,
  formData: FormData,
): Promise<CambiarEstadoState> {
  await verifySession();

  const validado = CambiarEstadoSchema.safeParse({
    expedienteId: formData.get('expedienteId'),
    estadoNuevoId: formData.get('estadoNuevoId'),
    observaciones: formData.get('observaciones'),
  });

  if (!validado.success) {
    return { error: validado.error.issues[0]?.message ?? 'Revisá los datos.' };
  }

  const expedienteId = Number(validado.data.expedienteId);
  const estadoNuevoId = Number(validado.data.estadoNuevoId);

  if (!Number.isInteger(estadoNuevoId) || estadoNuevoId <= 0) {
    return { error: 'Seleccioná el nuevo estado.' };
  }

  try {
    await cambiarEstadoExpediente(expedienteId, estadoNuevoId, validado.data.observaciones || null);
  } catch (error) {
    if (error instanceof EstadoFinalError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/expedientes/${expedienteId}`);
  return { success: true };
}
