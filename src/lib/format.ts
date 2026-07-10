export function formatearMonto(monto: number | string | null | undefined): string {
  if (monto == null) return '—';
  const numero = typeof monto === 'string' ? Number(monto) : monto;
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(numero);
}
