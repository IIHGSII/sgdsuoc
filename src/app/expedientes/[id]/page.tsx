import Link from 'next/link';
import { notFound } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { formatearFecha, formatearFechaHora } from '@/lib/tz';
import { formatearMonto } from '@/lib/format';
import { CambiarEstadoForm } from './cambiar-estado-form';

export default async function DetalleExpedientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;
  const expedienteId = Number(id);

  if (!Number.isInteger(expedienteId)) {
    notFound();
  }

  const expediente = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    include: { tipoDocumento: true, servicioOrigen: true, estadoActual: true },
  });

  if (!expediente) {
    notFound();
  }

  const [salidas, estados, trazabilidad] = await Promise.all([
    prisma.salida.findMany({
      where: { expedienteId },
      include: { destino: true },
      orderBy: { fecha: 'asc' },
    }),
    prisma.estado.findMany({ orderBy: { orden: 'asc' } }),
    prisma.trazabilidad.findMany({
      where: { expedienteId },
      include: { estadoAnterior: true, estadoNuevo: true },
      orderBy: { fechaCambio: 'asc' },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          Expediente {expediente.nroSuoc}/{expediente.anioSuoc}
        </h1>
        <Link href="/expedientes" className="text-sm text-blue-600 hover:underline">
          Volver al listado
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-gray-200 bg-white p-6 text-sm">
        <Campo etiqueta="N° de mesa de entrada" valor={expediente.nroMesaEntrada} />
        <Campo etiqueta="N° SIMESE" valor={expediente.nroSimese ?? '—'} />
        <Campo
          etiqueta="Ingreso al Depto. Administrativo"
          valor={formatearFechaHora(expediente.fechaIngresoAdm)}
        />
        <Campo
          etiqueta="Ingreso a la SUOC"
          valor={formatearFechaHora(expediente.fechaIngresoSuoc)}
        />
        <Campo etiqueta="Tipo de documento" valor={expediente.tipoDocumento.nombre} />
        <Campo etiqueta="Servicio de origen" valor={expediente.servicioOrigen.nombre} />
        <Campo etiqueta="Estado actual" valor={expediente.estadoActual.nombre} />
        <Campo
          etiqueta="Monto estimado"
          valor={formatearMonto(expediente.montoEstimado?.toString())}
        />
        <div className="col-span-2">
          <Campo etiqueta="Asunto" valor={expediente.asunto} multilinea />
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-start gap-2">
        <Link
          href={`/expedientes/${expediente.id}/editar`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Editar datos
        </Link>
        {!expediente.estadoActual.esFinal && (
          <CambiarEstadoForm expedienteId={expediente.id} estados={estados} />
        )}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Salidas</h2>
          <Link
            href={`/expedientes/${expediente.id}/salidas/nueva`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Registrar salida
          </Link>
        </div>

        {salidas.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
            Todavía no se registraron salidas para este expediente.
          </p>
        ) : (
          <ul className="space-y-3">
            {salidas.map((salida) => (
              <li
                key={salida.id}
                className="rounded-lg border border-gray-200 bg-white p-4 text-sm"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {salida.tipo === 'NOTA' ? 'Nota' : salida.tipo === 'PORTAL' ? 'Portal' : 'Otro'}
                  </span>
                  <span className="text-gray-500">{formatearFecha(salida.fecha)}</span>
                </div>
                {salida.tipo === 'NOTA' && (
                  <p className="text-gray-700">
                    N° {salida.nroNota} → {salida.destino?.nombre} (firmada por {salida.firmadaPor})
                  </p>
                )}
                {salida.tipo === 'PORTAL' && (
                  <p className="text-gray-700">Referencia: {salida.referencia}</p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-gray-700">{salida.descripcion}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Historial de trazabilidad</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Fecha
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Cambio
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Observaciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trazabilidad.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 text-gray-700">{formatearFechaHora(t.fechaCambio)}</td>
                  <td className="px-4 py-2 text-gray-700">
                    {t.estadoAnterior ? `${t.estadoAnterior.nombre} → ` : 'Ingreso: '}
                    {t.estadoNuevo.nombre}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{t.observaciones ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  multilinea,
}: {
  etiqueta: string;
  valor: string;
  multilinea?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{etiqueta}</dt>
      <dd className={`mt-1 text-gray-900 ${multilinea ? 'whitespace-pre-wrap' : ''}`}>{valor}</dd>
    </div>
  );
}
