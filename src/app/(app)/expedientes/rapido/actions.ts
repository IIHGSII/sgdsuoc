'use server';

import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { crearExpedienteConFotos } from '@/lib/expedientes';
import { FotoInvalidaError, leerFotosJpeg } from '@/lib/fotos';

export type CargarFotosState = { error: string } | undefined;

export async function cargarFotosAction(
  _prevState: CargarFotosState,
  formData: FormData,
): Promise<CargarFotosState> {
  await verifySession();

  const archivos = formData
    .getAll('fotos')
    .filter((f): f is File => f instanceof File && f.size > 0);

  let expedienteId: number;
  try {
    const fotos = await leerFotosJpeg(archivos);
    const expediente = await crearExpedienteConFotos(fotos);
    expedienteId = expediente.id;
  } catch (error) {
    if (error instanceof FotoInvalidaError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/expedientes/${expedienteId}?nuevo=1`);
}
