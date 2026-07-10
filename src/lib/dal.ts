import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { decryptSession, getSessionCookie } from '@/lib/session';

/**
 * Chequeo "seguro" de sesión (contra la base, no solo la cookie): si la
 * contraseña cambió después de emitido el token, sessionVersion ya no
 * coincide y la sesión se invalida aunque la cookie siga siendo
 * criptográficamente válida. Devuelve null en vez de redirigir, para poder
 * usarse también en /login (ver esa página para el porqué).
 */
export const obtenerSesionSegura = cache(async () => {
  const token = await getSessionCookie();
  const session = await decryptSession(token);
  if (!session) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { id: true, usuario: true, sessionVersion: true },
  });

  if (!usuario || usuario.sessionVersion !== session.sessionVersion) return null;

  return { userId: usuario.id, usuario: usuario.usuario };
});

/**
 * Igual que obtenerSesionSegura, pero redirige a /login si no hay sesión
 * válida. No borra la cookie acá: Next.js solo permite modificar cookies
 * desde una Server Action o Route Handler, no durante el render de una
 * página. Alcanza con redirigir; la cookie vieja va a seguir sin pasar la
 * verificación hasta que se loguee de nuevo (createSession la sobreescribe).
 */
export const verifySession = cache(async () => {
  const sesion = await obtenerSesionSegura();
  if (!sesion) redirect('/login');
  return sesion;
});
