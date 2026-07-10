'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/session';
import { puedeIntentarLogin, registrarIntentoFallido, limpiarIntentos } from '@/lib/rate-limit';

const LoginSchema = z.object({
  usuario: z.string().trim().min(1, 'Ingresá tu usuario.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
});

export type LoginState = { error?: string } | undefined;

async function obtenerIpCliente() {
  const headersList = await headers();
  return headersList.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconocida';
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const validado = LoginSchema.safeParse({
    usuario: formData.get('usuario'),
    password: formData.get('password'),
  });

  if (!validado.success) {
    return { error: 'Completá usuario y contraseña.' };
  }

  const ip = await obtenerIpCliente();

  if (!puedeIntentarLogin(ip)) {
    return { error: 'Demasiados intentos fallidos. Esperá unos minutos y volvé a intentar.' };
  }

  const { usuario, password } = validado.data;

  const registro = await prisma.usuario.findUnique({ where: { usuario } });

  const contraseñaValida = registro
    ? await bcrypt.compare(password, registro.passwordHash)
    : await bcrypt.compare(password, '$2b$10$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinva');

  if (!registro || !contraseñaValida) {
    registrarIntentoFallido(ip);
    return { error: 'Usuario o contraseña incorrectos.' };
  }

  limpiarIntentos(ip);
  await createSession(registro.id, registro.sessionVersion);
  redirect('/');
}
