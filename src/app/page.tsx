import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { logout } from './logout-action';

export default async function Home() {
  const { usuario } = await verifySession();

  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">SGD SUOC</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/expedientes" className="text-blue-600 hover:underline">
            Expedientes
          </Link>
          <Link href="/expedientes/nuevo" className="text-blue-600 hover:underline">
            Nuevo expediente
          </Link>
        </nav>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{usuario}</span>
          <form action={logout}>
            <button type="submit" className="text-blue-600 hover:underline">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-gray-500">Panel en construcción (Fase 8). Login y sesión funcionando.</p>
      </main>
    </div>
  );
}
