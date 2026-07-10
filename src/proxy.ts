import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSession } from '@/lib/session';

const RUTAS_PUBLICAS = ['/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esRutaPublica = RUTAS_PUBLICAS.includes(pathname);

  const token = request.cookies.get('sgd_session')?.value;
  const session = await decryptSession(token);

  // Chequeo optimista (solo la cookie, sin ir a la base de datos): la verificación
  // completa contra sessionVersion ocurre en el DAL (src/lib/dal.ts) en cada request real.
  if (!esRutaPublica && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (esRutaPublica && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
