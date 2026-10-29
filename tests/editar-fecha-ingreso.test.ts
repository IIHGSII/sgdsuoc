import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from './helpers/test-prisma';
import { crearExpediente, editarExpediente, FechaIngresoInvalidaError } from '@/lib/expedientes';
import { cambiarEstadoExpediente } from '@/lib/estados';

// Corregir la fecha de ingreso a la SUOC equivale a que el expediente haya
// entrado en esa fecha: mueve el registro de ingreso de la trazabilidad, sin
// cambiar nunca el número SUOC. Se rechaza si cae en otro año o después de un
// cambio de estado ya registrado.

describe('Editar la fecha de ingreso a la SUOC', () => {
  let tipoDocumentoId: number;
  let servicioId: number;
  let estadoInicialId: number;
  let estadoSiguienteId: number;
  const expedienteIds: number[] = [];

  beforeAll(async () => {
    tipoDocumentoId = (await prisma.tipoDocumento.create({ data: { nombre: 'TEST_FECHA_tipo' } }))
      .id;
    servicioId = (await prisma.servicio.create({ data: { nombre: 'TEST_FECHA_servicio' } })).id;
    estadoInicialId = (
      await prisma.estado.create({
        data: { nombre: 'TEST_FECHA_inicial', orden: -600, esFinal: false },
      })
    ).id;
    estadoSiguienteId = (
      await prisma.estado.create({
        data: { nombre: 'TEST_FECHA_siguiente', orden: -599, esFinal: false },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.trazabilidad.deleteMany({ where: { expedienteId: { in: expedienteIds } } });
    await prisma.expediente.deleteMany({ where: { id: { in: expedienteIds } } });
    await prisma.tipoDocumento.delete({ where: { id: tipoDocumentoId } });
    await prisma.servicio.delete({ where: { id: servicioId } });
    await prisma.estado.deleteMany({
      where: { id: { in: [estadoInicialId, estadoSiguienteId] } },
    });
  });

  function datos(fechaIngresoSuoc: Date) {
    return {
      nroMesaEntrada: 'test-mesa',
      fechaIngresoAdm: new Date('2085-01-01T08:00:00Z'),
      fechaIngresoSuoc,
      tipoDocumentoId,
      servicioOrigenId: servicioId,
      asunto: 'Prueba fecha de ingreso',
    };
  }

  async function crear(fechaIngresoSuoc: Date) {
    const e = await crearExpediente(datos(fechaIngresoSuoc));
    expedienteIds.push(e.id);
    return e;
  }

  function registroIngreso(expedienteId: number) {
    return prisma.trazabilidad.findFirstOrThrow({
      where: { expedienteId, estadoAnteriorId: null },
    });
  }

  it('mueve el registro de ingreso de la trazabilidad a la fecha nueva', async () => {
    const e = await crear(new Date('2085-03-10T12:00:00Z'));
    const nueva = new Date('2085-03-05T12:00:00Z');

    const editado = await editarExpediente(e.id, datos(nueva));

    expect(editado.fechaIngresoSuoc).toEqual(nueva);
    expect(editado.nroSuoc).toBe(e.nroSuoc);
    expect((await registroIngreso(e.id)).fechaCambio).toEqual(nueva);
  });

  it('rechaza una fecha de otro año y no cambia nada', async () => {
    const original = new Date('2085-01-05T12:00:00Z');
    const e = await crear(original);

    await expect(
      editarExpediente(e.id, datos(new Date('2084-12-28T12:00:00Z'))),
    ).rejects.toBeInstanceOf(FechaIngresoInvalidaError);

    const sinCambios = await prisma.expediente.findUniqueOrThrow({ where: { id: e.id } });
    expect(sinCambios.fechaIngresoSuoc).toEqual(original);
    expect(sinCambios.anioSuoc).toBe(2085);
    expect((await registroIngreso(e.id)).fechaCambio).toEqual(original);
  });

  it('rechaza una fecha posterior a un cambio de estado registrado', async () => {
    const original = new Date('2085-03-01T12:00:00Z');
    const e = await crear(original);
    await cambiarEstadoExpediente(e.id, estadoSiguienteId);
    // El cambio se registra con la fecha real de hoy; se lo lleva a 2085 para
    // que quede en el mismo año que el expediente de prueba.
    await prisma.trazabilidad.updateMany({
      where: { expedienteId: e.id, estadoAnteriorId: { not: null } },
      data: { fechaCambio: new Date('2085-03-15T12:00:00Z') },
    });

    await expect(editarExpediente(e.id, datos(new Date('2085-03-16T12:00:00Z')))).rejects.toThrow(
      /Hay cambios de estado registrados antes de esa fecha/,
    );
    expect((await registroIngreso(e.id)).fechaCambio).toEqual(original);

    // Una fecha anterior al cambio de estado (mismo año) sí se acepta.
    const anterior = new Date('2085-02-20T12:00:00Z');
    await editarExpediente(e.id, datos(anterior));
    expect((await registroIngreso(e.id)).fechaCambio).toEqual(anterior);
  });

  it('si la fecha llega igual al minuto, conserva la original con sus segundos', async () => {
    const original = new Date('2085-04-01T12:00:45Z');
    const e = await crear(original);

    // El formulario la muestra y la reenvía truncada a minutos.
    const editado = await editarExpediente(e.id, datos(new Date('2085-04-01T12:00:00Z')));

    expect(editado.fechaIngresoSuoc).toEqual(original);
    expect((await registroIngreso(e.id)).fechaCambio).toEqual(original);
  });
});
