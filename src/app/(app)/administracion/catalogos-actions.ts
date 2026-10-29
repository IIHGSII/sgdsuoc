'use server';

import { redirect } from 'next/navigation';
import { Prisma } from '@/generated/prisma/client';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

type NombreCatalogo = 'tipoDocumento' | 'servicio' | 'destino';
const CATALOGOS: NombreCatalogo[] = ['tipoDocumento', 'servicio', 'destino'];

function esCatalogoValido(valor: string): valor is NombreCatalogo {
  return CATALOGOS.includes(valor as NombreCatalogo);
}

function esErrorRestriccionUnica(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function esErrorClaveForanea(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2003' || error.code === 'P2014')
  );
}

function volver(mensaje?: string, tipo: 'error' | 'ok' = 'error'): never {
  const parametro = tipo === 'error' ? 'error' : 'ok';
  redirect(
    mensaje ? `/administracion?${parametro}=${encodeURIComponent(mensaje)}` : '/administracion',
  );
}

async function crearEnCatalogo(catalogo: NombreCatalogo, nombre: string) {
  switch (catalogo) {
    case 'tipoDocumento':
      return prisma.tipoDocumento.create({ data: { nombre } });
    case 'servicio':
      return prisma.servicio.create({ data: { nombre } });
    case 'destino':
      return prisma.destino.create({ data: { nombre } });
  }
}

async function editarEnCatalogo(catalogo: NombreCatalogo, id: number, nombre: string) {
  switch (catalogo) {
    case 'tipoDocumento':
      return prisma.tipoDocumento.update({ where: { id }, data: { nombre } });
    case 'servicio':
      return prisma.servicio.update({ where: { id }, data: { nombre } });
    case 'destino':
      return prisma.destino.update({ where: { id }, data: { nombre } });
  }
}

async function eliminarDeCatalogo(catalogo: NombreCatalogo, id: number) {
  switch (catalogo) {
    case 'tipoDocumento':
      return prisma.tipoDocumento.delete({ where: { id } });
    case 'servicio':
      return prisma.servicio.delete({ where: { id } });
    case 'destino':
      return prisma.destino.delete({ where: { id } });
  }
}

export async function crearCatalogoAction(formData: FormData) {
  await verifySession();

  const catalogo = String(formData.get('catalogo') ?? '');
  const nombre = String(formData.get('nombre') ?? '').trim();

  if (!esCatalogoValido(catalogo)) volver('Catálogo inválido.');
  if (!nombre) volver('Ingresá un nombre.');

  try {
    await crearEnCatalogo(catalogo, nombre);
  } catch (error) {
    if (esErrorRestriccionUnica(error)) volver('Ya existe un registro con ese nombre.');
    throw error;
  }

  volver();
}

export async function editarCatalogoAction(formData: FormData) {
  await verifySession();

  const catalogo = String(formData.get('catalogo') ?? '');
  const id = Number(formData.get('id'));
  const nombre = String(formData.get('nombre') ?? '').trim();

  if (!esCatalogoValido(catalogo) || !Number.isInteger(id)) volver('Datos inválidos.');
  if (!nombre) volver('Ingresá un nombre.');

  try {
    await editarEnCatalogo(catalogo, id, nombre);
  } catch (error) {
    if (esErrorRestriccionUnica(error)) volver('Ya existe un registro con ese nombre.');
    throw error;
  }

  volver();
}

export async function eliminarCatalogoAction(formData: FormData) {
  await verifySession();

  const catalogo = String(formData.get('catalogo') ?? '');
  const id = Number(formData.get('id'));

  if (!esCatalogoValido(catalogo) || !Number.isInteger(id)) volver('Datos inválidos.');

  // La base no lo impide (la vía solo pierde su destino sugerido), pero sería
  // perder ese dato sin aviso: se pide cambiar la vía primero.
  if (catalogo === 'destino') {
    const vias = await prisma.viaResolucion.count({ where: { destinoSugeridoId: id } });
    if (vias > 0) {
      volver(
        'No se puede eliminar: hay vías de resolución que lo tienen como destino sugerido. Cambialas primero.',
      );
    }
  }

  try {
    await eliminarDeCatalogo(catalogo, id);
  } catch (error) {
    if (esErrorClaveForanea(error)) {
      volver('No se puede eliminar: hay expedientes o salidas que usan este registro.');
    }
    throw error;
  }

  volver();
}

// --- Estado: mismo patrón pero con orden y esFinal ---

export async function crearEstadoAction(formData: FormData) {
  await verifySession();

  const nombre = String(formData.get('nombre') ?? '').trim();
  const orden = Number(formData.get('orden'));
  const esFinal = formData.get('esFinal') === 'on';

  if (!nombre) volver('Ingresá un nombre.');
  if (!Number.isInteger(orden)) volver('El orden debe ser un número entero.');

  try {
    await prisma.estado.create({ data: { nombre, orden, esFinal } });
  } catch (error) {
    if (esErrorRestriccionUnica(error)) volver('Ya existe un estado con ese nombre.');
    throw error;
  }

  volver();
}

export async function editarEstadoAction(formData: FormData) {
  await verifySession();

  const id = Number(formData.get('id'));
  const nombre = String(formData.get('nombre') ?? '').trim();
  const orden = Number(formData.get('orden'));
  const esFinal = formData.get('esFinal') === 'on';

  if (!Number.isInteger(id)) volver('Datos inválidos.');
  if (!nombre) volver('Ingresá un nombre.');
  if (!Number.isInteger(orden)) volver('El orden debe ser un número entero.');

  try {
    await prisma.estado.update({ where: { id }, data: { nombre, orden, esFinal } });
  } catch (error) {
    if (esErrorRestriccionUnica(error)) volver('Ya existe un estado con ese nombre.');
    throw error;
  }

  volver();
}

export async function eliminarEstadoAction(formData: FormData) {
  await verifySession();

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) volver('Datos inválidos.');

  try {
    await prisma.estado.delete({ where: { id } });
  } catch (error) {
    if (esErrorClaveForanea(error)) {
      volver('No se puede eliminar: hay expedientes o trazabilidad que usan este estado.');
    }
    throw error;
  }

  volver();
}

// --- Vía de resolución: nombre + tipo de salida y destino sugeridos (opcionales) ---

function leerTipoSalidaSugerido(formData: FormData): 'NOTA' | 'PORTAL' | 'OTRO' | null {
  const valor = String(formData.get('tipoSalidaSugerido') ?? '');
  return valor === 'NOTA' || valor === 'PORTAL' || valor === 'OTRO' ? valor : null;
}

function leerDestinoSugeridoId(formData: FormData): number | null {
  const valor = String(formData.get('destinoSugeridoId') ?? '');
  const id = Number(valor);
  return valor && Number.isInteger(id) && id > 0 ? id : null;
}

export async function crearViaResolucionAction(formData: FormData) {
  await verifySession();

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) volver('Ingresá un nombre.');

  try {
    await prisma.viaResolucion.create({
      data: {
        nombre,
        tipoSalidaSugerido: leerTipoSalidaSugerido(formData),
        destinoSugeridoId: leerDestinoSugeridoId(formData),
      },
    });
  } catch (error) {
    if (esErrorRestriccionUnica(error)) volver('Ya existe una vía de resolución con ese nombre.');
    throw error;
  }

  volver();
}

export async function editarViaResolucionAction(formData: FormData) {
  await verifySession();

  const id = Number(formData.get('id'));
  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!Number.isInteger(id)) volver('Datos inválidos.');
  if (!nombre) volver('Ingresá un nombre.');

  try {
    await prisma.viaResolucion.update({
      where: { id },
      data: {
        nombre,
        tipoSalidaSugerido: leerTipoSalidaSugerido(formData),
        destinoSugeridoId: leerDestinoSugeridoId(formData),
      },
    });
  } catch (error) {
    if (esErrorRestriccionUnica(error)) volver('Ya existe una vía de resolución con ese nombre.');
    throw error;
  }

  volver();
}

export async function eliminarViaResolucionAction(formData: FormData) {
  await verifySession();

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) volver('Datos inválidos.');

  try {
    await prisma.viaResolucion.delete({ where: { id } });
  } catch (error) {
    if (esErrorClaveForanea(error)) {
      volver('No se puede eliminar: hay expedientes que usan esta vía de resolución.');
    }
    throw error;
  }

  volver();
}
