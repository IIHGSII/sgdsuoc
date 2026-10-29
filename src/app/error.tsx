'use client'; // Los error boundaries tienen que ser Client Components.

import Link from 'next/link';

// Pantalla para errores inesperados en cualquier página (incluida la
// verificación de sesión del layout de la app, ej. si la base no responde).
// En producción Next no expone el mensaje original: se muestra el código
// (digest) para poder buscarlo en los logs del servidor.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="rounded-lg border border-red-200 bg-white p-6 text-sm">
        <h1 className="mb-2 text-lg font-semibold text-gray-900">Ocurrió un error inesperado</h1>
        <p className="mb-4 text-gray-700">
          No se pudo completar la operación. Puede ser un problema momentáneo de conexión con la
          base de datos: probá de nuevo en unos segundos.
        </p>
        {error.digest && <p className="mb-4 text-xs text-gray-500">Código: {error.digest}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
