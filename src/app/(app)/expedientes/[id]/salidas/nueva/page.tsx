import { notFound } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { hoyParaInputDate } from '@/lib/tz';
import { NuevaSalidaForm } from './nueva-salida-form';

export default async function NuevaSalidaPage({ params }: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await params;
  const expedienteId = Number(id);
  if (!Number.isInteger(expedienteId)) notFound();

  const expediente = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    include: { estadoActual: true, viaResolucion: { include: { destinoSugerido: true } } },
  });
  if (!expediente) notFound();

  const [destinos, estados, salidasConFirmante] = await Promise.all([
    prisma.destino.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.estado.findMany({ orderBy: { orden: 'asc' } }),
    prisma.salida.findMany({
      where: { firmadaPor: { not: null } },
      select: { firmadaPor: true },
      distinct: ['firmadaPor'],
    }),
  ]);

  const firmantesSugeridos = salidasConFirmante
    .map((s) => s.firmadaPor)
    .filter((f): f is string => Boolean(f));

  const sugerencia = expediente.viaResolucion
    ? {
        nombre: expediente.viaResolucion.nombre,
        tipoSalidaSugerido: expediente.viaResolucion.tipoSalidaSugerido,
        destinoSugeridoId: expediente.viaResolucion.destinoSugeridoId,
      }
    : null;

  return (
    <NuevaSalidaForm
      expedienteId={expediente.id}
      destinos={destinos}
      estados={estados.filter((e) => e.id !== expediente.estadoActualId)}
      firmantesSugeridos={firmantesSugeridos}
      fechaHoyLocal={hoyParaInputDate()}
      puedeCambiarEstado={!expediente.estadoActual.esFinal}
      sugerencia={sugerencia}
    />
  );
}
