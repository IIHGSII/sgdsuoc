import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { decryptSession, deleteSession, getSessionCookie } from '@/lib/session';

/**
 * Verifica la sesión contra la base de datos (chequeo "seguro", no solo la cookie):
 * si la contraseña cambió después de emitido el token, sessionVersion ya no coincide
 * y la sesión se invalida aunque la cookie siga siendo criptográficamente válida.
 */
export const verifySession = cache(async () => {
  const token = await getSessionCookie();
  const session = await decryptSession(token);

  if (!session) {
    redirect('/login');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { id: true, usuario: true, sessionVersion: true },
  });

  if (!usuario || usuario.sessionVersion !== session.sessionVersion) {
    await deleteSession();
    redirect('/login');
  }

  return { userId: usuario.id, usuario: usuario.usuario };
});
