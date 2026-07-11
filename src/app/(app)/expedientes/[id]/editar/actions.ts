'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { verifySession } from '@/lib/dal';
import { editarExpediente } from '@/lib/expedientes';
import { crearAdjuntoDesdeArchivo, ArchivoInvalidoError } from '@/lib/adjuntos';
import { localAUtc } from '@/lib/tz';

const EditarExpedienteSchema = z.object({
  expedienteId: z.string().min(1),
  nroMesaEntrada: z.string().trim().min(1, 'Ingresá el número de mesa de entrada.'),
  nroSimese: z.string().trim(),
  fechaIngresoAdm: z.string().min(1, 'Ingresá la fecha de ingreso al Depto. Administrativo.'),
  fechaIngresoSuoc: z.string().min(1, 'Ingresá la fecha de ingreso a la SUOC.'),
  tipoDocumentoId: z.string().min(1, 'Seleccioná el tipo de documento.'),
  servicioOrigenId: z.string().min(1, 'Seleccioná el servicio de origen.'),
  asunto: z.string().trim().min(1, 'Ingresá el asunto.'),
  montoEstimado: z.string().trim(),
});

export type ValoresEditarExpediente = {
  nroMesaEntrada: string;
  nroSimese: string;
  fechaIngresoAdm: string;
  fechaIngresoSuoc: string;
  tipoDocumentoId: string;
  servicioOrigenId: string;
  asunto: string;
  montoEstimado: string;
};

export type EditarExpedienteState =
  { intentoId: string; error: string; valores: ValoresEditarExpediente } | undefined;

export async function editarExpedienteAction(
  _prevState: EditarExpedienteState,
  formData: FormData,
): Promise<EditarExpedienteState> {
  await verifySession();

  const crudo = {
    expedienteId: String(formData.get('expedienteId') ?? ''),
    nroMesaEntrada: String(formData.get('nroMesaEntrada') ?? ''),
    nroSimese: String(formData.get('nroSimese') ?? ''),
    fechaIngresoAdm: String(formData.get('fechaIngresoAdm') ?? ''),
    fechaIngresoSuoc: String(formData.get('fechaIngresoSuoc') ?? ''),
    tipoDocumentoId: String(formData.get('tipoDocumentoId') ?? ''),
    servicioOrigenId: String(formData.get('servicioOrigenId') ?? ''),
    asunto: String(formData.get('asunto') ?? ''),
    montoEstimado: String(formData.get('montoEstimado') ?? ''),
  };

  function conError(mensaje: string): EditarExpedienteState {
    return {
      intentoId: crypto.randomUUID(),
      error: mensaje,
      valores: {
        nroMesaEntrada: crudo.nroMesaEntrada,
        nroSimese: crudo.nroSimese,
        fechaIngresoAdm: crudo.fechaIngresoAdm,
        fechaIngresoSuoc: crudo.fechaIngresoSuoc,
        tipoDocumentoId: crudo.tipoDocumentoId,
        servicioOrigenId: crudo.servicioOrigenId,
        asunto: crudo.asunto,
        montoEstimado: crudo.montoEstimado,
      },
    };
  }

  const validado = EditarExpedienteSchema.safeParse(crudo);
  if (!validado.success) {
    return conError(validado.error.issues[0]?.message ?? 'Revisá los datos del formulario.');
  }

  const datos = validado.data;
  const expedienteId = Number(datos.expedienteId);

  const tipoDocumentoId = Number(datos.tipoDocumentoId);
  const servicioOrigenId = Number(datos.servicioOrigenId);
  if (!Number.isInteger(tipoDocumentoId) || tipoDocumentoId <= 0) {
    return conError('Seleccioná el tipo de documento de la lista.');
  }
  if (!Number.isInteger(servicioOrigenId) || servicioOrigenId <= 0) {
    return conError('Seleccioná el servicio de origen de la lista.');
  }

  const fechaIngresoAdm = localAUtc(datos.fechaIngresoAdm);
  const fechaIngresoSuoc = localAUtc(datos.fechaIngresoSuoc);

  if (fechaIngresoSuoc < fechaIngresoAdm) {
    return conError(
      'La fecha de ingreso a la SUOC no puede ser anterior a la de ingreso al Depto. Administrativo.',
    );
  }

  let montoEstimado: string | null = null;
  if (datos.montoEstimado) {
    const monto = Number(datos.montoEstimado);
    if (!Number.isFinite(monto) || monto < 0) {
      return conError('El monto estimado no es válido.');
    }
    montoEstimado = monto.toFixed(2);
  }

  const archivo = formData.get('adjunto');
  let nuevoAdjuntoId: number | null;
  try {
    nuevoAdjuntoId = await crearAdjuntoDesdeArchivo(archivo instanceof File ? archivo : null);
  } catch (error) {
    if (error instanceof ArchivoInvalidoError) {
      return conError(error.message);
    }
    throw error;
  }

  await editarExpediente(expedienteId, {
    nroMesaEntrada: datos.nroMesaEntrada,
    nroSimese: datos.nroSimese || null,
    fechaIngresoAdm,
    fechaIngresoSuoc,
    tipoDocumentoId,
    servicioOrigenId,
    asunto: datos.asunto,
    montoEstimado,
    nuevoAdjuntoId,
  });

  redirect(`/expedientes/${expedienteId}`);
}
