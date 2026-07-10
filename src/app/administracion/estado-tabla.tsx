import { crearEstadoAction, editarEstadoAction, eliminarEstadoAction } from './catalogos-actions';

type Estado = { id: number; nombre: string; orden: number; esFinal: boolean };

export function EstadoTabla({ items }: { items: Estado[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">Estados</h2>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Orden</Th>
              <Th>Es final</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <EstadoFila key={item.id} item={item} />
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

      <form action={crearEstadoAction} className="mt-2 flex items-end gap-2">
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
          <label className="mb-1 block text-xs text-gray-600">Orden</label>
          <input
            type="number"
            name="orden"
            required
            className="w-20 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-sm text-gray-700">
          <input type="checkbox" name="esFinal" />
          Es final
        </label>
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

function EstadoFila({ item }: { item: Estado }) {
  const idEditar = `editar-estado-${item.id}`;
  const idEliminar = `eliminar-estado-${item.id}`;

  return (
    <tr>
      <td className="px-4 py-2">
        <form id={idEditar} action={editarEstadoAction} className="contents">
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
        <input
          form={idEditar}
          type="number"
          name="orden"
          defaultValue={item.orden}
          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-2">
        <input form={idEditar} type="checkbox" name="esFinal" defaultChecked={item.esFinal} />
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right">
        <button
          form={idEditar}
          type="submit"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Guardar
        </button>
        <form id={idEliminar} action={eliminarEstadoAction} className="ml-2 inline">
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

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}
