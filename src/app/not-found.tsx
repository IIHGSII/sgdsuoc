import Link from 'next/link';

// Se muestra para direcciones inexistentes y cuando una página llama a
// notFound() (ej. un expediente o adjunto que no existe).
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm">
        <h1 className="mb-2 text-lg font-semibold text-gray-900">No se encontró la página</h1>
        <p className="mb-4 text-gray-700">
          Lo que buscás no existe o fue eliminado. Revisá la dirección o buscalo desde el listado.
        </p>
        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Ir al inicio
          </Link>
          <Link
            href="/expedientes"
            className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Ver expedientes
          </Link>
        </div>
      </div>
    </div>
  );
}
