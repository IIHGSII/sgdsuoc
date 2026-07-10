'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ComboboxSelect } from '@/components/combobox-select';
import { editarExpedienteAction } from './actions';

type Opcion = { id: number; nombre: string };

export function EditarExpedienteForm({
  expedienteId,
  tiposDocumento,
  servicios,
  valoresIniciales,
}: {
  expedienteId: number;
  tiposDocumento: Opcion[];
  servicios: Opcion[];
  valoresIniciales: {
    nroMesaEntrada: string;
    nroSimese: string;
    fechaIngresoAdm: string;
    fechaIngresoSuoc: string;
    tipoDocumentoId: number;
    servicioOrigenId: number;
    asunto: string;
    montoEstimado: string;
  };
}) {
  const [state, formAction, pending] = useActionState(editarExpedienteAction, undefined);
  const v = state?.valores;

  return (
    <form
      key={state?.intentoId ?? 'inicial'}
      action={formAction}
      className="mx-auto max-w-2xl space-y-5 p-6"
    >
      <input type="hidden" name="expedienteId" value={expedienteId} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Editar expediente</h1>
        <Link
          href={`/expedientes/${expedienteId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Volver al expediente
        </Link>
      </div>

      <Campo
        label="N° de mesa de entrada"
        name="nroMesaEntrada"
        defaultValue={v?.nroMesaEntrada ?? valoresIniciales.nroMesaEntrada}
        required
      />

      <Campo
        label="N° SIMESE (opcional)"
        name="nroSimese"
        defaultValue={v?.nroSimese ?? valoresIniciales.nroSimese}
      />

      <div className="grid grid-cols-2 gap-4">
        <Campo
          label="Fecha de ingreso al Depto. Administrativo"
          name="fechaIngresoAdm"
          type="datetime-local"
          defaultValue={v?.fechaIngresoAdm ?? valoresIniciales.fechaIngresoAdm}
          required
        />
        <Campo
          label="Fecha de ingreso a la SUOC"
          name="fechaIngresoSuoc"
          type="datetime-local"
          defaultValue={v?.fechaIngresoSuoc ?? valoresIniciales.fechaIngresoSuoc}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ComboboxSelect
          name="tipoDocumentoId"
          label="Tipo de documento"
          opciones={tiposDocumento}
          defaultValue={
            v?.tipoDocumentoId ? Number(v.tipoDocumentoId) : valoresIniciales.tipoDocumentoId
          }
          required
        />
        <ComboboxSelect
          name="servicioOrigenId"
          label="Servicio de origen"
          opciones={servicios}
          defaultValue={
            v?.servicioOrigenId ? Number(v.servicioOrigenId) : valoresIniciales.servicioOrigenId
          }
          required
        />
      </div>

      <div>
        <label htmlFor="asunto" className="mb-1 block text-sm font-medium text-gray-700">
          Asunto
        </label>
        <textarea
          id="asunto"
          name="asunto"
          required
          rows={3}
          defaultValue={v?.asunto ?? valoresIniciales.asunto}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <Campo
        label="Monto estimado (Gs., opcional)"
        name="montoEstimado"
        type="number"
        step="0.01"
        defaultValue={v?.montoEstimado ?? valoresIniciales.montoEstimado}
      />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  );
}

function Campo({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
