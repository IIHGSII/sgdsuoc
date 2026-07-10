import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { formatearFechaHora } from '@/lib/tz';

export default async function ListadoExpedientesPage() {
  await verifySession();

  const expedientes = await prisma.expediente.findMany({
    orderBy: { fechaIngresoSuoc: 'desc' },
    include: { tipoDocumento: true, servicioOrigen: true, estadoActual: true },
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Expedientes</h1>
        <Link
          href="/expedientes/nuevo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuevo expediente
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>N° SUOC</Th>
              <Th>Mesa de entrada</Th>
              <Th>Asunto</Th>
              <Th>Servicio</Th>
              <Th>Estado</Th>
              <Th>Ingreso SUOC</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expedientes.map((exp) => (
              <tr key={exp.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/expedientes/${exp.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {exp.nroSuoc}/{exp.anioSuoc}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{exp.nroMesaEntrada}</td>
                <td className="max-w-xs truncate px-4 py-2 text-gray-700">{exp.asunto}</td>
                <td className="px-4 py-2 text-gray-700">{exp.servicioOrigen.nombre}</td>
                <td className="px-4 py-2 text-gray-700">{exp.estadoActual.nombre}</td>
                <td className="px-4 py-2 text-gray-700">
                  {formatearFechaHora(exp.fechaIngresoSuoc)}
                </td>
              </tr>
            ))}
            {expedientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Todavía no hay expedientes cargados.
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
