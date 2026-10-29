'use client'; // Los error boundaries tienen que ser Client Components.

import './globals.css';

// Último recurso: reemplaza al layout raíz cuando el error ocurre en él, por
// eso define su propio <html> y <body>. El resto de los errores los atrapa
// app/error.tsx, que conserva el layout.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50">
        <title>Error - SGD SUOC</title>
        <div className="mx-auto max-w-lg p-6">
          <div className="rounded-lg border border-red-200 bg-white p-6 text-sm">
            <h1 className="mb-2 text-lg font-semibold text-gray-900">
              Ocurrió un error inesperado
            </h1>
            <p className="mb-4 text-gray-700">
              El sistema no pudo cargarse. Probá de nuevo en unos segundos.
            </p>
            {error.digest && <p className="mb-4 text-xs text-gray-500">Código: {error.digest}</p>}
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
