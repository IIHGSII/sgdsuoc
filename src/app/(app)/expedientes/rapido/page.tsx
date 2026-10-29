import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { CargarFotosForm } from './cargar-fotos-form';

export default async function CargarConFotosPage() {
  await verifySession();

  return (
    <div className="mx-auto w-full max-w-lg p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Cargar expediente con fotos</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Cancelar
        </Link>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Al guardar, el expediente recibe su número SUOC con la fecha y hora de ahora, y queda en la
        bandeja &quot;Por procesar&quot; hasta que se completen sus datos.
      </p>
      <CargarFotosForm />
    </div>
  );
}
