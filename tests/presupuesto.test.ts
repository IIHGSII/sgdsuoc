import { describe, it, expect } from 'vitest';
import { agruparPartidas, obtenerPresupuesto } from '@/lib/presupuesto';

describe('Presupuesto aprobado', () => {
  it('agrupa por grupo y subgrupo y suma los montos', () => {
    const grupos = agruparPartidas([
      { objetoGasto: 342, fuente: 10, descripcion: 'B', aprobado: 20 },
      { objetoGasto: 111, fuente: 10, descripcion: 'A', aprobado: 5 },
      { objetoGasto: 341, fuente: 30, descripcion: 'C', aprobado: 10 },
    ]);
    expect(grupos.map((g) => [g.codigo, g.aprobado])).toEqual([
      [100, 5],
      [300, 30],
    ]);
    expect(grupos[1].subgrupos[0].codigo).toBe(340);
    expect(grupos[1].subgrupos[0].partidas.map((p) => p.objetoGasto)).toEqual([341, 342]);
  });

  it('los rubros cargados para 2026 coinciden con los subtotales de la planilla', async () => {
    const presupuesto = await obtenerPresupuesto();
    expect(presupuesto?.anio).toBe(2026);
    expect(presupuesto?.total).toBe(2475198397);
    expect(presupuesto?.grupos.map((g) => g.aprobado)).toEqual([1147548516, 1327649881]);
  });

  it('el rubro 245 coincide con los totales del Informe de Débitos de Sistework', async () => {
    const presupuesto = await obtenerPresupuesto();
    const partidas = presupuesto!.grupos.flatMap((g) => g.subgrupos.flatMap((s) => s.partidas));
    const ejecucion = partidas.find((p) => p.objetoGasto === 245)?.ejecucion;
    expect(ejecucion?.planFinanciero).toBe(884236454);
    expect(ejecucion?.prevision).toBe(884236454);
    expect(ejecucion?.compromiso).toBe(884236454);
    expect(ejecucion?.saldoPlan).toBe(0);
    expect(ejecucion?.diferenciaConAprobado).toBe(-263312062);
    expect(ejecucion?.debitos).toHaveLength(4);
  });

  it('el rubro 321 coincide con los totales del Informe de Débitos de Sistework', async () => {
    const presupuesto = await obtenerPresupuesto();
    const partidas = presupuesto!.grupos.flatMap((g) => g.subgrupos.flatMap((s) => s.partidas));
    const ejecucion = partidas.find((p) => p.objetoGasto === 321)?.ejecucion;
    expect(ejecucion?.planFinanciero).toBe(58400000);
    expect(ejecucion?.compromiso).toBe(58400000);
    expect(ejecucion?.saldoPlan).toBe(0);
    expect(ejecucion?.diferenciaConAprobado).toBe(-100000000);
    expect(ejecucion?.debitos).toHaveLength(1);
  });

  it('el rubro 331 coincide con los totales del Informe de Débitos de Sistework', async () => {
    const presupuesto = await obtenerPresupuesto();
    const partidas = presupuesto!.grupos.flatMap((g) => g.subgrupos.flatMap((s) => s.partidas));
    const ejecucion = partidas.find((p) => p.objetoGasto === 331)?.ejecucion;
    expect(ejecucion?.planFinanciero).toBe(206637826);
    expect(ejecucion?.compromiso).toBe(150755571);
    expect(ejecucion?.saldoPlan).toBe(55882255);
    expect(ejecucion?.diferenciaConAprobado).toBe(200000000);
    expect(ejecucion?.debitos).toHaveLength(8);
  });

  it('el rubro 341 coincide por fuente con los totales del Informe de Débitos de Sistework', async () => {
    const presupuesto = await obtenerPresupuesto();
    const partidas = presupuesto!.grupos.flatMap((g) => g.subgrupos.flatMap((s) => s.partidas));
    const ff10 = partidas.find((p) => p.objetoGasto === 341 && p.fuente === 10);
    expect(ff10?.aprobado).toBe(0);
    expect(ff10?.ejecucion?.planFinanciero).toBe(65462977);
    expect(ff10?.ejecucion?.compromiso).toBe(2883500);
    expect(ff10?.ejecucion?.saldoPlan).toBe(62579477);
    expect(ff10?.ejecucion?.diferenciaConAprobado).toBe(65462977);
    expect(ff10?.ejecucion?.debitos).toHaveLength(1);

    const ff30 = partidas.find((p) => p.objetoGasto === 341 && p.fuente === 30);
    expect(ff30?.ejecucion?.planFinanciero).toBe(228700000);
    expect(ff30?.ejecucion?.compromiso).toBe(222685000);
    expect(ff30?.ejecucion?.saldoPlan).toBe(6015000);
    expect(ff30?.ejecucion?.diferenciaConAprobado).toBe(100000000);
    expect(ff30?.ejecucion?.debitos).toHaveLength(23);
  });

  it('las reprogramaciones se compensan y los totales coinciden con los seis informes', async () => {
    const presupuesto = await obtenerPresupuesto();
    const partidas = presupuesto!.grupos.flatMap((g) => g.subgrupos.flatMap((s) => s.partidas));
    expect(partidas).toHaveLength(7);
    const sumar = (f: (e: NonNullable<(typeof partidas)[number]['ejecucion']>) => number) =>
      partidas.reduce((suma, p) => suma + f(p.ejecucion!), 0);
    expect(sumar((e) => e.planFinanciero)).toBe(2475198397);
    expect(sumar((e) => e.compromiso)).toBe(2287602450);
    expect(sumar((e) => e.saldoPlan)).toBe(187595947);
    expect(sumar((e) => e.diferenciaConAprobado)).toBe(0);
    const p342 = partidas.find((p) => p.objetoGasto === 342)?.ejecucion;
    expect(p342?.planFinanciero).toBe(59258000);
    expect(p342?.saldoPlan).toBe(0);
    expect(p342?.diferenciaConAprobado).toBe(-2150915);
  });

  it('las reprogramaciones explican la diferencia entre plan y aprobado de cada rubro', async () => {
    const presupuesto = await obtenerPresupuesto();
    const partidas = presupuesto!.grupos.flatMap((g) => g.subgrupos.flatMap((s) => s.partidas));
    expect(presupuesto!.reprogramaciones).toHaveLength(4);
    for (const p of partidas) {
      const neto = presupuesto!.reprogramaciones
        .filter((r) => r.fuente === p.fuente)
        .reduce(
          (suma, r) =>
            suma +
            (r.objetoDestino === p.objetoGasto ? r.monto : 0) -
            (r.objetoOrigen === p.objetoGasto ? r.monto : 0),
          0,
        );
      expect(neto).toBe(p.ejecucion?.diferenciaConAprobado);
    }
  });

  it('el rubro 311 coincide con los totales del Informe de Débitos de Sistework', async () => {
    const presupuesto = await obtenerPresupuesto();
    const partidas = presupuesto!.grupos.flatMap((g) => g.subgrupos.flatMap((s) => s.partidas));
    const ejecucion = partidas.find((p) => p.objetoGasto === 311)?.ejecucion;
    expect(ejecucion?.planFinanciero).toBe(972503140);
    expect(ejecucion?.prevision).toBe(909383925);
    expect(ejecucion?.compromiso).toBe(909383925);
    expect(ejecucion?.saldoPlan).toBe(63119215);
    expect(ejecucion?.diferenciaConAprobado).toBe(0);
    expect(ejecucion?.debitos).toHaveLength(31);
    const porTipo = (tipo: string) =>
      ejecucion?.debitos.filter((d) => d.tipo === tipo).reduce((s, d) => s + d.compromiso, 0);
    expect(porTipo('Convenio Marco')).toBe(414120000);
    expect(porTipo('Declaración jurada')).toBe(382210000);
  });
});
