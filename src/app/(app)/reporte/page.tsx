import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { calcularReporteProductividad, formatearDuracion } from '@/lib/reporte';

export default async function ReportePage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  await verifySession();
  const { anio: anioTexto } = await searchParams;
  const anio = anioTexto ? Number(anioTexto) : undefined;

  const [{ filas, estados }, anios] = await Promise.all([
    calcularReporteProductividad(anio),
    prisma.expediente.findMany({
      distinct: ['anioSuoc'],
      select: { anioSuoc: true },
      orderBy: { anioSuoc: 'desc' },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Reporte de productividad</h1>
      </div>

      <form className="mb-4 flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Año
          <select
            name="anio"
            defaultValue={anioTexto ?? ''}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {anios.map((a) => (
              <option key={a.anioSuoc} value={a.anioSuoc}>
                {a.anioSuoc}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Filtrar
        </button>
        <Link href="/reporte" className="text-sm text-gray-500 hover:underline">
          Limpiar
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Expediente</Th>
              <Th>Asunto</Th>
              {estados.map((e) => (
                <Th key={e.id}>{e.nombre}</Th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((fila) => (
              <tr key={fila.expedienteId} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-2">
                  <Link
                    href={`/expedientes/${fila.expedienteId}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {fila.nroSuoc}/{fila.anioSuoc}
                  </Link>
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-gray-700">{fila.asunto}</td>
                {estados.map((e) => (
                  <td key={e.id} className="whitespace-nowrap px-4 py-2 text-gray-700">
                    {fila.tiempos.has(e.id) ? formatearDuracion(fila.tiempos.get(e.id)!) : '—'}
                  </td>
                ))}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={2 + estados.length} className="px-4 py-8 text-center text-gray-500">
                  No hay expedientes para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}
