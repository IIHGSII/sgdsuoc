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

  const [expediente, tiposDocumento, servicios, viasResolucion] = await Promise.all([
    prisma.expediente.findUnique({ where: { id: expedienteId }, include: { adjunto: true } }),
    prisma.tipoDocumento.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.servicio.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.viaResolucion.findMany({ orderBy: { nombre: 'asc' } }),
  ]);

  if (!expediente) notFound();

  return (
    <EditarExpedienteForm
      expedienteId={expediente.id}
      tiposDocumento={tiposDocumento}
      servicios={servicios}
      viasResolucion={viasResolucion}
      valoresIniciales={{
        // Vacíos solo en los expedientes cargados con fotos y todavía sin procesar.
        nroMesaEntrada: expediente.nroMesaEntrada ?? '',
        nroSimese: expediente.nroSimese ?? '',
        fechaIngresoAdm: expediente.fechaIngresoAdm
          ? fechaParaInputLocal(expediente.fechaIngresoAdm)
          : '',
        fechaIngresoSuoc: fechaParaInputLocal(expediente.fechaIngresoSuoc),
        tipoDocumentoId: expediente.tipoDocumentoId ?? undefined,
        servicioOrigenId: expediente.servicioOrigenId ?? undefined,
        asunto: expediente.asunto ?? '',
        montoEstimado: expediente.montoEstimado?.toString() ?? '',
        viaResolucionId: expediente.viaResolucionId ?? undefined,
      }}
      adjuntoActual={
        expediente.adjunto
          ? { id: expediente.adjunto.id, nombre: expediente.adjunto.nombreArchivo }
          : null
      }
    />
  );
}
