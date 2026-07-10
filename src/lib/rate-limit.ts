import 'server-only';

const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

type Intento = { cantidad: number; expiraEn: number };

// Estado en memoria: alcanza para un solo proceso Node de una app de un solo usuario.
// Se reinicia si el servidor se reinicia (aceptable para este caso de uso).
const intentos = new Map<string, Intento>();

function limpiarExpirados(ahora: number) {
  for (const [clave, intento] of intentos) {
    if (intento.expiraEn <= ahora) intentos.delete(clave);
  }
}

/** Devuelve true si la clave (ej. IP) todavía puede intentar loguearse. */
export function puedeIntentarLogin(clave: string): boolean {
  const ahora = Date.now();
  limpiarExpirados(ahora);
  const intento = intentos.get(clave);
  return !intento || intento.expiraEn <= ahora || intento.cantidad < MAX_INTENTOS;
}

export function registrarIntentoFallido(clave: string): void {
  const ahora = Date.now();
  const intento = intentos.get(clave);
  if (!intento || intento.expiraEn <= ahora) {
    intentos.set(clave, { cantidad: 1, expiraEn: ahora + VENTANA_MS });
  } else {
    intento.cantidad += 1;
  }
}

export function limpiarIntentos(clave: string): void {
  intentos.delete(clave);
}

export function minutosRestantes(clave: string): number {
  const intento = intentos.get(clave);
  if (!intento) return 0;
  return Math.max(0, Math.ceil((intento.expiraEn - Date.now()) / 60000));
}
