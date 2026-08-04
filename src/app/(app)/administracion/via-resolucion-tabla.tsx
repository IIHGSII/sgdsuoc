import {
  crearViaResolucionAction,
  editarViaResolucionAction,
  eliminarViaResolucionAction,
} from './catalogos-actions';

type ViaResolucion = {
  id: number;
  nombre: string;
  tipoSalidaSugerido: 'NOTA' | 'PORTAL' | 'OTRO' | null;
  destinoSugeridoId: number | null;
};
type Destino = { id: number; nombre: string };

const ETIQUETAS_TIPO: Record<'NOTA' | 'PORTAL' | 'OTRO', string> = {
  NOTA: 'Nota',
  PORTAL: 'Portal',
  OTRO: 'Otro',
};

export function ViaResolucionTabla({
  items,
  destinos,
}: {
  items: ViaResolucion[];
  destinos: Destino[];
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">Vías de resolución</h2>
      <p className="mb-2 text-xs text-gray-500">
        Al registrar una salida para un expediente con esta vía, se preseleccionan el tipo y el
        destino sugeridos (si están configurados).
      </p>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Tipo de salida sugerido</Th>
              <Th>Destino sugerido</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <ViaResolucionFila key={item.id} item={item} destinos={destinos} />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-gray-500">
                  Sin registros todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={crearViaResolucionAction} className="mt-2 flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-gray-600">Nombre</label>
          <input
            type="text"
            name="nombre"
            required
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Tipo sugerido</label>
          <SelectTipoSalida name="tipoSalidaSugerido" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Destino sugerido</label>
          <SelectDestino name="destinoSugeridoId" destinos={destinos} />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Agregar
        </button>
      </form>
    </section>
  );
}

function ViaResolucionFila({ item, destinos }: { item: ViaResolucion; destinos: Destino[] }) {
  const idEditar = `editar-via-resolucion-${item.id}`;
  const idEliminar = `eliminar-via-resolucion-${item.id}`;

  return (
    <tr>
      <td className="px-4 py-2">
        <form id={idEditar} action={editarViaResolucionAction} className="contents">
          <input type="hidden" name="id" value={item.id} />
        </form>
        <input
          form={idEditar}
          type="text"
          name="nombre"
          defaultValue={item.nombre}
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-2">
        <SelectTipoSalida
          form={idEditar}
          name="tipoSalidaSugerido"
          defaultValue={item.tipoSalidaSugerido ?? ''}
        />
      </td>
      <td className="px-4 py-2">
        <SelectDestino
          form={idEditar}
          name="destinoSugeridoId"
          destinos={destinos}
          defaultValue={item.destinoSugeridoId ?? ''}
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right">
        <button
          form={idEditar}
          type="submit"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Guardar
        </button>
        <form id={idEliminar} action={eliminarViaResolucionAction} className="ml-2 inline">
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Eliminar
          </button>
        </form>
      </td>
    </tr>
  );
}

function SelectTipoSalida({
  name,
  form,
  defaultValue,
}: {
  name: string;
  form?: string;
  defaultValue?: string;
}) {
  return (
    <select
      form={form}
      name={name}
      defaultValue={defaultValue ?? ''}
      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">Sin sugerencia</option>
      {(['NOTA', 'PORTAL', 'OTRO'] as const).map((t) => (
        <option key={t} value={t}>
          {ETIQUETAS_TIPO[t]}
        </option>
      ))}
    </select>
  );
}

function SelectDestino({
  name,
  form,
  destinos,
  defaultValue,
}: {
  name: string;
  form?: string;
  destinos: Destino[];
  defaultValue?: number | string;
}) {
  return (
    <select
      form={form}
      name={name}
      defaultValue={defaultValue ?? ''}
      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">Sin sugerencia</option>
      {destinos.map((d) => (
        <option key={d.id} value={d.id}>
          {d.nombre}
        </option>
      ))}
    </select>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}
