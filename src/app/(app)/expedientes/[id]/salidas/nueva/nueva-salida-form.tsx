'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ComboboxSelect } from '@/components/combobox-select';
import { registrarSalidaAction } from './actions';

type Opcion = { id: number; nombre: string };

export function NuevaSalidaForm({
  expedienteId,
  destinos,
  estados,
  firmantesSugeridos,
  fechaHoyLocal,
  puedeCambiarEstado,
}: {
  expedienteId: number;
  destinos: Opcion[];
  estados: Opcion[];
  firmantesSugeridos: string[];
  fechaHoyLocal: string;
  puedeCambiarEstado: boolean;
}) {
  const [state, formAction, pending] = useActionState(registrarSalidaAction, undefined);
  const v = state?.valores;
  const [tipo, setTipo] = useState(v?.tipo || 'NOTA');
  const [cambiarEstado, setCambiarEstado] = useState(v?.cambiarEstado === 'on');

  return (
    <form
      key={state?.intentoId ?? 'inicial'}
      action={formAction}
      className="mx-auto max-w-2xl space-y-5 p-6"
    >
      <input type="hidden" name="expedienteId" value={expedienteId} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Registrar salida</h1>
        <Link
          href={`/expedientes/${expedienteId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Volver al expediente
        </Link>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">Tipo de salida</span>
        <div className="flex gap-4 text-sm">
          {(['NOTA', 'PORTAL', 'OTRO'] as const).map((opcion) => (
            <label key={opcion} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="tipo"
                value={opcion}
                checked={tipo === opcion}
                onChange={() => setTipo(opcion)}
              />
              {opcion === 'NOTA' ? 'Nota' : opcion === 'PORTAL' ? 'Portal' : 'Otro'}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="fecha" className="mb-1 block text-sm font-medium text-gray-700">
          Fecha
        </label>
        <input
          id="fecha"
          name="fecha"
          type="date"
          required
          defaultValue={v?.fecha || fechaHoyLocal}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {tipo === 'NOTA' && (
        <div className="space-y-4 rounded-md border border-gray-200 p-4">
          <ComboboxSelect
            name="destinoId"
            label="Destino"
            opciones={destinos}
            defaultValue={v?.destinoId ? Number(v.destinoId) : undefined}
            required
          />
          <div>
            <label htmlFor="nroNota" className="mb-1 block text-sm font-medium text-gray-700">
              N° de nota
            </label>
            <input
              id="nroNota"
              name="nroNota"
              type="text"
              defaultValue={v?.nroNota}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="firmadaPor" className="mb-1 block text-sm font-medium text-gray-700">
              Firmada por / vía
            </label>
            <input
              id="firmadaPor"
              name="firmadaPor"
              type="text"
              list="firmantes-sugeridos"
              defaultValue={v?.firmadaPor}
              placeholder="Ej: Departamento Administrativo"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <datalist id="firmantes-sugeridos">
              {firmantesSugeridos.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        </div>
      )}

      {tipo === 'PORTAL' && (
        <div className="rounded-md border border-gray-200 p-4">
          <label htmlFor="referencia" className="mb-1 block text-sm font-medium text-gray-700">
            Referencia (ID de proceso, N° de orden, etc.)
          </label>
          <input
            id="referencia"
            name="referencia"
            type="text"
            defaultValue={v?.referencia}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      <div>
        <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-gray-700">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          required
          rows={3}
          defaultValue={v?.descripcion}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {puedeCambiarEstado && (
        <div className="rounded-md border border-gray-200 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              name="cambiarEstado"
              checked={cambiarEstado}
              onChange={(e) => setCambiarEstado(e.target.checked)}
            />
            ¿También querés actualizar el estado del expediente?
          </label>

          {cambiarEstado && (
            <div className="mt-3 space-y-3">
              <div>
                <label
                  htmlFor="estadoNuevoId"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Nuevo estado
                </label>
                <select
                  id="estadoNuevoId"
                  name="estadoNuevoId"
                  defaultValue={v?.estadoNuevoId || ''}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Seleccioná un estado
                  </option>
                  {estados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="observacionesEstado"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Observaciones (opcional)
                </label>
                <textarea
                  id="observacionesEstado"
                  name="observacionesEstado"
                  rows={2}
                  defaultValue={v?.observacionesEstado}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="adjunto" className="mb-1 block text-sm font-medium text-gray-700">
          Adjunto (PDF, opcional)
        </label>
        <input
          id="adjunto"
          name="adjunto"
          type="file"
          accept="application/pdf"
          className="w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Guardando...' : 'Registrar salida'}
      </button>
    </form>
  );
}
