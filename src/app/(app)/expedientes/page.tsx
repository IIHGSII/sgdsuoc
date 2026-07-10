import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { formatearFechaHora } from '@/lib/tz';
import { construirFiltroTexto } from '@/lib/busqueda';
import type { Prisma } from '@/generated/prisma/client';

export default async function ListadoExpedientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    anio?: string;
    estado?: string;
    tipo?: string;
    servicio?: string;
    q?: string;
  }>;
}) {
  await verifySession();
  const { anio, estado, tipo, servicio, q } = await searchParams;

  const filtroTexto = q ? construirFiltroTexto(q) : null;

  const where: Prisma.ExpedienteWhereInput = {
    ...(anio ? { anioSuoc: Number(anio) } : {}),
    ...(estado ? { estadoActualId: Number(estado) } : {}),
    ...(tipo ? { tipoDocumentoId: Number(tipo) } : {}),
    ...(servicio ? { servicioOrigenId: Number(servicio) } : {}),
    ...(filtroTexto ?? {}),
  };

  const [expedientes, anios, estados, tiposDocumento, servicios] = await Promise.all([
    prisma.expediente.findMany({
      where,
      orderBy: { fechaIngresoSuoc: 'desc' },
      include: { tipoDocumento: true, servicioOrigen: true, estadoActual: true },
    }),
    prisma.expediente.findMany({
      distinct: ['anioSuoc'],
      select: { anioSuoc: true },
      orderBy: { anioSuoc: 'desc' },
    }),
    prisma.estado.findMany({ orderBy: { orden: 'asc' } }),
    prisma.tipoDocumento.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.servicio.findMany({ orderBy: { nombre: 'asc' } }),
  ]);

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

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <Campo label="Buscar">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="N° SUOC, mesa, SIMESE, asunto..."
            className="w-56 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </Campo>
        <Campo label="Año">
          <select
            name="anio"
            defaultValue={anio ?? ''}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {anios.map((a) => (
              <option key={a.anioSuoc} value={a.anioSuoc}>
                {a.anioSuoc}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Estado">
          <select
            name="estado"
            defaultValue={estado ?? ''}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {estados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Tipo de documento">
          <select
            name="tipo"
            defaultValue={tipo ?? ''}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {tiposDocumento.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Servicio">
          <select
            name="servicio"
            defaultValue={servicio ?? ''}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Filtrar
        </button>
        <Link href="/expedientes" className="text-sm text-gray-500 hover:underline">
          Limpiar
        </Link>
      </form>

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
                  Ningún expediente coincide con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}
