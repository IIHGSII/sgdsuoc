'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { verifySession } from '@/lib/dal';
import { crearExpediente, NumeroSuocDuplicadoError } from '@/lib/expedientes';
import { crearAdjuntoDesdeArchivo, ArchivoInvalidoError } from '@/lib/adjuntos';
import { localAUtc } from '@/lib/tz';

const CrearExpedienteSchema = z.object({
  nroMesaEntrada: z.string().trim().min(1, 'Ingresá el número de mesa de entrada.'),
  nroSuocManual: z.string().trim(),
  nroSimese: z.string().trim(),
  fechaIngresoAdm: z.string().min(1, 'Ingresá la fecha de ingreso al Depto. Administrativo.'),
  fechaIngresoSuoc: z.string().min(1, 'Ingresá la fecha de ingreso a la SUOC.'),
  tipoDocumentoId: z.string().min(1, 'Seleccioná el tipo de documento.'),
  servicioOrigenId: z.string().min(1, 'Seleccioná el servicio de origen.'),
  asunto: z.string().trim().min(1, 'Ingresá el asunto.'),
  montoEstimado: z.string().trim(),
});

export type ValoresFormulario = {
  nroMesaEntrada: string;
  nroSuocManual: string;
  nroSimese: string;
  fechaIngresoAdm: string;
  fechaIngresoSuoc: string;
  tipoDocumentoId: string;
  servicioOrigenId: string;
  asunto: string;
  montoEstimado: string;
};

export type CrearExpedienteState =
  { intentoId: string; error: string; valores: ValoresFormulario } | undefined;

export async function crearExpedienteAction(
  _prevState: CrearExpedienteState,
  formData: FormData,
): Promise<CrearExpedienteState> {
  await verifySession();

  const crudo = {
    nroMesaEntrada: String(formData.get('nroMesaEntrada') ?? ''),
    nroSuocManual: String(formData.get('nroSuocManual') ?? ''),
    nroSimese: String(formData.get('nroSimese') ?? ''),
    fechaIngresoAdm: String(formData.get('fechaIngresoAdm') ?? ''),
    fechaIngresoSuoc: String(formData.get('fechaIngresoSuoc') ?? ''),
    tipoDocumentoId: String(formData.get('tipoDocumentoId') ?? ''),
    servicioOrigenId: String(formData.get('servicioOrigenId') ?? ''),
    asunto: String(formData.get('asunto') ?? ''),
    montoEstimado: String(formData.get('montoEstimado') ?? ''),
  };

  function conError(mensaje: string): CrearExpedienteState {
    return { intentoId: crypto.randomUUID(), error: mensaje, valores: crudo };
  }

  const validado = CrearExpedienteSchema.safeParse(crudo);

  if (!validado.success) {
    return conError(validado.error.issues[0]?.message ?? 'Revisá los datos del formulario.');
  }

  const datos = validado.data;

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

  let nroSuocManual: number | undefined;
  if (datos.nroSuocManual) {
    nroSuocManual = Number(datos.nroSuocManual);
    if (!Number.isInteger(nroSuocManual) || nroSuocManual <= 0) {
      return conError('El número SUOC manual debe ser un entero positivo.');
    }
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

  let expedienteId: number;
  try {
    const adjuntoId = await crearAdjuntoDesdeArchivo(archivo instanceof File ? archivo : null);

    const expediente = await crearExpediente({
      nroMesaEntrada: datos.nroMesaEntrada,
      nroSuocManual,
      nroSimese: datos.nroSimese || null,
      fechaIngresoAdm,
      fechaIngresoSuoc,
      tipoDocumentoId,
      servicioOrigenId,
      asunto: datos.asunto,
      montoEstimado,
      adjuntoId,
    });
    expedienteId = expediente.id;
  } catch (error) {
    if (error instanceof NumeroSuocDuplicadoError || error instanceof ArchivoInvalidoError) {
      return conError(error.message);
    }
    throw error;
  }

  redirect(`/expedientes/${expedienteId}`);
}
