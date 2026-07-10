import 'server-only';
import type { TipoSalida } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { cambiarEstado } from '@/lib/estados';

export type DatosNuevaSalida = {
  expedienteId: number;
  tipo: TipoSalida;
  fecha: Date;
  destinoId?: number | null;
  nroNota?: string | null;
  firmadaPor?: string | null;
  referencia?: string | null;
  descripcion: string;
  /** RN-3: registrar la salida no cambia el estado por sí solo, pero se puede ofrecer hacerlo en el mismo paso. */
  cambiarEstado?: { estadoNuevoId: number; observaciones?: string | null } | null;
};

export async function crearSalida(datos: DatosNuevaSalida) {
  return prisma.$transaction(async (tx) => {
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
  });
}
