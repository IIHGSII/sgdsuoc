'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { verifySession } from '@/lib/dal';
import { crearSalida } from '@/lib/salidas';
import { crearAdjuntoDesdeArchivo, ArchivoInvalidoError } from '@/lib/adjuntos';
import { localAUtc } from '@/lib/tz';

const RegistrarSalidaSchema = z.object({
  expedienteId: z.string().min(1),
  tipo: z.enum(['NOTA', 'PORTAL', 'OTRO']),
  fecha: z.string().min(1, 'Ingresá la fecha de la salida.'),
  destinoId: z.string().trim(),
  nroNota: z.string().trim(),
  firmadaPor: z.string().trim(),
  referencia: z.string().trim(),
  descripcion: z.string().trim().min(1, 'Ingresá una descripción.'),
  cambiarEstado: z.string().trim(),
  estadoNuevoId: z.string().trim(),
  observacionesEstado: z.string().trim(),
});

export type ValoresSalida = {
  tipo: string;
  fecha: string;
  destinoId: string;
  nroNota: string;
  firmadaPor: string;
  referencia: string;
  descripcion: string;
  cambiarEstado: string;
  estadoNuevoId: string;
  observacionesEstado: string;
};

export type RegistrarSalidaState =
  { intentoId: string; error: string; valores: ValoresSalida } | undefined;

export async function registrarSalidaAction(
  _prevState: RegistrarSalidaState,
  formData: FormData,
): Promise<RegistrarSalidaState> {
  await verifySession();

  const crudo = {
    expedienteId: String(formData.get('expedienteId') ?? ''),
    tipo: String(formData.get('tipo') ?? ''),
    fecha: String(formData.get('fecha') ?? ''),
    destinoId: String(formData.get('destinoId') ?? ''),
    nroNota: String(formData.get('nroNota') ?? ''),
    firmadaPor: String(formData.get('firmadaPor') ?? ''),
    referencia: String(formData.get('referencia') ?? ''),
    descripcion: String(formData.get('descripcion') ?? ''),
    cambiarEstado: String(formData.get('cambiarEstado') ?? ''),
    estadoNuevoId: String(formData.get('estadoNuevoId') ?? ''),
    observacionesEstado: String(formData.get('observacionesEstado') ?? ''),
  };

  function conError(mensaje: string): RegistrarSalidaState {
    return {
      intentoId: crypto.randomUUID(),
      error: mensaje,
      valores: {
        tipo: crudo.tipo,
        fecha: crudo.fecha,
        destinoId: crudo.destinoId,
        nroNota: crudo.nroNota,
        firmadaPor: crudo.firmadaPor,
        referencia: crudo.referencia,
        descripcion: crudo.descripcion,
        cambiarEstado: crudo.cambiarEstado,
        estadoNuevoId: crudo.estadoNuevoId,
        observacionesEstado: crudo.observacionesEstado,
      },
    };
  }

  const validado = RegistrarSalidaSchema.safeParse(crudo);
  if (!validado.success) {
    return conError(validado.error.issues[0]?.message ?? 'Revisá los datos del formulario.');
  }

  const datos = validado.data;
  const expedienteId = Number(datos.expedienteId);

  let destinoId: number | null = null;
  if (datos.tipo === 'NOTA') {
    destinoId = Number(datos.destinoId);
    if (!Number.isInteger(destinoId) || destinoId <= 0) {
      return conError('Seleccioná el destino de la nota.');
    }
    if (!datos.nroNota) {
      return conError('Ingresá el número de nota.');
    }
    if (!datos.firmadaPor) {
      return conError('Ingresá quién firmó / por qué vía salió la nota.');
    }
  }

  if (datos.tipo === 'PORTAL' && !datos.referencia) {
    return conError('Ingresá la referencia de la gestión en el portal.');
  }

  let estadoNuevoId: number | undefined;
  if (datos.cambiarEstado === 'on') {
    estadoNuevoId = Number(datos.estadoNuevoId);
    if (!Number.isInteger(estadoNuevoId) || estadoNuevoId <= 0) {
      return conError('Seleccioná el nuevo estado del expediente.');
    }
  }

  const archivo = formData.get('adjunto');

  try {
    const adjuntoId = await crearAdjuntoDesdeArchivo(archivo instanceof File ? archivo : null);

    await crearSalida({
      expedienteId,
      tipo: datos.tipo,
      fecha: localAUtc(`${datos.fecha}T00:00`),
      destinoId,
      nroNota: datos.tipo === 'NOTA' ? datos.nroNota : null,
      firmadaPor: datos.tipo === 'NOTA' ? datos.firmadaPor : null,
      referencia: datos.tipo === 'PORTAL' ? datos.referencia : null,
      descripcion: datos.descripcion,
      adjuntoId,
      cambiarEstado: estadoNuevoId
        ? { estadoNuevoId, observaciones: datos.observacionesEstado || null }
        : null,
    });
  } catch (error) {
    if (error instanceof ArchivoInvalidoError) {
      return conError(error.message);
    }
    return conError(
      'No se pudo registrar la salida. El expediente puede estar en un estado final o los datos no son válidos.',
    );
  }

  redirect(`/expedientes/${expedienteId}`);
}
