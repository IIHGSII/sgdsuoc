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

  const { anio, grupos, total, reprogramaciones } = presupuesto;
  const conEjecucion = grupos
    .flatMap((g) => g.subgrupos.flatMap((s) => s.partidas))
    .filter((p) => p.ejecucion);

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
        {conEjecucion.map((p) => {
          const e = p.ejecucion!;
          const cifras = [
            { titulo: 'Aprobado', monto: p.aprobado },
            { titulo: 'Plan financiero', monto: e.planFinanciero },
            { titulo: 'Comprometido', monto: e.compromiso },
            { titulo: 'Saldo del plan', monto: e.saldoPlan },
            { titulo: 'Plan financiero menos aprobado', monto: e.diferenciaConAprobado },
          ];
          return (
            <section
              key={`${p.objetoGasto}-${p.fuente}`}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <h2 className="font-semibold text-gray-900">
                {p.objetoGasto} · {p.descripcion}
              </h2>
              <p className="text-xs text-gray-500">
                F.F. {p.fuente} · Informe de Débitos de Sistework al{' '}
                {e.fechaInforme.toLocaleDateString('es-PY', { timeZone: 'UTC' })}
              </p>

              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                {cifras.map((c) => (
                  <div key={c.titulo}>
                    <dt className="text-xs text-gray-500">{c.titulo}</dt>
                    <dd className="text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatearMonto(c.monto)}
                    </dd>
                  </div>
                ))}
              </dl>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-blue-700">
                  Ver los {e.debitos.length} CDP
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500">
                      <tr>
                        <th className="py-1 pr-2 font-medium">CDP</th>
                        <th className="px-2 py-1 font-medium">Concepto</th>
                        <th className="px-2 py-1 font-medium">Tipo</th>
                        <th className="px-2 py-1 text-right font-medium">Previsión</th>
                        <th className="py-1 pl-2 text-right font-medium">Compromiso</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {e.debitos.map((d) => (
                        <tr key={d.cdp} className="border-t border-gray-200 align-top">
                          <td className="py-1 pr-2">{d.cdp}</td>
                          <td className="min-w-52 px-2 py-1">
                            {d.concepto}
                            {d.codigoContratacion && (
                              <span className="block text-xs text-gray-500">
                                {d.codigoContratacion}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1">{d.tipo}</td>
                          <td className="px-2 py-1 text-right whitespace-nowrap">
                            {formatearMonto(d.prevision)}
                          </td>
                          <td className="py-1 pl-2 text-right whitespace-nowrap">
                            {formatearMonto(d.compromiso)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          );
        })}

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900">Reprogramaciones {anio}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">De</th>
                  <th className="px-2 py-1 font-medium">A</th>
                  <th className="px-2 py-1 font-medium">F.F.</th>
                  <th className="py-1 pl-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {reprogramaciones.map((r) => (
                  <tr key={r.id} className="border-t border-gray-200">
                    <td className="py-1 pr-2">{r.objetoOrigen}</td>
                    <td className="px-2 py-1">{r.objetoDestino}</td>
                    <td className="px-2 py-1">{r.fuente}</td>
                    <td className="py-1 pl-2 text-right whitespace-nowrap">
                      {formatearMonto(r.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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
                      <tr key={`${p.objetoGasto}-${p.fuente}`} className="text-gray-700">
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
