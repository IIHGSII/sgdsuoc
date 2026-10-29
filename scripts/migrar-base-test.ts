import { execSync } from 'node:child_process';
import { obtenerUrlBaseTest } from '../tests/helpers/url-base-test';

// Aplica las migraciones a la base de pruebas (DATABASE_URL_TEST), igual que
// hace el build con la de producción. Correrlo una vez al crear la base de
// pruebas y después de agregar migraciones nuevas: npm run test:migrate

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: obtenerUrlBaseTest() },
});
