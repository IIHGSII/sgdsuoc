import 'server-only';
import type { TipoSalida } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { cambiarEstado } from '@/lib/estados';
import {
  guardarAdjunto,
  TIMEOUT_TRANSACCION_CON_ADJUNTO_MS,
  type ArchivoPdf,
} from '@/lib/adjuntos';

export type DatosNuevaSalida = {
  expedienteId: number;
  tipo: TipoSalida;
  fecha: Date;
  destinoId?: number | null;
  nroNota?: string | null;
  firmadaPor?: string | null;
  referencia?: string | null;
  descripcion: string;
  /** Se guarda dentro de la misma transacción: si la salida falla, no queda huérfano. */
  adjunto?: ArchivoPdf | null;
  /** RN-3: registrar la salida no cambia el estado por sí solo, pero se puede ofrecer hacerlo en el mismo paso. */
  cambiarEstado?: { estadoNuevoId: number; observaciones?: string | null } | null;
};

export async function crearSalida(datos: DatosNuevaSalida) {
  return prisma.$transaction(
    async (tx) => {
      const adjuntoId = await guardarAdjunto(tx, datos.adjunto);

      const salida = await tx.salida.create({
        data: {
          expedienteId: datos.expedienteId,
          tipo: datos.tipo,
          fecha: datos.fecha,
          destinoId: datos.destinoId ?? null,
          nroNota: datos.nroNota ?? null,
          firmadaPor: datos.firmadaPor ?? null,
          referencia: datos.referencia ?? null,
          descripcion: datos.descripcion,
          adjuntoId,
        },
      });

      if (datos.cambiarEstado) {
        await cambiarEstado(
          tx,
          datos.expedienteId,
          datos.cambiarEstado.estadoNuevoId,
          datos.cambiarEstado.observaciones,
        );
      }

      return salida;
    },
    { timeout: TIMEOUT_TRANSACCION_CON_ADJUNTO_MS },
  );
}
