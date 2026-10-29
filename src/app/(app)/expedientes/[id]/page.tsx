import Link from 'next/link';
import { notFound } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { formatearFecha, formatearFechaHora, hoyParaInputDate } from '@/lib/tz';
import { formatearMonto } from '@/lib/format';
import { CambiarEstadoForm } from './cambiar-estado-form';
import { CopiarResumenBoton } from './copiar-resumen-boton';
import { SeguimientoForm } from './seguimiento-form';

export default async function DetalleExpedientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  await verifySession();
  const { id } = await params;
  // ?nuevo=1: recién cargado con fotos, se muestra el número grande para anotarlo en el papel.
  const { nuevo } = await searchParams;
  const expedienteId = Number(id);

  if (!Number.isInteger(expedienteId)) {
    notFound();
  }

  const expediente = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    include: {
      tipoDocumento: true,
      servicioOrigen: true,
      estadoActual: true,
      adjunto: true,
      viaResolucion: true,
      fotos: { orderBy: { orden: 'asc' }, select: { adjuntoId: true } },
    },
  });

  if (!expediente) {
    notFound();
  }

  const [salidas, estados, trazabilidad, novedades] = await Promise.all([
    prisma.salida.findMany({
      where: { expedienteId },
      include: { destino: true, adjunto: true },
      orderBy: { fecha: 'asc' },
    }),
    prisma.estado.findMany({ orderBy: { orden: 'asc' } }),
    prisma.trazabilidad.findMany({
      where: { expedienteId },
      include: { estadoAnterior: true, estadoNuevo: true },
      orderBy: { fechaCambio: 'asc' },
    }),
    prisma.novedadSeguimiento.findMany({
      where: { expedienteId },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
    }),
  ]);
  const seguimientoAbierto = expediente.seguimiento === 'ABIERTO';

  const lineasSalidas = salidas.map((s) => {
    const detalle =
      s.tipo === 'NOTA'
        ? `N° ${s.nroNota ?? '—'} → ${s.destino?.nombre ?? '—'} (firmada por ${s.firmadaPor ?? '—'})`
        : s.tipo === 'PORTAL'
          ? `Referencia: ${s.referencia ?? '—'}`
          : s.descripcion;
    return `- [${formatearFecha(s.fecha)}] ${s.tipo}: ${detalle}`;
  });

  const lineasTrazabilidad = trazabilidad.map((t) => {
    const cambio = t.estadoAnterior
      ? `${t.estadoAnterior.nombre} → ${t.estadoNuevo.nombre}`
      : `Ingreso: ${t.estadoNuevo.nombre}`;
    return `- [${formatearFechaHora(t.fechaCambio)}] ${cambio}${t.observaciones ? ` (${t.observaciones})` : ''}`;
  });

  const resumenTexto = [
    `Expediente SUOC ${expediente.nroSuoc}/${expediente.anioSuoc}`,
    `N° de mesa de entrada: ${expediente.nroMesaEntrada ?? '—'}`,
    `N° SIMESE: ${expediente.nroSimese ?? '—'}`,
    `Ingreso al Depto. Administrativo: ${expediente.fechaIngresoAdm ? formatearFechaHora(expediente.fechaIngresoAdm) : '—'}`,
    `Ingreso a la SUOC: ${formatearFechaHora(expediente.fechaIngresoSuoc)}`,
    `Tipo de documento: ${expediente.tipoDocumento?.nombre ?? '—'}`,
    `Servicio de origen: ${expediente.servicioOrigen?.nombre ?? '—'}`,
    `Asunto: ${expediente.asunto ?? '(por procesar)'}`,
    `Monto estimado: ${formatearMonto(expediente.montoEstimado?.toString())}`,
    `Estado actual: ${expediente.estadoActual.nombre}`,
    `Vía de resolución prevista: ${expediente.viaResolucion?.nombre ?? '—'}`,
    '',
    'Historial de trazabilidad:',
    ...(lineasTrazabilidad.length ? lineasTrazabilidad : ['(sin registros)']),
    '',
    'Salidas registradas:',
    ...(lineasSalidas.length ? lineasSalidas : ['(sin salidas)']),
    ...(novedades.length
      ? [
          '',
          `Seguimiento fuera de la SUOC (${seguimientoAbierto ? 'abierto' : 'cerrado'}):`,
          ...novedades.map(
            (n) =>
              `- [${formatearFecha(n.fecha)}] ${n.dondeEsta}: ${n.detalle}${n.cierre ? ' (cierre)' : ''}`,
          ),
        ]
      : []),
  ].join('\n');

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

      {nuevo === '1' && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-sm text-green-800">Expediente cargado. Anotá en el papel:</p>
          <p className="mt-1 text-4xl font-bold text-green-900">
            {expediente.nroSuoc}/{expediente.anioSuoc}
          </p>
        </div>
      )}

      {expediente.porProcesar && (
        <p className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <strong>Por procesar:</strong> se cargó con fotos desde el celular y todavía faltan sus
          datos. Completalos con &quot;Editar datos&quot;; al guardarlos, sale de la bandeja.
        </p>
      )}

      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 gap-y-4 rounded-lg border border-gray-200 bg-white p-6 text-sm">
        <Campo etiqueta="N° de mesa de entrada" valor={expediente.nroMesaEntrada ?? '—'} />
        <Campo etiqueta="N° SIMESE" valor={expediente.nroSimese ?? '—'} />
        <Campo
          etiqueta="Ingreso al Depto. Administrativo"
          valor={expediente.fechaIngresoAdm ? formatearFechaHora(expediente.fechaIngresoAdm) : '—'}
        />
        <Campo
          etiqueta="Ingreso a la SUOC"
          valor={formatearFechaHora(expediente.fechaIngresoSuoc)}
        />
        <Campo etiqueta="Tipo de documento" valor={expediente.tipoDocumento?.nombre ?? '—'} />
        <Campo etiqueta="Servicio de origen" valor={expediente.servicioOrigen?.nombre ?? '—'} />
        <Campo etiqueta="Estado actual" valor={expediente.estadoActual.nombre} />
        <Campo
          etiqueta="Monto estimado"
          valor={formatearMonto(expediente.montoEstimado?.toString())}
        />
        <Campo
          etiqueta="Vía de resolución prevista"
          valor={expediente.viaResolucion?.nombre ?? '—'}
        />
        <div className="sm:col-span-2">
          <Campo etiqueta="Asunto" valor={expediente.asunto ?? '—'} multilinea />
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Adjunto</dt>
          <dd className="mt-1">
            {expediente.adjunto ? (
              <a
                href={`/adjuntos/${expediente.adjunto.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {expediente.adjunto.nombreArchivo}
              </a>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </dd>
        </div>
        {expediente.fotos.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Fotos de las hojas ({expediente.fotos.length})
            </dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {expediente.fotos.map((foto, i) => (
                <a
                  key={foto.adjuntoId}
                  href={`/adjuntos/${foto.adjuntoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Hoja ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniaturas servidas por la ruta de adjuntos, no por el optimizador de imágenes */}
                  <img
                    src={`/adjuntos/${foto.adjuntoId}`}
                    alt={`Hoja ${i + 1}`}
                    className="h-28 w-20 rounded border border-gray-200 object-cover"
                  />
                </a>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-start gap-2">
        <Link
          href={`/expedientes/${expediente.id}/editar`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Editar datos
        </Link>
        <CopiarResumenBoton texto={resumenTexto} />
        {!expediente.estadoActual.esFinal && (
          <CambiarEstadoForm
            expedienteId={expediente.id}
            estados={estados.filter((e) => e.id !== expediente.estadoActualId)}
          />
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
                {salida.adjunto && (
                  <a
                    href={`/adjuntos/${salida.adjunto.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-blue-600 hover:underline"
                  >
                    {salida.adjunto.nombreArchivo}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">
          Seguimiento fuera de la SUOC
          {expediente.seguimiento && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${seguimientoAbierto ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}
            >
              {seguimientoAbierto ? 'Abierto' : 'Cerrado'}
            </span>
          )}
        </h2>
        {novedades.length > 0 && (
          <ul className="mb-3 space-y-2">
            {novedades.map((n) => (
              <li key={n.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                <span className="text-gray-500">{formatearFecha(n.fecha)}</span> ·{' '}
                <strong className="text-gray-900">{n.dondeEsta}</strong>
                {n.cierre && <span className="ml-1 text-green-700">(cierre)</span>}
                <p className="mt-1 whitespace-pre-wrap text-gray-700">{n.detalle}</p>
              </li>
            ))}
          </ul>
        )}
        <SeguimientoForm
          expedienteId={expediente.id}
          abierto={seguimientoAbierto}
          dondeEstaActual={novedades.at(-1)?.dondeEsta ?? ''}
          hoy={hoyParaInputDate()}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Historial de trazabilidad</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
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
