import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { logout } from './logout-action';
import { BuscadorHeader } from './buscador-header';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { usuario } = await verifySession();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          SGD SUOC
        </Link>

        <BuscadorHeader />

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/expedientes" className="text-blue-600 hover:underline">
            Expedientes
          </Link>
          <Link href="/expedientes/nuevo" className="text-blue-600 hover:underline">
            Nuevo expediente
          </Link>
          <Link href="/administracion" className="text-blue-600 hover:underline">
            Administración
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
          <span>{usuario}</span>
          <form action={logout}>
            <button type="submit" className="text-blue-600 hover:underline">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
