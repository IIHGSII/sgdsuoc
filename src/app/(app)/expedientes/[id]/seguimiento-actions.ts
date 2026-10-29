'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifySession } from '@/lib/dal';
import { registrarNovedad, SeguimientoInvalidoError } from '@/lib/seguimiento';
import { localAUtc } from '@/lib/tz';

const NovedadSchema = z.object({
  expedienteId: z.coerce.number().int().positive('El expediente no existe.'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indicá la fecha.'),
  dondeEsta: z.string(),
  detalle: z.string(),
  accion: z.enum(['novedad', 'cerrar']),
});

export type NovedadState = { error?: string } | { success: true } | undefined;

export async function registrarNovedadAction(
  _prevState: NovedadState,
  formData: FormData,
): Promise<NovedadState> {
  await verifySession();

  const validado = NovedadSchema.safeParse({
    expedienteId: formData.get('expedienteId'),
    fecha: formData.get('fecha'),
    dondeEsta: formData.get('dondeEsta') ?? '',
    detalle: formData.get('detalle') ?? '',
    accion: formData.get('accion'),
  });
  if (!validado.success) {
    return { error: validado.error.issues[0]?.message ?? 'Revisá los datos.' };
  }

  const { expedienteId, fecha, dondeEsta, detalle, accion } = validado.data;
  try {
    // Mediodía en Paraguay: la novedad se registra por día, sin hora.
    await registrarNovedad(
      expedienteId,
      { fecha: localAUtc(`${fecha}T12:00`), dondeEsta, detalle },
      { cerrar: accion === 'cerrar' },
    );
  } catch (error) {
    if (error instanceof SeguimientoInvalidoError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/expedientes/${expedienteId}`);
  revalidatePath('/seguimiento');
  return { success: true };
}
