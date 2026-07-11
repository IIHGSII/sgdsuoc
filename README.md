# SGD SUOC — Sistema de Gestión Documental

Sistema de Gestión Documental para la Sub Unidad Operativa de Contrataciones (SUOC) del
Hospital General de Luque, Paraguay. Uso personal de un solo usuario (el encargado de la SUOC).

Ver [`docs/master-prompt-sgd-v2.md`](docs/master-prompt-sgd-v2.md) para el detalle completo del
alcance, modelo de datos y reglas de negocio.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM + MySQL
- Deploy: Hostinger (Cloud Startup, "Deploy Web App") conectado a este repositorio de GitHub

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar DATABASE_URL con la base MySQL de Hostinger (o una de pruebas)
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Migraciones (sin shadow database)

El usuario de MySQL de Hostinger no tiene permiso para crear bases de datos, por lo que
`prisma migrate dev` no funciona (necesita crear una "shadow database" temporal). Además,
`npm run build` corre `prisma migrate deploy` automáticamente antes de compilar (así se
aplican solas en cada deploy, sin necesitar SSH). El flujo para crear una migración nueva es:

```bash
# 1. Editar prisma/schema.prisma con el cambio deseado

# 2. Generar el SQL de la migración a partir del schema
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > /tmp/migration.sql
# (para cambios incrementales, usar --from-migrations prisma/migrations en vez de --from-empty)

# 3. Crear la carpeta de la migración y pegar el SQL generado
mkdir prisma/migrations/$(date +%Y%m%d%H%M%S)_nombre_del_cambio
# pegar el contenido de /tmp/migration.sql en migration.sql dentro de esa carpeta

# 4. Aplicarla a la base real
npm run prisma:migrate:deploy
```

## Datos de catálogos (seed)

`prisma/seed.ts` carga Estado/TipoDocumento/Servicio desde `data/datos_sgd.json` (el export
del sistema anterior, no versionado por contener datos reales) más un par de Destino de
ejemplo. Es idempotente (usa upsert por nombre):

```bash
npm run db:seed
```

## Importación de datos del sistema anterior

`scripts/import-datos.ts` lee `data/datos_sgd.json` (mismo archivo que el seed) e importa
`contrataciones.documento` -> Expediente y `contrataciones.trazabilidad`, ignorando el resto
de los modelos del export (procesos licitatorios, contratos, etc.). Requiere que los catálogos
ya existan (correr `npm run db:seed` primero). Es idempotente:

```bash
npm run import
```

## Tests

Los tests (Vitest) corren contra la misma base real de Hostinger — no hay una base de datos
de test separada. Usan catálogos con nombres `TEST_...` y años lejanos (2077+) para no
mezclarse con datos reales, y limpian todo lo que crean en `afterAll`:

```bash
npm run test
```

Cubren RN-1 (numeración automática, reinicio anual, concurrencia), RN-2 (transaccionalidad,
bloqueo en estado final) y el importador (con un fixture chico en formato dumpdata).

## Variables de entorno

Ver `.env.example`. Se documentan ahí a medida que se van necesitando (login, sesión, etc.).

## Deploy en Hostinger

1. En hPanel, conectar este repositorio de GitHub (`IIHGSII/sgdsuoc`, rama `main`) a la función
   **"Deploy Web App"** del plan Cloud Startup.
2. Configurar las variables de entorno de producción (mismas claves que `.env.example`):
   `DATABASE_URL`, `SESSION_SECRET`, `TZ`.
3. Comando de build: `npm run build` (ya incluye `prisma migrate deploy`). Comando de inicio:
   `npm start`.
4. Cada deploy aplica automáticamente las migraciones pendientes — no hace falta SSH.
5. El seed de catálogos y la importación de datos del sistema anterior (`npm run db:seed`,
   `npm run import`) se corren una sola vez desde una máquina local con acceso a
   `data/datos_sgd.json`, apuntando `DATABASE_URL` a la base de producción (así se hizo
   durante el desarrollo).

## Restaurar un respaldo

El botón de respaldo en Administración descarga un JSON con catálogos, expedientes, salidas,
trazabilidad y adjuntos (sin usuarios). No hay una pantalla de restauración automática; para
restaurar, cargar los datos manualmente contra la base (por ejemplo con un script chico que
lea el JSON y haga upsert por los mismos campos que usa `scripts/import-datos.ts`), o pedir
soporte para restaurarlo si es necesario.

## Estado del proyecto

En construcción por fases. Ver plan de fases acordado con el usuario.
