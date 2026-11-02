import { verifySession } from '@/lib/dal';
import { obtenerPresupuesto } from '@/lib/presupuesto';
import { formatearMonto } from '@/lib/format';

function porcentaje(parte: number, total: number): string {
  return `${((parte / total) * 100).toLocaleString('es-PY', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export default async function PresupuestoPage() {
  await verifySession();
  const presupuesto = await obtenerPresupuesto();

  if (!presupuesto) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-lg font-semibold text-gray-900">Presupuesto</h1>
        <p className="mt-2 text-sm text-gray-500">Todavía no hay un presupuesto cargado.</p>
      </div>
    );
  }

  const { anio, grupos, total } = presupuesto;

  const tarjetas = [
    { titulo: 'Total aprobado', monto: total, detalle: 'Actividad 23 · Unidad Responsable 41' },
    ...grupos.map((g) => ({
      titulo: `${g.nombre} (${g.codigo})`,
      monto: g.aprobado,
      detalle: `${porcentaje(g.aprobado, total)} del total`,
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <h1 className="text-lg font-semibold text-gray-900">Presupuesto aprobado {anio}</h1>
      <p className="mb-4 text-sm text-gray-500">
        Presupuesto General de la Nación, por rubro. No incluye Servicios personales (100) ni
        Combustibles (361).
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {tarjetas.map((t) => (
          <div key={t.titulo} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{t.titulo}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{formatearMonto(t.monto)}</p>
            <p className="mt-1 text-xs text-gray-500">{t.detalle}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {grupos.map((grupo) => (
          <section key={grupo.codigo} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h2 className="font-semibold text-gray-900">
                {grupo.codigo} · {grupo.nombre}
              </h2>
              <p className="text-sm font-semibold text-gray-900">
                {formatearMonto(grupo.aprobado)}
              </p>
            </div>
            <div
              className="mt-2 h-2 rounded bg-gray-100"
              title={`${porcentaje(grupo.aprobado, total)} del total`}
            >
              <div
                className="h-2 rounded bg-blue-600"
                style={{ width: `${(grupo.aprobado / total) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {porcentaje(grupo.aprobado, total)} del total
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Rubro</th>
                    <th className="px-2 py-1 font-medium">F.F.</th>
                    <th className="py-1 pl-2 text-right font-medium">Aprobado</th>
                  </tr>
                </thead>
                {grupo.subgrupos.map((subgrupo) => (
                  <tbody key={subgrupo.codigo} className="border-t border-gray-200">
                    <tr className="font-medium text-gray-900">
                      <td className="py-1 pr-2" colSpan={2}>
                        {subgrupo.codigo} · {subgrupo.nombre}
                      </td>
                      <td className="py-1 pl-2 text-right whitespace-nowrap">
                        {formatearMonto(subgrupo.aprobado)}
                      </td>
                    </tr>
                    {subgrupo.partidas.map((p) => (
                      <tr key={p.objetoGasto} className="text-gray-700">
                        <td className="py-1 pr-2 pl-3">
                          {p.objetoGasto} · {p.descripcion}
                        </td>
                        <td className="px-2 py-1">{p.fuente}</td>
                        <td className="py-1 pl-2 text-right whitespace-nowrap">
                          {formatearMonto(p.aprobado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
