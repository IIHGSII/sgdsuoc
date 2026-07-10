import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { CatalogoTabla } from './catalogo-tabla';
import { EstadoTabla } from './estado-tabla';
import { cambiarPasswordAction } from './password-actions';

export default async function AdministracionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await verifySession();
  const { error, ok } = await searchParams;

  const [estados, tiposDocumento, servicios, destinos] = await Promise.all([
    prisma.estado.findMany({ orderBy: { orden: 'asc' } }),
    prisma.tipoDocumento.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.servicio.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.destino.findMany({ orderBy: { nombre: 'asc' } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-lg font-semibold text-gray-900">Administración</h1>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {ok}
        </p>
      )}

      <EstadoTabla items={estados} />
      <CatalogoTabla catalogo="tipoDocumento" titulo="Tipos de documento" items={tiposDocumento} />
      <CatalogoTabla catalogo="servicio" titulo="Servicios" items={servicios} />
      <CatalogoTabla catalogo="destino" titulo="Destinos" items={destinos} />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Cambiar contraseña</h2>
        <form
          action={cambiarPasswordAction}
          className="max-w-sm space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Contraseña actual
            </label>
            <input
              type="password"
              name="actual"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nueva contraseña</label>
            <input
              type="password"
              name="nueva"
              required
              minLength={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              name="confirmar"
              required
              minLength={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Cambiar contraseña
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Respaldo</h2>
        <p className="mb-2 text-sm text-gray-500">
          Descarga toda la base (catálogos, expedientes, salidas y trazabilidad) en un archivo JSON.
        </p>
        <Link
          href="/administracion/respaldo"
          className="inline-block rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Descargar respaldo JSON
        </Link>
      </section>
    </div>
  );
}
