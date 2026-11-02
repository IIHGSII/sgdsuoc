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
});
