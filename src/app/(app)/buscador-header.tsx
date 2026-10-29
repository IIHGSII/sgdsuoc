'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buscarAction } from './buscar-action';

type Resultado = Awaited<ReturnType<typeof buscarAction>>;

export function BuscadorHeader() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Resultado>([]);
  const [abierto, setAbierto] = useState(false);
  const [fallo, setFallo] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Número de la última búsqueda lanzada: si una respuesta lenta llega después
  // de otra más nueva, se descarta para no pisar los resultados actuales.
  const ultimaBusquedaRef = useRef(0);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const busqueda = ++ultimaBusquedaRef.current;
      if (!query.trim()) {
        setResultados([]);
        setFallo(false);
        return;
      }
      buscarAction(query)
        .then((r) => {
          if (busqueda !== ultimaBusquedaRef.current) return;
          setResultados(r);
          setFallo(false);
          setAbierto(true);
        })
        .catch(() => {
          if (busqueda !== ultimaBusquedaRef.current) return;
          setResultados([]);
          setFallo(true);
          setAbierto(true);
        });
    }, 250);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  return (
    <div className="relative w-full max-w-sm">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar por N° SUOC, mesa de entrada, SIMESE, asunto..."
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {abierto && query.trim() && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg">
          {fallo && (
            <li className="px-3 py-2 text-red-600">
              No se pudo buscar. Revisá la conexión y probá de nuevo.
            </li>
          )}
          {!fallo && resultados.length === 0 && (
            <li className="px-3 py-2 text-gray-500">Sin resultados.</li>
          )}
          {resultados.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onMouseDown={() => {
                  setAbierto(false);
                  setQuery('');
                  router.push(`/expedientes/${r.id}`);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-blue-50"
              >
                <span className="font-medium text-gray-900">
                  {r.nroSuoc}/{r.anioSuoc}
                </span>{' '}
                <span className="text-gray-500">— {r.estado}</span>
                <div className="truncate text-gray-600">{r.asunto ?? 'Por procesar'}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
