import 'dotenv/config';

/**
 * URL de la base de pruebas (DATABASE_URL_TEST). Corta con error si no está
 * definida o si coincide con DATABASE_URL: los tests crean y borran datos, así
 * que nunca deben correr contra la base de producción.
 */
export function obtenerUrlBaseTest(): string {
  const urlTest = process.env.DATABASE_URL_TEST;
  if (!urlTest) {
    throw new Error(
      'Falta DATABASE_URL_TEST en .env: los tests solo corren contra una base de pruebas separada (ver README, sección Tests).',
    );
  }
  if (urlTest === process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL_TEST es igual a DATABASE_URL: los tests no pueden correr contra la base de producción.',
    );
  }
  return urlTest;
}
