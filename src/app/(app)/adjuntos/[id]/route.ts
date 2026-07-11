import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await verifySession();

  const { id } = await params;
  const adjuntoId = Number(id);
  if (!Number.isInteger(adjuntoId)) {
    return NextResponse.json({ error: 'Adjunto inválido.' }, { status: 400 });
  }

  const adjunto = await prisma.adjunto.findUnique({ where: { id: adjuntoId } });
  if (!adjunto) {
    return NextResponse.json({ error: 'Adjunto no encontrado.' }, { status: 404 });
  }

  return new NextResponse(Buffer.from(adjunto.contenido), {
    headers: {
      'Content-Type': adjunto.mimeType,
      'Content-Disposition': `inline; filename="${adjunto.nombreArchivo}"`,
      'Content-Length': String(adjunto.tamanioBytes),
    },
  });
}
