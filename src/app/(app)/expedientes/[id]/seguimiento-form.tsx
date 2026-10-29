'use client';

import { useActionState, useState } from 'react';
import { registrarNovedadAction } from './seguimiento-actions';

const CLASE_CAMPO =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

/**
 * Sin seguimiento abierto: botón "Seguir fuera de la SUOC" (la primera novedad lo abre).
 * Con seguimiento abierto: agregar novedad o cerrarlo con el resultado final.
 */
export function SeguimientoForm({
  expedienteId,
  abierto,
  dondeEstaActual,
  hoy,
}: {
  expedienteId: number;
  abierto: boolean;
  dondeEstaActual: string;
  hoy: string;
}) {
  const [visible, setVisible] = useState(false);
  const [state, formAction, pending] = useActionState(registrarNovedadAction, undefined);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {abierto ? 'Agregar novedad' : 'Seguir fuera de la SUOC'}
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full rounded-md border border-gray-200 bg-white p-4">
      <input type="hidden" name="expedienteId" value={expedienteId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="fecha" className="mb-1 block text-sm font-medium text-gray-700">
            Fecha
          </label>
          <input id="fecha" name="fecha" type="date" defaultValue={hoy} className={CLASE_CAMPO} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="dondeEsta" className="mb-1 block text-sm font-medium text-gray-700">
            Dónde está
          </label>
          <input
            id="dondeEsta"
            name="dondeEsta"
            type="text"
            defaultValue={dondeEstaActual}
            placeholder="Ej. DGGIES, DGAF, Presupuesto"
            className={CLASE_CAMPO}
          />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="detalle" className="mb-1 block text-sm font-medium text-gray-700">
            Novedad
          </label>
          <textarea id="detalle" name="detalle" rows={2} className={CLASE_CAMPO} />
        </div>
      </div>

      {state && 'error' in state && state.error && (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      )}
      {state && 'success' in state && (
        <p className="mt-2 text-sm text-green-600">Seguimiento actualizado.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          name="accion"
          value="novedad"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? 'Guardando...' : abierto ? 'Agregar novedad' : 'Empezar seguimiento'}
        </button>
        {abierto && (
          <button
            type="submit"
            name="accion"
            value="cerrar"
            disabled={pending}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cerrar seguimiento (resuelto)
          </button>
        )}
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}
