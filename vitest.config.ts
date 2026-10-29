import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Los tests comparten la base de pruebas (DATABASE_URL_TEST) y algunos
    // dependen de estado global de catálogos (ej. "el estado de menor orden");
    // correr los archivos en paralelo generaría condiciones de carrera entre ellos.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      'server-only': path.resolve(__dirname, './tests/helpers/server-only-stub.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
