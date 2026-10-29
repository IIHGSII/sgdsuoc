import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { editarExpediente } from '../src/lib/expedientes';
import { cambiarEstadoExpediente } from '../src/lib/estados';
import { listarSeguimientosAbiertos, registrarNovedad } from '../src/lib/seguimiento';
import { parseNumeroSuoc } from '../src/lib/busqueda';
import { formatearFecha, formatearFechaHora, hoyParaInputDate, localAUtc } from '../src/lib/tz';

// Comandos para que Claude (o el usuario) opere el SGD desde la notebook,
// usando las mismas funciones y validaciones que la web (nunca SQL directo).
// Usa DATABASE_URL: por defecto, la base de PRODUCCIÓN.
//
//   npm run sgd -- bandeja
//       Baja las fotos de los expedientes "Por procesar" a
//       <carpeta de trabajo>\Bandeja\<nro>-<año>\, las pasa por OCR (Tesseract,
//       local) y deja hoja-N.txt y texto.txt. No modifica la base.
//   npm run sgd -- ver 137/2026
//   npm run sgd -- completar 137/2026 --mesa 1162 --fecha-adm 2026-10-29T14:13
//       [--fecha-suoc 2026-10-29T14:13] --tipo "Circular" --servicio "Externo"
//       --asunto "..." [--simese ...] [--monto 1500000] [--via "..."]
//       Parte de los valores actuales: lo que no se indica, no cambia.
//       Al guardar, el expediente sale de la bandeja "Por procesar".
//   npm run sgd -- estado 137/2026 "Archivado" ["observaciones"]
//   npm run sgd -- seguir 137/2026 "DGGIES" "novedad" [--fecha 2026-10-29] [--cerrar]
//       Seguimiento fuera de la SUOC: la primera novedad lo abre; con --cerrar,
//       la novedad es el resultado final y lo cierra.
//   npm run sgd -- seguimientos
//       Lista los seguimientos abiertos, los más tiempo sin novedades primero.

const CARPETA_TRABAJO = process.env.SGD_CARPETA_TRABAJO ?? 'C:\\Users\\hgs_b\\Documents\\SUOC 28';
const TESSERACT = process.env.TESSERACT_PATH ?? 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
const TESSDATA = process.env.TESSDATA_DIR ?? path.join(process.env.LOCALAPPDATA ?? '', 'tessdata');

class ErrorDeUso extends Error {}

function leerOpciones(args: string[]): Record<string, string> {
  const opciones: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) throw new ErrorDeUso(`Argumento inesperado: ${args[i]}`);
    const valor = args[i + 1];
    if (valor === undefined || valor.startsWith('--')) {
      throw new ErrorDeUso(`Falta el valor de ${args[i]}`);
    }
    opciones[args[i].slice(2)] = valor;
    i++;
  }
  return opciones;
}

async function buscarExpediente(numero: string | undefined) {
  const n = numero ? parseNumeroSuoc(numero) : null;
  if (!n) throw new ErrorDeUso('Indicá el expediente como N/AAAA (ej. 137/2026).');
  const expediente = await prisma.expediente.findUnique({
    where: { nroSuoc_anioSuoc: { nroSuoc: n.nro, anioSuoc: n.anio } },
  });
  if (!expediente) throw new ErrorDeUso(`No existe el expediente ${n.nro}/${n.anio}.`);
  return expediente;
}

async function idPorNombre(
  catalogo: 'tipoDocumento' | 'servicio' | 'viaResolucion' | 'estado',
  nombre: string,
): Promise<number> {
  const delegados = {
    tipoDocumento: prisma.tipoDocumento,
    servicio: prisma.servicio,
    viaResolucion: prisma.viaResolucion,
    estado: prisma.estado,
  } as const;
  // Los cuatro catálogos tienen `nombre` único; el cast unifica sus tipos.
  const delegado = delegados[catalogo] as unknown as {
    findUnique(args: { where: { nombre: string } }): Promise<{ id: number } | null>;
    findMany(args: { select: { nombre: true } }): Promise<{ nombre: string }[]>;
  };
  const fila = await delegado.findUnique({ where: { nombre } });
  if (!fila) {
    const opciones = (await delegado.findMany({ select: { nombre: true } })).map((o) => o.nombre);
    throw new ErrorDeUso(`"${nombre}" no existe en ${catalogo}. Opciones: ${opciones.join(' | ')}`);
  }
  return fila.id;
}

async function bandeja() {
  const pendientes = await prisma.expediente.findMany({
    where: { porProcesar: true },
    orderBy: { fechaIngresoSuoc: 'asc' },
    include: { fotos: { orderBy: { orden: 'asc' }, include: { adjunto: true } } },
  });
  if (pendientes.length === 0) {
    console.log('La bandeja "Por procesar" está vacía.');
    return;
  }
  for (const exp of pendientes) {
    const carpeta = path.join(CARPETA_TRABAJO, 'Bandeja', `${exp.nroSuoc}-${exp.anioSuoc}`);
    mkdirSync(carpeta, { recursive: true });
    const textos: string[] = [];
    for (const foto of exp.fotos) {
      const imagen = path.join(carpeta, `hoja-${foto.orden}.jpg`);
      const texto = path.join(carpeta, `hoja-${foto.orden}.txt`);
      if (!existsSync(imagen)) writeFileSync(imagen, foto.adjunto.contenido);
      if (!existsSync(texto)) {
        const ocr = execFileSync(
          TESSERACT,
          ['--tessdata-dir', TESSDATA, imagen, 'stdout', '-l', 'spa'],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
        );
        writeFileSync(texto, ocr, 'utf8');
      }
      textos.push(`===== HOJA ${foto.orden} =====\n${readFileSync(texto, 'utf8').trim()}`);
    }
    writeFileSync(path.join(carpeta, 'texto.txt'), textos.join('\n\n') + '\n', 'utf8');
    console.log(
      `${exp.nroSuoc}/${exp.anioSuoc} — ingreso ${formatearFechaHora(exp.fechaIngresoSuoc)} — ` +
        `${exp.fotos.length} hoja(s) — ${path.join(carpeta, 'texto.txt')}`,
    );
  }
}

async function ver(numero: string | undefined) {
  const { id } = await buscarExpediente(numero);
  const e = await prisma.expediente.findUniqueOrThrow({
    where: { id },
    include: {
      tipoDocumento: true,
      servicioOrigen: true,
      estadoActual: true,
      viaResolucion: true,
      _count: { select: { fotos: true } },
      trazabilidad: {
        orderBy: { fechaCambio: 'asc' },
        include: { estadoAnterior: true, estadoNuevo: true },
      },
      salidas: { orderBy: { fecha: 'asc' }, include: { destino: true } },
      novedades: { orderBy: [{ fecha: 'asc' }, { id: 'asc' }] },
    },
  });
  const lineas = [
    `Expediente ${e.nroSuoc}/${e.anioSuoc}${e.porProcesar ? '  [POR PROCESAR]' : ''}`,
    `Mesa de entrada: ${e.nroMesaEntrada ?? '—'} · SIMESE: ${e.nroSimese ?? '—'}`,
    `Ingreso adm.: ${e.fechaIngresoAdm ? formatearFechaHora(e.fechaIngresoAdm) : '—'} · Ingreso SUOC: ${formatearFechaHora(e.fechaIngresoSuoc)}`,
    `Tipo: ${e.tipoDocumento?.nombre ?? '—'} · Servicio: ${e.servicioOrigen?.nombre ?? '—'}`,
    `Asunto: ${e.asunto ?? '—'}`,
    `Monto: ${e.montoEstimado?.toString() ?? '—'} · Vía: ${e.viaResolucion?.nombre ?? '—'}`,
    `Estado: ${e.estadoActual.nombre} · Fotos: ${e._count.fotos} · PDF: ${e.adjuntoId ? 'sí' : 'no'}`,
    'Trazabilidad:',
    ...e.trazabilidad.map(
      (t) =>
        `  ${formatearFechaHora(t.fechaCambio)} ${t.estadoAnterior ? `${t.estadoAnterior.nombre} → ` : 'Ingreso: '}${t.estadoNuevo.nombre}${t.observaciones ? ` (${t.observaciones})` : ''}`,
    ),
    'Salidas:',
    ...(e.salidas.length
      ? e.salidas.map(
          (s) =>
            `  ${formatearFecha(s.fecha)} ${s.tipo}${s.destino ? ` → ${s.destino.nombre}` : ''}${s.nroNota ? ` N° ${s.nroNota}` : ''}: ${s.descripcion}`,
        )
      : ['  (ninguna)']),
    `Seguimiento fuera de la SUOC: ${e.seguimiento ?? 'no'}`,
    ...e.novedades.map(
      (n) =>
        `  ${formatearFecha(n.fecha)} ${n.dondeEsta}: ${n.detalle}${n.cierre ? ' (cierre)' : ''}`,
    ),
  ];
  console.log(lineas.join('\n'));
}

async function seguir(numero: string | undefined, args: string[]) {
  const { id } = await buscarExpediente(numero);
  const [dondeEsta, detalle, ...resto] = args;
  if (!dondeEsta || !detalle) {
    throw new ErrorDeUso(
      'Uso: seguir N/AAAA "Dónde está" "novedad" [--fecha AAAA-MM-DD] [--cerrar]',
    );
  }
  const cerrar = resto.includes('--cerrar');
  const o = leerOpciones(resto.filter((a) => a !== '--cerrar'));
  const fecha = localAUtc(`${o.fecha ?? hoyParaInputDate()}T12:00`);
  await registrarNovedad(id, { fecha, dondeEsta, detalle }, { cerrar });
  await ver(numero);
}

async function seguimientos() {
  const filas = await listarSeguimientosAbiertos();
  if (!filas.length) return console.log('No hay seguimientos abiertos.');
  for (const f of filas) {
    console.log(
      `${f.nroSuoc}/${f.anioSuoc} · ${f.diasSinNovedad}d sin novedades · ${f.dondeEsta} · ${formatearFecha(f.fechaUltimaNovedad)}: ${f.ultimaNovedad}\n  ${f.asunto ?? '—'} (desde ${formatearFecha(f.desde)})`,
    );
  }
}

async function completar(numero: string | undefined, args: string[]) {
  const actual = await buscarExpediente(numero);
  const o = leerOpciones(args);

  const fechaAdm = o['fecha-adm'] ? localAUtc(o['fecha-adm']) : (actual.fechaIngresoAdm ?? null);
  const fechaSuoc = o['fecha-suoc'] ? localAUtc(o['fecha-suoc']) : actual.fechaIngresoSuoc;
  const nroMesaEntrada = o.mesa ?? actual.nroMesaEntrada;
  const asunto = o.asunto ?? actual.asunto;
  const tipoDocumentoId = o.tipo
    ? await idPorNombre('tipoDocumento', o.tipo)
    : actual.tipoDocumentoId;
  const servicioOrigenId = o.servicio
    ? await idPorNombre('servicio', o.servicio)
    : actual.servicioOrigenId;

  const faltan = [
    !nroMesaEntrada && '--mesa',
    !fechaAdm && '--fecha-adm',
    !tipoDocumentoId && '--tipo',
    !servicioOrigenId && '--servicio',
    !asunto && '--asunto',
  ].filter(Boolean);
  if (faltan.length) throw new ErrorDeUso(`Faltan datos obligatorios: ${faltan.join(', ')}`);
  if (fechaSuoc < fechaAdm!) {
    throw new ErrorDeUso(
      'El ingreso a la SUOC no puede ser anterior al ingreso al Depto. Administrativo (RN-4).',
    );
  }

  let montoEstimado = actual.montoEstimado?.toString() ?? null;
  if (o.monto !== undefined) {
    const monto = Number(o.monto);
    if (!Number.isFinite(monto) || monto < 0) throw new ErrorDeUso('El monto no es válido.');
    montoEstimado = monto.toFixed(2);
  }

  await editarExpediente(actual.id, {
    nroMesaEntrada: nroMesaEntrada!,
    nroSimese: o.simese ?? actual.nroSimese,
    fechaIngresoAdm: fechaAdm!,
    fechaIngresoSuoc: fechaSuoc,
    tipoDocumentoId: tipoDocumentoId!,
    servicioOrigenId: servicioOrigenId!,
    asunto: asunto!,
    montoEstimado,
    viaResolucionId: o.via ? await idPorNombre('viaResolucion', o.via) : actual.viaResolucionId,
  });
  await ver(numero);
}

async function estado(numero: string | undefined, nombreEstado: string | undefined, obs?: string) {
  const { id } = await buscarExpediente(numero);
  if (!nombreEstado) throw new ErrorDeUso('Indicá el estado nuevo (ej. "Archivado").');
  await cambiarEstadoExpediente(id, await idPorNombre('estado', nombreEstado), obs || null);
  await ver(numero);
}

async function main() {
  const [comando, numero, ...resto] = process.argv.slice(2);
  switch (comando) {
    case 'bandeja':
      return bandeja();
    case 'ver':
      return ver(numero);
    case 'completar':
      return completar(numero, resto);
    case 'estado':
      return estado(numero, resto[0], resto[1]);
    case 'seguir':
      return seguir(numero, resto);
    case 'seguimientos':
      return seguimientos();
    default:
      throw new ErrorDeUso(
        'Comandos: bandeja | ver N/AAAA | completar N/AAAA --... | estado N/AAAA "Estado" ["obs"] | seguir N/AAAA "Dónde" "novedad" [--cerrar] | seguimientos',
      );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? `ERROR: ${error.message}` : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
