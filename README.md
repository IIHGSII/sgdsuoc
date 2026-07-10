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
cp .env.example .env   # completar DATABASE_URL con una base MySQL local o de pruebas
npm run prisma:migrate # crea/actualiza las tablas según prisma/schema.prisma
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Ver `.env.example`. Se documentan ahí a medida que se van necesitando (login, sesión, etc.).

## Deploy en Hostinger

_(Se documenta paso a paso en la fase de deploy del proyecto.)_

## Estado del proyecto

En construcción por fases. Ver plan de fases acordado con el usuario.
