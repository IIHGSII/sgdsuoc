'use client';

import { useActionState, useRef, useState, startTransition } from 'react';
import { cargarFotosAction } from './actions';

// Las fotos se achican y pasan a JPEG en el propio celular antes de subirlas:
// una foto de 4 MB queda en ~0,5 MB, legible y rápida de subir con poca señal.
const LADO_MAXIMO_PX = 2000;
const CALIDAD_JPEG = 0.8;

type Foto = { id: string; blob: Blob; url: string };

async function cargarImagen(
  archivo: File,
): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    // Respeta la orientación de la cámara (EXIF).
    return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    // Navegadores que no lo soportan para ese formato: vía <img>.
    const url = URL.createObjectURL(archivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function comprimir(archivo: File): Promise<Blob> {
  const imagen = await cargarImagen(archivo);
  const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(imagen.width * escala);
  canvas.height = Math.round(imagen.height * escala);
  canvas.getContext('2d')!.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la foto.'))),
      'image/jpeg',
      CALIDAD_JPEG,
    ),
  );
}

export function CargarFotosForm() {
  const [state, formAction, pending] = useActionState(cargarFotosAction, undefined);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  async function agregar(archivos: FileList | null) {
    if (!archivos?.length) return;
    setProcesando(true);
    setErrorLocal(null);
    try {
      const nuevas: Foto[] = [];
      for (const archivo of Array.from(archivos)) {
        const blob = await comprimir(archivo);
        nuevas.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
      }
      setFotos((actuales) => [...actuales, ...nuevas]);
    } catch {
      setErrorLocal('No se pudo leer una de las fotos. Probá sacarla de nuevo.');
    } finally {
      setProcesando(false);
    }
  }

  function mover(indice: number, desplazamiento: -1 | 1) {
    setFotos((actuales) => {
      const destino = indice + desplazamiento;
      if (destino < 0 || destino >= actuales.length) return actuales;
      const copia = [...actuales];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  function quitar(indice: number) {
    setFotos((actuales) => {
      URL.revokeObjectURL(actuales[indice].url);
      return actuales.filter((_, i) => i !== indice);
    });
  }

  function guardar() {
    const formData = new FormData();
    fotos.forEach((foto, i) => formData.append('fotos', foto.blob, `hoja-${i + 1}.jpg`));
    startTransition(() => formAction(formData));
  }

  const error = errorLocal ?? state?.error;
  const ocupado = procesando || pending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => camaraRef.current?.click()}
          disabled={ocupado}
          className="rounded-lg bg-blue-600 px-4 py-4 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Sacar foto
        </button>
        <button
          type="button"
          onClick={() => galeriaRef.current?.click()}
          disabled={ocupado}
          className="rounded-lg border border-gray-300 bg-white px-4 py-4 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Elegir de la galería
        </button>
      </div>
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          agregar(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          agregar(e.target.files);
          e.target.value = '';
        }}
      />

      {procesando && <p className="text-sm text-gray-500">Preparando la foto...</p>}

      {fotos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          Sacá una foto por cada hoja del expediente, en orden.
        </p>
      ) : (
        <ol className="space-y-2">
          {fotos.map((foto, i) => (
            <li
              key={foto.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
              <img
                src={foto.url}
                alt={`Hoja ${i + 1}`}
                className="h-20 w-16 rounded object-cover"
              />
              <span className="flex-1 text-sm font-medium text-gray-900">Hoja {i + 1}</span>
              <div className="flex gap-1">
                <BotonChico onClick={() => mover(i, -1)} disabled={ocupado || i === 0}>
                  ↑
                </BotonChico>
                <BotonChico
                  onClick={() => mover(i, 1)}
                  disabled={ocupado || i === fotos.length - 1}
                >
                  ↓
                </BotonChico>
                <BotonChico onClick={() => quitar(i)} disabled={ocupado}>
                  Quitar
                </BotonChico>
              </div>
            </li>
          ))}
        </ol>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={guardar}
        disabled={ocupado || fotos.length === 0}
        className="w-full rounded-lg bg-green-600 px-4 py-4 text-base font-medium text-white hover:bg-green-700 disabled:opacity-60"
      >
        {pending
          ? 'Guardando...'
          : `Guardar expediente${fotos.length ? ` (${fotos.length} ${fotos.length === 1 ? 'hoja' : 'hojas'})` : ''}`}
      </button>
    </div>
  );
}

function BotonChico({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-w-10 rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
