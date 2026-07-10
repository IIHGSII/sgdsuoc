import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { ahoraParaInputLocal } from '@/lib/tz';
import { NuevoExpedienteForm } from './nuevo-expediente-form';

export default async function NuevoExpedientePage() {
  await verifySession();

  const [tiposDocumento, servicios] = await Promise.all([
    prisma.tipoDocumento.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.servicio.findMany({ orderBy: { nombre: 'asc' } }),
  ]);

  return (
    <NuevoExpedienteForm
      tiposDocumento={tiposDocumento}
      servicios={servicios}
      fechaHoraActual={ahoraParaInputLocal()}
    />
  );
}
