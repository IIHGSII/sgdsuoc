'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/session';

function volver(mensaje?: string, tipo: 'error' | 'ok' = 'error'): never {
  const parametro = tipo === 'error' ? 'error' : 'ok';
  redirect(
    mensaje ? `/administracion?${parametro}=${encodeURIComponent(mensaje)}` : '/administracion',
  );
}

export async function cambiarPasswordAction(formData: FormData) {
  const { userId } = await verifySession();

  const actual = String(formData.get('actual') ?? '');
  const nueva = String(formData.get('nueva') ?? '');
  const confirmar = String(formData.get('confirmar') ?? '');

  if (!actual || !nueva || !confirmar) volver('Completá los tres campos.');
  if (nueva.length < 8) volver('La nueva contraseña debe tener al menos 8 caracteres.');
  if (nueva !== confirmar) volver('La confirmación no coincide con la nueva contraseña.');

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: userId } });

  const actualValida = await bcrypt.compare(actual, usuario.passwordHash);
  if (!actualValida) volver('La contraseña actual no es correcta.');

  const nuevoHash = await bcrypt.hash(nueva, 12);
  const actualizado = await prisma.usuario.update({
    where: { id: userId },
    data: { passwordHash: nuevoHash, sessionVersion: { increment: 1 } },
  });

  // Refresca la sesión actual con la nueva sessionVersion para no cerrar la
  // sesión de quien acaba de cambiar la contraseña (sí se invalidan las demás).
  await createSession(actualizado.id, actualizado.sessionVersion);

  volver('Contraseña actualizada correctamente.', 'ok');
}
