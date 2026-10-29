import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { diasDesdeIngreso, formatearFechaHora } from '@/lib/tz';
import { colorAntiguedad } from '@/lib/antiguedad';

const CLASE_COLOR = { verde: 'bg-green-500', amarillo: 'bg-yellow-500', rojo: 'bg-red-500' };

export default async function Home() {
  await verifySession();

  const pendientes = await prisma.expediente.findMany({
    where: { estadoActual: { esFinal: false } },
    include: { estadoActual: true, servicioOrigen: true },
    orderBy: { fechaIngresoSuoc: 'asc' },
  });

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">
        Expedientes pendientes ({pendientes.length})
      </h1>

      {pendientes.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          No hay expedientes pendientes.
        </p>
      ) : (
        <ul className="space-y-2">
          {pendientes.map((exp) => {
            const dias = diasDesdeIngreso(exp.fechaIngresoSuoc);
            return (
              <li key={exp.id}>
                <Link
                  href={`/expedientes/${exp.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-gray-200 bg-white p-4 text-sm hover:bg-gray-50"
                >
                  <IndicadorAntiguedad dias={dias} />
                  <span className="font-medium text-gray-900">
                    {exp.nroSuoc}/{exp.anioSuoc}
                  </span>
                  <span className="min-w-0 flex-1 basis-40 truncate text-gray-700">
                    {exp.asunto}
                  </span>
                  <span className="text-gray-500">{exp.servicioOrigen.nombre}</span>
                  <span className="text-gray-500">{exp.estadoActual.nombre}</span>
                  <span className="whitespace-nowrap text-gray-500">
                    {formatearFechaHora(exp.fechaIngresoSuoc)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function IndicadorAntiguedad({ dias }: { dias: number }) {
  const color = CLASE_COLOR[colorAntiguedad(dias)];
  return (
    <span
      title={`${dias} día(s) desde el ingreso a la SUOC`}
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium text-white ${color}`}
    >
      {dias}d
    </span>
  );
}
