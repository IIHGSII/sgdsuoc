// Stub para los tests: el paquete real 'server-only' lanza un error si se
// importa fuera del pipeline de build de Next.js (es justamente para eso
// que existe), pero nuestros módulos en src/lib SÍ necesitan importarse
// desde Vitest. Se alias-ea 'server-only' -> este archivo vacío solo en
// vitest.config.ts, no afecta el build real de la app.
export {};
