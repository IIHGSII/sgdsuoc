'use client'; // Los error boundaries tienen que ser Client Components.

// Último recurso: reemplaza al layout raíz cuando el error ocurre en él, por
// eso define su propio <html> y <body>. El resto de los errores los atrapa
// app/error.tsx, que conserva el layout.
//
// Usa estilos en línea y NO importa globals.css: con ese import, el build de
// Turbopack falló en Hostinger (el proceso de PostCSS se cerraba antes de
// arrancar), aunque compilaba bien en local; era el principal sospechoso.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
        <title>Error - SGD SUOC</title>
        <div style={{ maxWidth: '32rem', margin: '0 auto', padding: '1.5rem' }}>
          <div
            style={{
              background: '#fff',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              fontSize: '0.875rem',
            }}
          >
            <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', color: '#111827' }}>
              Ocurrió un error inesperado
            </h1>
            <p style={{ margin: '0 0 1rem', color: '#374151' }}>
              El sistema no pudo cargarse. Probá de nuevo en unos segundos.
            </p>
            {error.digest && (
              <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                Código: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 0,
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
