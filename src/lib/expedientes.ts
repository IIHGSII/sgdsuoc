import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { anioEnParaguay, formatearFechaHora } from '@/lib/tz';
import {
  guardarAdjunto,
  TIMEOUT_TRANSACCION_CON_ADJUNTO_MS,
  type ArchivoPdf,
} from '@/lib/adjuntos';

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
  /** Se guarda dentro de la misma transacción: si la creación falla, no queda huérfano. */
  adjunto?: ArchivoPdf | null;
  viaResolucionId?: number | null;
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
      return await prisma.$transaction(
        async (tx) => {
          let nroSuoc = datos.nroSuocManual;
          if (nroSuoc == null) {
            const max = await tx.expediente.aggregate({
              where: { anioSuoc },
              _max: { nroSuoc: true },
            });
            nroSuoc = (max._max.nroSuoc ?? 0) + 1;
          }

          const estadoInicial = await tx.estado.findFirstOrThrow({ orderBy: { orden: 'asc' } });
          const adjuntoId = await guardarAdjunto(tx, datos.adjunto);

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
              adjuntoId,
              viaResolucionId: datos.viaResolucionId ?? null,
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
        },
        { timeout: TIMEOUT_TRANSACCION_CON_ADJUNTO_MS },
      );
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

export type DatosEditarExpediente = {
  nroMesaEntrada: string;
  nroSimese?: string | null;
  fechaIngresoAdm: Date;
  fechaIngresoSuoc: Date;
  tipoDocumentoId: number;
  servicioOrigenId: number;
  asunto: string;
  montoEstimado?: string | null;
  viaResolucionId?: number | null;
  /** Solo si se subió un archivo nuevo: reemplaza (y borra) el adjunto anterior. */
  nuevoAdjunto?: ArchivoPdf | null;
};

export class FechaIngresoInvalidaError extends Error {}

/**
 * El formulario edita las fechas con precisión de minutos: si la que llega es
 * la misma al minuto que la guardada, se toma como "sin cambios" y se conserva
 * la original (así no se pierden los segundos de las fechas importadas).
 */
function mismoMinuto(a: Date, b: Date): boolean {
  return Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000);
}

/**
 * Edita los datos descriptivos de un expediente. No toca nroSuoc/anioSuoc
 * (el correlativo asignado por RN-1 no se reedita) ni estadoActualId (los
 * cambios de estado pasan siempre por cambiarEstado, para dejar trazabilidad).
 *
 * Corregir la fecha de ingreso a la SUOC equivale a que el expediente haya
 * entrado en esa fecha: se mueve también el registro de ingreso de la
 * trazabilidad. Se rechaza si la fecha cae en otro año que el del expediente
 * (el número SUOC no se reasigna nunca) o si queda después de algún cambio de
 * estado ya registrado.
 *
 * Todo en una transacción: si algo falla (incluido el reemplazo del adjunto),
 * queda todo como estaba.
 */
export async function editarExpediente(id: number, datos: DatosEditarExpediente) {
  return prisma.$transaction(
    async (tx) => {
      const actual = await tx.expediente.findUniqueOrThrow({
        where: { id },
        select: {
          nroSuoc: true,
          anioSuoc: true,
          fechaIngresoAdm: true,
          fechaIngresoSuoc: true,
          adjuntoId: true,
        },
      });

      const cambiaIngresoSuoc = !mismoMinuto(datos.fechaIngresoSuoc, actual.fechaIngresoSuoc);
      const fechaIngresoSuoc = cambiaIngresoSuoc ? datos.fechaIngresoSuoc : actual.fechaIngresoSuoc;
      const fechaIngresoAdm = mismoMinuto(datos.fechaIngresoAdm, actual.fechaIngresoAdm)
        ? actual.fechaIngresoAdm
        : datos.fechaIngresoAdm;

      if (cambiaIngresoSuoc) {
        const anioNuevo = anioEnParaguay(fechaIngresoSuoc);
        if (anioNuevo !== actual.anioSuoc) {
          throw new FechaIngresoInvalidaError(
            `La fecha corresponde al año ${anioNuevo}, distinto del año del expediente ${actual.nroSuoc}/${actual.anioSuoc}. Si es correcto, hay que resolverlo manualmente.`,
          );
        }

        const primerCambioDeEstado = await tx.trazabilidad.findFirst({
          where: { expedienteId: id, estadoAnteriorId: { not: null } },
          orderBy: { fechaCambio: 'asc' },
          select: { fechaCambio: true },
        });
        if (primerCambioDeEstado && fechaIngresoSuoc > primerCambioDeEstado.fechaCambio) {
          throw new FechaIngresoInvalidaError(
            `Hay cambios de estado registrados antes de esa fecha (${formatearFechaHora(primerCambioDeEstado.fechaCambio)}). La fecha de ingreso a la SUOC no puede ser posterior.`,
          );
        }

        // Registro de ingreso = el que no tiene estado anterior. Los expedientes
        // importados del sistema viejo pueden no tenerlo; en ese caso no hay nada que mover.
        const registroIngreso = await tx.trazabilidad.findFirst({
          where: { expedienteId: id, estadoAnteriorId: null },
          orderBy: [{ fechaCambio: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });
        if (registroIngreso) {
          await tx.trazabilidad.update({
            where: { id: registroIngreso.id },
            data: { fechaCambio: fechaIngresoSuoc },
          });
        }
      }

      // Si se subió un PDF nuevo: guardarlo, apuntar el expediente a él y borrar el anterior.
      const nuevoAdjuntoId = await guardarAdjunto(tx, datos.nuevoAdjunto);

      const expediente = await tx.expediente.update({
        where: { id },
        data: {
          nroMesaEntrada: datos.nroMesaEntrada,
          nroSimese: datos.nroSimese || null,
          fechaIngresoAdm,
          fechaIngresoSuoc,
          tipoDocumentoId: datos.tipoDocumentoId,
          servicioOrigenId: datos.servicioOrigenId,
          asunto: datos.asunto,
          montoEstimado: datos.montoEstimado || null,
          viaResolucionId: datos.viaResolucionId ?? null,
          ...(nuevoAdjuntoId ? { adjuntoId: nuevoAdjuntoId } : {}),
        },
      });

      if (nuevoAdjuntoId && actual.adjuntoId) {
        await tx.adjunto.delete({ where: { id: actual.adjuntoId } });
      }

      return expediente;
    },
    { timeout: TIMEOUT_TRANSACCION_CON_ADJUNTO_MS },
  );
}
