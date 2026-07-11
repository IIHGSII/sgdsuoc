import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from './helpers/test-prisma';
import { crearExpediente, NumeroSuocDuplicadoError } from '@/lib/expedientes';

// RN-1: correlativo automático (máximo del año + 1), reinicio anual, número
// manual, detección de duplicados y consistencia bajo concurrencia.

describe('RN-1: numeración automática de expedientes', () => {
  let tipoDocumentoId: number;
  let servicioId: number;
  let estadoId: number;
  const expedienteIds: number[] = [];

  beforeAll(async () => {
    const tipo = await prisma.tipoDocumento.create({ data: { nombre: 'TEST_RN1_tipo' } });
    tipoDocumentoId = tipo.id;
    const servicio = await prisma.servicio.create({ data: { nombre: 'TEST_RN1_servicio' } });
    servicioId = servicio.id;
    // orden muy bajo para ganar como "estado de menor orden" (estado inicial de RN-2)
    // sin depender ni interferir con los catálogos reales.
    const estado = await prisma.estado.create({
      data: { nombre: 'TEST_RN1_estado', orden: -1000, esFinal: false },
    });
    estadoId = estado.id;
  });

  afterAll(async () => {
    await prisma.trazabilidad.deleteMany({ where: { expedienteId: { in: expedienteIds } } });
    await prisma.expediente.deleteMany({ where: { id: { in: expedienteIds } } });
    await prisma.tipoDocumento.delete({ where: { id: tipoDocumentoId } });
    await prisma.servicio.delete({ where: { id: servicioId } });
    await prisma.estado.delete({ where: { id: estadoId } });
  });

  function datosBase(fechaIngresoSuoc: Date) {
    return {
      nroMesaEntrada: 'test-mesa',
      fechaIngresoAdm: fechaIngresoSuoc,
      fechaIngresoSuoc,
      tipoDocumentoId,
      servicioOrigenId: servicioId,
      asunto: 'Prueba RN-1',
    };
  }

  it('asigna el correlativo automáticamente y reinicia por año', async () => {
    const fecha = new Date('2077-05-01T10:00:00Z');

    const e1 = await crearExpediente(datosBase(fecha));
    expedienteIds.push(e1.id);
    expect(e1.nroSuoc).toBe(1);
    expect(e1.anioSuoc).toBe(2077);

    const e2 = await crearExpediente(datosBase(fecha));
    expedienteIds.push(e2.id);
    expect(e2.nroSuoc).toBe(2);

    const fechaOtroAnio = new Date('2078-05-01T10:00:00Z');
    const e3 = await crearExpediente(datosBase(fechaOtroAnio));
    expedienteIds.push(e3.id);
    expect(e3.nroSuoc).toBe(1);
    expect(e3.anioSuoc).toBe(2078);
  });

  it('respeta un número manual y continúa la numeración a partir de él', async () => {
    const fecha = new Date('2079-01-01T10:00:00Z');

    const manual = await crearExpediente({ ...datosBase(fecha), nroSuocManual: 50 });
    expedienteIds.push(manual.id);
    expect(manual.nroSuoc).toBe(50);

    const siguiente = await crearExpediente(datosBase(fecha));
    expedienteIds.push(siguiente.id);
    expect(siguiente.nroSuoc).toBe(51);
  });

  it('rechaza un número manual duplicado', async () => {
    const fecha = new Date('2080-01-01T10:00:00Z');
    const e1 = await crearExpediente({ ...datosBase(fecha), nroSuocManual: 10 });
    expedienteIds.push(e1.id);

    await expect(
      crearExpediente({ ...datosBase(fecha), nroSuocManual: 10 }),
    ).rejects.toBeInstanceOf(NumeroSuocDuplicadoError);
  });

  it('a prueba de concurrencia: creaciones simultáneas obtienen correlativos consecutivos sin repetirse', async () => {
    const fecha = new Date('2081-01-01T10:00:00Z');

    const resultados = await Promise.all(
      Array.from({ length: 5 }, () => crearExpediente(datosBase(fecha))),
    );
    resultados.forEach((e) => expedienteIds.push(e.id));

    const numeros = resultados.map((e) => e.nroSuoc).sort((a, b) => a - b);
    expect(numeros).toEqual([1, 2, 3, 4, 5]);
  });

  it('genera el registro inicial de trazabilidad al crear el expediente', async () => {
    const fecha = new Date('2082-01-01T10:00:00Z');
    const e = await crearExpediente(datosBase(fecha));
    expedienteIds.push(e.id);

    const trazas = await prisma.trazabilidad.findMany({ where: { expedienteId: e.id } });
    expect(trazas).toHaveLength(1);
    expect(trazas[0].estadoAnteriorId).toBeNull();
    expect(trazas[0].estadoNuevoId).toBe(estadoId);
  });
});
