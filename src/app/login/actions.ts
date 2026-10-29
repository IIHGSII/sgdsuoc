'use server';

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

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const validado = LoginSchema.safeParse({
    usuario: formData.get('usuario'),
    password: formData.get('password'),
  });

  if (!validado.success) {
    return { error: 'Completá usuario y contraseña.' };
  }

  const { usuario, password } = validado.data;

  // El límite de intentos va por usuario, no por IP: la IP sale de
  // x-forwarded-for, que quien hace el pedido puede inventar para saltárselo.
  // Sin tildes y en minúsculas porque la búsqueda del usuario en MySQL
  // (utf8mb4_unicode_ci) no distingue ni unas ni otras.
  const clave = usuario
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (!puedeIntentarLogin(clave)) {
    return { error: 'Demasiados intentos fallidos. Esperá unos minutos y volvé a intentar.' };
  }

  const registro = await prisma.usuario.findUnique({ where: { usuario } });

  const contraseñaValida = registro
    ? await bcrypt.compare(password, registro.passwordHash)
    : await bcrypt.compare(password, '$2b$10$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinva');

  if (!registro || !contraseñaValida) {
    registrarIntentoFallido(clave);
    return { error: 'Usuario o contraseña incorrectos.' };
  }

  limpiarIntentos(clave);
  await createSession(registro.id, registro.sessionVersion);
  redirect('/');
}
