'use client';

import { useState } from 'react';

/** RN-4: si las dos fechas de ingreso difieren más que esto, se avisa (sin bloquear). */
const DIAS_AVISO_DIFERENCIA = 30;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const claseInput =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

/**
 * Los dos campos de fecha de ingreso (Depto. Administrativo y SUOC), con aviso
 * en vivo si la de la SUOC es anterior (el servidor lo rechaza igual) o si
 * difieren mucho, por si se tipeó mal un año o un mes.
 */
export function FechasIngreso({
  defaultAdm,
  defaultSuoc,
}: {
  defaultAdm: string;
  defaultSuoc: string;
}) {
  const [adm, setAdm] = useState(defaultAdm);
  const [suoc, setSuoc] = useState(defaultSuoc);

  // Valores de <input type="datetime-local">: se comparan como hora local del
  // navegador, alcanza para medir la diferencia en días.
  const diferenciaMs = Date.parse(suoc) - Date.parse(adm);
  const dias = Math.round(Math.abs(diferenciaMs) / MS_POR_DIA);

  let aviso: string | null = null;
  if (Number.isFinite(diferenciaMs)) {
    if (diferenciaMs < 0) {
      aviso = 'La fecha de ingreso a la SUOC es anterior a la de ingreso al Depto. Administrativo.';
    } else if (dias > DIAS_AVISO_DIFERENCIA) {
      aviso = `Las fechas de ingreso difieren en ${dias} días. Revisá que sean correctas.`;
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fechaIngresoAdm" className="mb-1 block text-sm font-medium text-gray-700">
            Fecha de ingreso al Depto. Administrativo
          </label>
          <input
            id="fechaIngresoAdm"
            name="fechaIngresoAdm"
            type="datetime-local"
            required
            defaultValue={defaultAdm}
            onChange={(e) => setAdm(e.target.value)}
            className={claseInput}
          />
        </div>
        <div>
          <label
            htmlFor="fechaIngresoSuoc"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Fecha de ingreso a la SUOC
          </label>
          <input
            id="fechaIngresoSuoc"
            name="fechaIngresoSuoc"
            type="datetime-local"
            required
            defaultValue={defaultSuoc}
            onChange={(e) => setSuoc(e.target.value)}
            className={claseInput}
          />
        </div>
      </div>
      {aviso && (
        <p className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          {aviso}
        </p>
      )}
    </div>
  );
}
