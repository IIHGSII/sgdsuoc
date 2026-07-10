import {
  crearCatalogoAction,
  editarCatalogoAction,
  eliminarCatalogoAction,
} from './catalogos-actions';

type NombreCatalogo = 'tipoDocumento' | 'servicio' | 'destino';

export function CatalogoTabla({
  catalogo,
  titulo,
  items,
}: {
  catalogo: NombreCatalogo;
  titulo: string;
  items: { id: number; nombre: string }[];
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{titulo}</h2>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <TablaFila key={item.id} catalogo={catalogo} item={item} />
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-gray-500">Sin registros todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={crearCatalogoAction} className="mt-2 flex gap-2">
        <input type="hidden" name="catalogo" value={catalogo} />
        <input
          type="text"
          name="nombre"
          placeholder="Nuevo nombre"
          required
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
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

function TablaFila({
  catalogo,
  item,
}: {
  catalogo: NombreCatalogo;
  item: { id: number; nombre: string };
}) {
  const idEditar = `editar-${catalogo}-${item.id}`;
  const idEliminar = `eliminar-${catalogo}-${item.id}`;

  return (
    <tr>
      <td className="px-4 py-2">
        <form id={idEditar} action={editarCatalogoAction} className="contents">
          <input type="hidden" name="catalogo" value={catalogo} />
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
      <td className="whitespace-nowrap px-4 py-2 text-right">
        <button
          form={idEditar}
          type="submit"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Guardar
        </button>
        <form id={idEliminar} action={eliminarCatalogoAction} className="ml-2 inline">
          <input type="hidden" name="catalogo" value={catalogo} />
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
