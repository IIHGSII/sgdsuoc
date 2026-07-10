'use client';

import { useActionState, useState } from 'react';
import { cambiarEstadoAction } from './cambiar-estado-actions';

type Opcion = { id: number; nombre: string };

export function CambiarEstadoForm({
  expedienteId,
  estados,
}: {
  expedienteId: number;
  estados: Opcion[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState(cambiarEstadoAction, undefined);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cambiar estado
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full rounded-md border border-gray-200 bg-white p-4">
      <input type="hidden" name="expedienteId" value={expedienteId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="estadoNuevoId" className="mb-1 block text-sm font-medium text-gray-700">
            Nuevo estado
          </label>
          <select
            id="estadoNuevoId"
            name="estadoNuevoId"
            defaultValue=""
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
          <label htmlFor="observaciones" className="mb-1 block text-sm font-medium text-gray-700">
            Observaciones (opcional)
          </label>
          <input
            id="observaciones"
            name="observaciones"
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {state && 'error' in state && state.error && (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      )}
      {state && 'success' in state && (
        <p className="mt-2 text-sm text-green-600">Estado actualizado correctamente.</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? 'Guardando...' : 'Confirmar cambio'}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}
