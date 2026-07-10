'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ComboboxSelect } from '@/components/combobox-select';
import { crearExpedienteAction } from './actions';

type Opcion = { id: number; nombre: string };

export function NuevoExpedienteForm({
  tiposDocumento,
  servicios,
  fechaHoraActual,
}: {
  tiposDocumento: Opcion[];
  servicios: Opcion[];
  fechaHoraActual: string;
}) {
  const [state, formAction, pending] = useActionState(crearExpedienteAction, undefined);
  const v = state?.valores;

  return (
    // key fuerza un remonte del formulario en cada reintento fallido: así los
    // defaultValue se vuelven a aplicar con lo último tipeado (React 19 limpia
    // los campos no controlados del <form> después de correr la Server Action).
    <form
      key={state?.intentoId ?? 'inicial'}
      action={formAction}
      className="mx-auto max-w-2xl space-y-5 p-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Nuevo expediente</h1>
        <Link href="/expedientes" className="text-sm text-blue-600 hover:underline">
          Volver al listado
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Campo
          label="N° de mesa de entrada"
          name="nroMesaEntrada"
          defaultValue={v?.nroMesaEntrada}
          required
        />
        <Campo
          label="N° SUOC (vacío = autogenerar)"
          name="nroSuocManual"
          type="number"
          placeholder="Automático"
          defaultValue={v?.nroSuocManual}
        />
      </div>

      <Campo label="N° SIMESE (opcional)" name="nroSimese" defaultValue={v?.nroSimese} />

      <div className="grid grid-cols-2 gap-4">
        <Campo
          label="Fecha de ingreso al Depto. Administrativo"
          name="fechaIngresoAdm"
          type="datetime-local"
          defaultValue={v?.fechaIngresoAdm ?? fechaHoraActual}
          required
        />
        <Campo
          label="Fecha de ingreso a la SUOC"
          name="fechaIngresoSuoc"
          type="datetime-local"
          defaultValue={v?.fechaIngresoSuoc ?? fechaHoraActual}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ComboboxSelect
          name="tipoDocumentoId"
          label="Tipo de documento"
          opciones={tiposDocumento}
          defaultValue={v?.tipoDocumentoId ? Number(v.tipoDocumentoId) : undefined}
          required
        />
        <ComboboxSelect
          name="servicioOrigenId"
          label="Servicio de origen"
          opciones={servicios}
          defaultValue={v?.servicioOrigenId ? Number(v.servicioOrigenId) : undefined}
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
          defaultValue={v?.asunto}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <Campo
        label="Monto estimado (Gs., opcional)"
        name="montoEstimado"
        type="number"
        step="0.01"
        defaultValue={v?.montoEstimado}
      />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Guardando...' : 'Crear expediente'}
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
  placeholder,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        step={step}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
