import { redirect } from 'next/navigation';
import { obtenerSesionSegura } from '@/lib/dal';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  // Chequeo seguro (contra la base), no el optimista del proxy: así una
  // cookie con sessionVersion desactualizada (ej. tras cambiar la contraseña
  // en otra pestaña) no termina en un loop de redirección con el proxy, que
  // solo puede validar la firma del token, no si sigue vigente.
  const sesion = await obtenerSesionSegura();
  if (sesion) redirect('/');

  return <LoginForm />;
}
