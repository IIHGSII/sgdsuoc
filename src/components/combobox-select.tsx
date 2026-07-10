'use client';

import { useId, useMemo, useState } from 'react';

type Opcion = { id: number; nombre: string };

export function ComboboxSelect({
  name,
  label,
  opciones,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  opciones: Opcion[];
  required?: boolean;
  defaultValue?: number;
}) {
  const id = useId();
  const seleccionInicial = opciones.find((o) => o.id === defaultValue);
  const [texto, setTexto] = useState(seleccionInicial?.nombre ?? '');
  const [seleccionId, setSeleccionId] = useState<number | undefined>(defaultValue);
  const [abierto, setAbierto] = useState(false);

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return opciones;
    return opciones.filter((o) => o.nombre.toLowerCase().includes(q));
  }, [texto, opciones]);

  return (
    <div className="relative" data-field={name}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={texto}
        required={required}
        placeholder="Escribí para buscar..."
        onChange={(e) => {
          setTexto(e.target.value);
          setSeleccionId(undefined);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <input type="hidden" name={name} value={seleccionId ?? ''} />
      {abierto && filtradas.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg">
          {filtradas.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-blue-50"
                onMouseDown={() => {
                  setTexto(o.nombre);
                  setSeleccionId(o.id);
                  setAbierto(false);
                }}
              >
                {o.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
