import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from './helpers/test-prisma';
import { crearExpediente } from '@/lib/expedientes';
import { cambiarEstadoExpediente, EstadoFinalError } from '@/lib/estados';

// RN-2: el cambio de estado registra trazabilidad y actualiza estadoActual
// en la misma transacción, y un expediente en estado final no admite más
// cambios.

describe('RN-2: cambio de estado', () => {
  let tipoDocumentoId: number;
  let servicioId: number;
  let estadoInicialId: number;
  let estadoSiguienteId: number;
  let estadoFinalId: number;
  const expedienteIds: number[] = [];

  beforeAll(async () => {
    const tipo = await prisma.tipoDocumento.create({ data: { nombre: 'TEST_RN2_tipo' } });
    tipoDocumentoId = tipo.id;
    const servicio = await prisma.servicio.create({ data: { nombre: 'TEST_RN2_servicio' } });
    servicioId = servicio.id;
    const inicial = await prisma.estado.create({
      data: { nombre: 'TEST_RN2_inicial', orden: -900, esFinal: false },
    });
    estadoInicialId = inicial.id;
    const siguiente = await prisma.estado.create({
      data: { nombre: 'TEST_RN2_siguiente', orden: -899, esFinal: false },
    });
    estadoSiguienteId = siguiente.id;
    const final = await prisma.estado.create({
      data: { nombre: 'TEST_RN2_final', orden: -898, esFinal: true },
    });
    estadoFinalId = final.id;
  });

  afterAll(async () => {
    await prisma.trazabilidad.deleteMany({ where: { expedienteId: { in: expedienteIds } } });
    await prisma.expediente.deleteMany({ where: { id: { in: expedienteIds } } });
    await prisma.tipoDocumento.delete({ where: { id: tipoDocumentoId } });
    await prisma.servicio.delete({ where: { id: servicioId } });
    await prisma.estado.deleteMany({
      where: { id: { in: [estadoInicialId, estadoSiguienteId, estadoFinalId] } },
    });
  });

  async function crearExpedienteDePrueba(anio: number) {
    const fecha = new Date(`${anio}-01-01T10:00:00Z`);
    const e = await crearExpediente({
      nroMesaEntrada: 'test-mesa',
      fechaIngresoAdm: fecha,
      fechaIngresoSuoc: fecha,
      tipoDocumentoId,
      servicioOrigenId: servicioId,
      asunto: 'Prueba RN-2',
    });
    expedienteIds.push(e.id);
    return e;
  }

  it('cambia el estado y registra la trazabilidad en la misma operación', async () => {
    const e = await crearExpedienteDePrueba(2083);
    expect(e.estadoActualId).toBe(estadoInicialId);

    await cambiarEstadoExpediente(e.id, estadoSiguienteId, 'Pasa a revisión');

    const actualizado = await prisma.expediente.findUniqueOrThrow({ where: { id: e.id } });
    expect(actualizado.estadoActualId).toBe(estadoSiguienteId);

    // Se ordena por id (orden de inserción), no por fechaCambio: el ingreso
    // inicial usa la fecha (lejana, de prueba) del expediente, mientras que
    // este cambio de estado usa la fecha real "now", que puede quedar antes.
    const trazas = await prisma.trazabilidad.findMany({
      where: { expedienteId: e.id },
      orderBy: { id: 'asc' },
    });
    expect(trazas).toHaveLength(2);
    expect(trazas[1].estadoAnteriorId).toBe(estadoInicialId);
    expect(trazas[1].estadoNuevoId).toBe(estadoSiguienteId);
    expect(trazas[1].observaciones).toBe('Pasa a revisión');
  });

  it('bloquea el cambio si el expediente ya está en un estado final', async () => {
    const e = await crearExpedienteDePrueba(2084);
    await cambiarEstadoExpediente(e.id, estadoFinalId);

    await expect(cambiarEstadoExpediente(e.id, estadoSiguienteId)).rejects.toBeInstanceOf(
      EstadoFinalError,
    );

    // nada cambió: sigue en el estado final y sin trazabilidad extra
    const actualizado = await prisma.expediente.findUniqueOrThrow({ where: { id: e.id } });
    expect(actualizado.estadoActualId).toBe(estadoFinalId);

    const trazas = await prisma.trazabilidad.findMany({ where: { expedienteId: e.id } });
    // ingreso inicial + el cambio a final = 2, ninguno más tras el intento rechazado
    expect(trazas).toHaveLength(2);
  });
});
