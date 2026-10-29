// Umbrales de envejecimiento de los expedientes pendientes: los usan el Panel
// y scripts/resumen-hospital.ts, así que se definen en un solo lugar.
// Verde: menos de 7 días · Amarillo: 7 a 15 días · Rojo: más de 15 días.

export const DIAS_INICIO_AMARILLO = 7;
export const DIAS_FIN_AMARILLO = 15;

export type ColorAntiguedad = 'verde' | 'amarillo' | 'rojo';

export function colorAntiguedad(dias: number): ColorAntiguedad {
  if (dias < DIAS_INICIO_AMARILLO) return 'verde';
  if (dias <= DIAS_FIN_AMARILLO) return 'amarillo';
  return 'rojo';
}
