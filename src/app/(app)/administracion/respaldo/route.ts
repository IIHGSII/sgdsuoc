import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

// Respaldo completo de la base como JSON (equivalente al dumpdata del sistema
// anterior). No incluye la tabla de usuarios: no hay flujo de restauración de
// credenciales y el importador tampoco las trae del sistema viejo.
export async function GET() {
  await verifySession();

  const [
    estados,
    tiposDocumento,
    servicios,
    destinos,
    expedientes,
    salidas,
    trazabilidad,
    adjuntos,
  ] = await Promise.all([
    prisma.estado.findMany({ orderBy: { id: 'asc' } }),
    prisma.tipoDocumento.findMany({ orderBy: { id: 'asc' } }),
    prisma.servicio.findMany({ orderBy: { id: 'asc' } }),
    prisma.destino.findMany({ orderBy: { id: 'asc' } }),
    prisma.expediente.findMany({ orderBy: { id: 'asc' } }),
    prisma.salida.findMany({ orderBy: { id: 'asc' } }),
    prisma.trazabilidad.findMany({ orderBy: { id: 'asc' } }),
    prisma.adjunto.findMany({ orderBy: { id: 'asc' } }),
  ]);

  const respaldo = {
    generadoEn: new Date().toISOString(),
    estados,
    tiposDocumento,
    servicios,
    destinos,
    expedientes: expedientes.map((e) => ({
      ...e,
      montoEstimado: e.montoEstimado?.toString() ?? null,
    })),
    salidas,
    trazabilidad,
    adjuntos: adjuntos.map((a) => ({
      ...a,
      contenido: Buffer.from(a.contenido).toString('base64'),
    })),
  };

  const nombreArchivo = `respaldo-sgd-suoc-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(respaldo, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  });
}
