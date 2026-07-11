import { notFound } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { fechaParaInputLocal } from '@/lib/tz';
import { EditarExpedienteForm } from './editar-expediente-form';

export default async function EditarExpedientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;
  const expedienteId = Number(id);
  if (!Number.isInteger(expedienteId)) notFound();

  const [expediente, tiposDocumento, servicios] = await Promise.all([
    prisma.expediente.findUnique({ where: { id: expedienteId }, include: { adjunto: true } }),
    prisma.tipoDocumento.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.servicio.findMany({ orderBy: { nombre: 'asc' } }),
  ]);

  if (!expediente) notFound();

  return (
    <EditarExpedienteForm
      expedienteId={expediente.id}
      tiposDocumento={tiposDocumento}
      servicios={servicios}
      valoresIniciales={{
        nroMesaEntrada: expediente.nroMesaEntrada,
        nroSimese: expediente.nroSimese ?? '',
        fechaIngresoAdm: fechaParaInputLocal(expediente.fechaIngresoAdm),
        fechaIngresoSuoc: fechaParaInputLocal(expediente.fechaIngresoSuoc),
        tipoDocumentoId: expediente.tipoDocumentoId,
        servicioOrigenId: expediente.servicioOrigenId,
        asunto: expediente.asunto,
        montoEstimado: expediente.montoEstimado?.toString() ?? '',
      }}
      adjuntoActual={
        expediente.adjunto
          ? { id: expediente.adjunto.id, nombre: expediente.adjunto.nombreArchivo }
          : null
      }
    />
  );
}
