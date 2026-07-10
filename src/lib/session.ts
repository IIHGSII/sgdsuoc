import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'sgd_session';
const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

type SessionPayload = {
  userId: number;
  sessionVersion: number;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Falta la variable de entorno SESSION_SECRET.');
  }
  return new TextEncoder().encode(secret);
}

async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecretKey());
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    if (typeof payload.userId !== 'number' || typeof payload.sessionVersion !== 'number') {
      return null;
    }
    return { userId: payload.userId, sessionVersion: payload.sessionVersion };
  } catch {
    return null;
  }
}

export async function createSession(userId: number, sessionVersion: number) {
  const expiresAt = new Date(Date.now() + DURACION_SESION_MS);
  const token = await encrypt({ userId, sessionVersion }, expiresAt);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/** Renueva la expiración de la sesión activa (ventana deslizante de 30 días). */
export async function refreshSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await decryptSession(token);
  if (!session) return;

  await createSession(session.userId, session.sessionVersion);
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
