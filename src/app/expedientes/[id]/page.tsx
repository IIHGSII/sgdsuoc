import Link from 'next/link';
import { notFound } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { formatearFechaHora } from '@/lib/tz';
import { formatearMonto } from '@/lib/format';

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

      <p className="mt-6 text-sm text-gray-500">
        Salidas, historial de trazabilidad y cambio de estado se agregan en las próximas fases.
      </p>
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
