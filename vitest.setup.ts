import { obtenerUrlBaseTest } from './tests/helpers/url-base-test';

// Todo el código bajo test (src/lib/prisma.ts incluido) lee DATABASE_URL: se
// redirige a la base de pruebas antes de que se importe cualquier módulo.
process.env.DATABASE_URL = obtenerUrlBaseTest();
