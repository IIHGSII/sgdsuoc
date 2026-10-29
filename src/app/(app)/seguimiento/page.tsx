import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { listarSeguimientosAbiertos } from '@/lib/seguimiento';
import { colorAntiguedad } from '@/lib/antiguedad';
import { formatearFecha } from '@/lib/tz';

const CLASE_COLOR = { verde: 'bg-green-500', amarillo: 'bg-yellow-500', rojo: 'bg-red-500' };

export default async function SeguimientoPage() {
  await verifySession();
  const filas = await listarSeguimientosAbiertos();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-lg font-semibold text-gray-900">
        Seguimiento fuera de la SUOC ({filas.length})
      </h1>
      <p className="mb-4 text-sm text-gray-500">
        Expedientes que ya salieron de la SUOC pero cuya necesidad sigue abierta. Primero los que
        llevan más tiempo sin novedades.
      </p>

      {filas.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
          No hay seguimientos abiertos. Se abren desde el expediente, con &quot;Seguir fuera de la
          SUOC&quot;.
        </p>
      ) : (
        <ul className="space-y-3">
          {filas.map((f) => (
            <li
              key={f.expedienteId}
              className="rounded-lg border border-gray-200 bg-white p-4 text-sm"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <Link
                  href={`/expedientes/${f.expedienteId}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {f.nroSuoc}/{f.anioSuoc}
                </Link>
                <span
                  title={`${f.diasSinNovedad} día(s) sin novedades`}
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium text-white ${CLASE_COLOR[colorAntiguedad(f.diasSinNovedad)]}`}
                >
                  {f.diasSinNovedad}d
                </span>
              </div>
              <p className="text-gray-900">{f.asunto ?? '—'}</p>
              <p className="mt-1 text-gray-700">
                <strong>{f.dondeEsta}</strong> · {formatearFecha(f.fechaUltimaNovedad)}:{' '}
                {f.ultimaNovedad}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                En seguimiento desde {formatearFecha(f.desde)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
