import type { PrismaClient } from '@/generated/prisma/client';

// Lógica del importador del export de Django del sistema anterior (dumpdata:
// array de {model, pk, fields}), separada del script de CLI (scripts/import-datos.ts)
// para poder testearla con un fixture chico sin depender del archivo real.
// Ver ese script para el detalle de qué modelos se importan y por qué.

export type RegistroDumpdata = { model: string; pk: number; fields: Record<string, unknown> };

export type ResumenImportacion = {
  documentosCreados: number;
  documentosActualizados: number;
  documentosOmitidos: number;
  trazabilidadCreada: number;
  trazabilidadOmitida: number;
  avisos: string[];
  catalogosFaltantes: string[];
};

/** Parsea "N/AÑO" (nro_exp_suoc del sistema viejo) y devuelve solo la N. */
export function parseNroSuoc(nroExpSuoc: string): number {
  const [nro] = String(nroExpSuoc).split('/');
  return Number(nro);
}

export async function importarRegistros(
  registros: RegistroDumpdata[],
  prisma: PrismaClient,
): Promise<ResumenImportacion> {
  const porModelo = (modelo: string) => registros.filter((r) => r.model === modelo);
  const avisos: string[] = [];

  // --- 1. Catálogos: resolver pk vieja -> id nuevo, buscando por nombre ---
  // (ya deberían existir, cargados por prisma/seed.ts desde el mismo archivo)

  const estadoIdPorPk = new Map<number, number>();
  const catalogosFaltantes: string[] = [];

  for (const e of porModelo('contrataciones.estado')) {
    const nombre = String(e.fields.nombre);
    const estado = await prisma.estado.findUnique({ where: { nombre } });
    if (!estado) {
      catalogosFaltantes.push(`Estado "${nombre}"`);
      continue;
    }
    estadoIdPorPk.set(e.pk, estado.id);
  }

  const tipoIdPorPk = new Map<number, number>();
  for (const t of porModelo('contrataciones.tipodocumento')) {
    const nombre = String(t.fields.nombre);
    const tipo = await prisma.tipoDocumento.findUnique({ where: { nombre } });
    if (!tipo) {
      catalogosFaltantes.push(`Tipo de documento "${nombre}"`);
      continue;
    }
    tipoIdPorPk.set(t.pk, tipo.id);
  }

  const servicioIdPorPk = new Map<number, number>();
  for (const s of porModelo('contrataciones.servicio')) {
    const nombre = String(s.fields.nombre);
    const servicio = await prisma.servicio.findUnique({ where: { nombre } });
    if (!servicio) {
      catalogosFaltantes.push(`Servicio "${nombre}"`);
      continue;
    }
    servicioIdPorPk.set(s.pk, servicio.id);
  }

  if (catalogosFaltantes.length > 0) {
    return {
      documentosCreados: 0,
      documentosActualizados: 0,
      documentosOmitidos: 0,
      trazabilidadCreada: 0,
      trazabilidadOmitida: 0,
      avisos: [],
      catalogosFaltantes,
    };
  }

  // --- 2. Documentos -> Expediente ---

  const expedienteIdPorDocumentoPk = new Map<number, number>();
  let documentosCreados = 0;
  let documentosActualizados = 0;
  let documentosOmitidos = 0;

  for (const d of porModelo('contrataciones.documento')) {
    const f = d.fields;

    const nroSuoc = parseNroSuoc(f.nro_exp_suoc as string);
    const anioSuoc = Number(f['año_ingreso']);

    if (!Number.isInteger(nroSuoc) || !Number.isInteger(anioSuoc)) {
      avisos.push(`documento pk=${d.pk}: nro_exp_suoc/año_ingreso inválidos, se omite.`);
      documentosOmitidos++;
      continue;
    }

    const [, anioEnNro] = String(f.nro_exp_suoc).split('/');
    if (anioEnNro && Number(anioEnNro) !== anioSuoc) {
      avisos.push(
        `documento pk=${d.pk}: el año en nro_exp_suoc ("${f.nro_exp_suoc}") no coincide con año_ingreso (${anioSuoc}); se usó año_ingreso.`,
      );
    }

    const tipoDocumentoId = tipoIdPorPk.get(f.tipo_documento as number);
    const servicioOrigenId = servicioIdPorPk.get(f.servicio as number);
    const estadoActualId = estadoIdPorPk.get(f.estado_actual as number);

    if (!tipoDocumentoId || !servicioOrigenId || !estadoActualId) {
      avisos.push(`documento pk=${d.pk}: catálogo referenciado no encontrado, se omite.`);
      documentosOmitidos++;
      continue;
    }

    const yaExistia = await prisma.expediente.findUnique({
      where: { nroSuoc_anioSuoc: { nroSuoc, anioSuoc } },
      select: { id: true },
    });

    const datos = {
      nroMesaEntrada: String(f.nro_exp_adm ?? ''),
      nroSuoc,
      anioSuoc,
      nroSimese: f.nro_documento ? String(f.nro_documento) : null,
      fechaIngresoAdm: new Date(f.fecha_ingreso_adm as string),
      fechaIngresoSuoc: new Date(f.fecha_ingreso_suoc as string),
      tipoDocumentoId,
      servicioOrigenId,
      asunto: String(f.objeto_o_resumen ?? ''),
      montoEstimado: f.monto_estimado != null ? String(f.monto_estimado) : null,
      estadoActualId,
      fechaUltimaActualizacion: new Date(f.fecha_ultima_act as string),
    };

    const expediente = await prisma.expediente.upsert({
      where: { nroSuoc_anioSuoc: { nroSuoc, anioSuoc } },
      create: datos,
      update: datos,
    });

    expedienteIdPorDocumentoPk.set(d.pk, expediente.id);
    if (yaExistia) documentosActualizados++;
    else documentosCreados++;
  }

  // --- 3. Trazabilidad ---

  let trazabilidadCreada = 0;
  let trazabilidadOmitida = 0;

  for (const t of porModelo('contrataciones.trazabilidad')) {
    const f = t.fields;
    const expedienteId = expedienteIdPorDocumentoPk.get(f.expediente as number);
    if (!expedienteId) {
      avisos.push(`trazabilidad pk=${t.pk}: expediente pk=${f.expediente} no importado, se omite.`);
      trazabilidadOmitida++;
      continue;
    }

    const estadoNuevoId = estadoIdPorPk.get(f.estado_nuevo as number);
    if (!estadoNuevoId) {
      avisos.push(
        `trazabilidad pk=${t.pk}: estado_nuevo pk=${f.estado_nuevo} no encontrado, se omite.`,
      );
      trazabilidadOmitida++;
      continue;
    }
    const estadoAnteriorId =
      f.estado_anterior != null ? (estadoIdPorPk.get(f.estado_anterior as number) ?? null) : null;
    const fechaCambio = new Date(f.fecha_cambio as string);

    const existente = await prisma.trazabilidad.findFirst({
      where: { expedienteId, estadoNuevoId, fechaCambio },
      select: { id: true },
    });
    if (existente) {
      trazabilidadOmitida++;
      continue;
    }

    await prisma.trazabilidad.create({
      data: {
        expedienteId,
        estadoAnteriorId,
        estadoNuevoId,
        fechaCambio,
        observaciones: f.observaciones ? String(f.observaciones) : null,
      },
    });
    trazabilidadCreada++;
  }

  return {
    documentosCreados,
    documentosActualizados,
    documentosOmitidos,
    trazabilidadCreada,
    trazabilidadOmitida,
    avisos,
    catalogosFaltantes: [],
  };
}
