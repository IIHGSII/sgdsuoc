import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export const ZONA_HORARIA = 'America/Asuncion';

/**
 * Convierte el valor de un <input type="datetime-local"> (ej. "2026-07-10T14:30"),
 * interpretado como hora local de Paraguay, a un Date en UTC para guardar en la base.
 */
export function localAUtc(datetimeLocal: string): Date {
  return fromZonedTime(datetimeLocal, ZONA_HORARIA);
}

/** Año calendario en Paraguay de una fecha guardada en UTC (para año_suoc y el reinicio anual). */
export function anioEnParaguay(fecha: Date): number {
  return Number(formatInTimeZone(fecha, ZONA_HORARIA, 'yyyy'));
}

export function formatearFechaHora(fecha: Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, 'dd/MM/yyyy HH:mm');
}

export function formatearFecha(fecha: Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, 'dd/MM/yyyy');
}

/** Formatea una fecha para usar como valor de un <input type="datetime-local"> en hora de Paraguay. */
export function fechaParaInputLocal(fecha: Date): string {
  return formatInTimeZone(fecha, ZONA_HORARIA, "yyyy-MM-dd'T'HH:mm");
}

/** Valor por defecto para un <input type="datetime-local"> mostrando la hora actual de Paraguay. */
export function ahoraParaInputLocal(): string {
  return fechaParaInputLocal(new Date());
}

/** Valor por defecto para un <input type="date"> mostrando el día actual en Paraguay. */
export function hoyParaInputDate(): string {
  return formatInTimeZone(new Date(), ZONA_HORARIA, 'yyyy-MM-dd');
}
