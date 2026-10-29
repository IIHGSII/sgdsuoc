import 'dotenv/config';
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';

// Script de uso local para crear o resetear la contraseña del único usuario del sistema.
// No hay pantalla de alta de usuario: se conecta directo a la base (igual que las
// migraciones), sin necesitar SSH al servidor.
//
// Uso: npm run create-user -- --usuario admin [--force]
// La contraseña se pide por teclado sin mostrarla (no va en el comando, para
// que no quede guardada en el historial de la terminal).

function leerArgumento(nombre: string): string | undefined {
  const bandera = `--${nombre}`;
  const index = process.argv.indexOf(bandera);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function preguntarOculto(pregunta: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  process.stdout.write(pregunta);
  // Silencia el eco: lo que se tipea no aparece en pantalla.
  (rl as unknown as { _writeToOutput: (texto: string) => void })._writeToOutput = () => {};
  const respuesta = await new Promise<string>((resolve) => rl.question('', resolve));
  rl.close();
  process.stdout.write('\n');
  return respuesta;
}

async function main() {
  const usuario = leerArgumento('usuario');
  const force = process.argv.includes('--force');

  if (!usuario) {
    console.error('Uso: npm run create-user -- --usuario <usuario> [--force]');
    process.exit(1);
  }

  const password = await preguntarOculto('Contraseña: ');
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }
  if ((await preguntarOculto('Repetir contraseña: ')) !== password) {
    console.error('Las contraseñas no coinciden.');
    process.exit(1);
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  const existentes = await prisma.usuario.findMany();
  const passwordHash = await bcrypt.hash(password, 12);

  if (existentes.length === 0) {
    await prisma.usuario.create({ data: { usuario, passwordHash } });
    console.log(`Usuario "${usuario}" creado.`);
  } else if (existentes.length === 1 && existentes[0].usuario === usuario) {
    await prisma.usuario.update({
      where: { id: existentes[0].id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    console.log(`Contraseña de "${usuario}" actualizada. Sesiones activas invalidadas.`);
  } else if (existentes.length === 1 && !force) {
    console.error(
      `Ya existe el usuario "${existentes[0].usuario}". Este sistema admite un solo usuario.\n` +
        `Si querés reemplazarlo por "${usuario}", volvé a correr el comando agregando --force.`,
    );
    process.exit(1);
  } else {
    await prisma.usuario.deleteMany();
    await prisma.usuario.create({ data: { usuario, passwordHash } });
    console.log(`Usuario reemplazado. Ahora el único usuario es "${usuario}".`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
