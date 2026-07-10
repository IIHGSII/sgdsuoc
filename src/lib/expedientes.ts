import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { anioEnParaguay } from '@/lib/tz';

const MAX_REINTENTOS = 5;

export type DatosNuevoExpediente = {
  nroMesaEntrada: string;
  nroSuocManual?: number;
  nroSimese?: string | null;
  fechaIngresoAdm: Date;
  fechaIngresoSuoc: Date;
  tipoDocumentoId: number;
  servicioOrigenId: number;
  asunto: string;
  montoEstimado?: string | null;
};

export class NumeroSuocDuplicadoError extends Error {}

/**
 * Crea un expediente asignando el correlativo SUOC (RN-1): si no se pasa
 * nroSuocManual, usa (máximo del año) + 1, reintentando ante colisiones de
 * concurrencia (unicidad de nroSuoc+anioSuoc). También registra el estado
 * inicial (el de menor orden) y su primer registro de trazabilidad, igual
 * que hacía el sistema anterior con el ingreso de un expediente.
 */
export async function crearExpediente(datos: DatosNuevoExpediente) {
  const anioSuoc = anioEnParaguay(datos.fechaIngresoSuoc);

  for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
    try {
      return await prisma.$transaction(async (tx) => {
        let nroSuoc = datos.nroSuocManual;
        if (nroSuoc == null) {
          const max = await tx.expediente.aggregate({
            where: { anioSuoc },
            _max: { nroSuoc: true },
          });
          nroSuoc = (max._max.nroSuoc ?? 0) + 1;
        }

        const estadoInicial = await tx.estado.findFirstOrThrow({ orderBy: { orden: 'asc' } });

        const expediente = await tx.expediente.create({
          data: {
            nroMesaEntrada: datos.nroMesaEntrada,
            nroSuoc,
            anioSuoc,
            nroSimese: datos.nroSimese || null,
            fechaIngresoAdm: datos.fechaIngresoAdm,
            fechaIngresoSuoc: datos.fechaIngresoSuoc,
            tipoDocumentoId: datos.tipoDocumentoId,
            servicioOrigenId: datos.servicioOrigenId,
            asunto: datos.asunto,
            montoEstimado: datos.montoEstimado || null,
            estadoActualId: estadoInicial.id,
          },
        });

        await tx.trazabilidad.create({
          data: {
            expedienteId: expediente.id,
            estadoAnteriorId: null,
            estadoNuevoId: estadoInicial.id,
            fechaCambio: datos.fechaIngresoSuoc,
            observaciones: 'Ingreso del expediente al sistema.',
          },
        });

        return expediente;
      });
    } catch (error) {
      const esConflictoUnico =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!esConflictoUnico) throw error;

      if (datos.nroSuocManual != null) {
        throw new NumeroSuocDuplicadoError(
          `Ya existe el expediente ${datos.nroSuocManual}/${anioSuoc}. Elegí otro número o dejalo en blanco para autogenerarlo.`,
        );
      }

      if (intento === MAX_REINTENTOS - 1) {
        throw new Error(
          'No se pudo asignar el número SUOC tras varios intentos. Volvé a intentar.',
        );
      }
      // No fue el último intento: el for reintenta con el máximo recalculado.
    }
  }

  throw new Error('No se pudo asignar el número SUOC tras varios intentos. Volvé a intentar.');
}
