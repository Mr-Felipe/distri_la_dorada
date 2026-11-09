const formateadorMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatearCOP(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || isNaN(Number(valor))) {
    return '$ 0';
  }
  return formateadorMoneda.format(Number(valor));
}

export function formatearFecha(fechaIso: string | null | undefined, incluirHora = true): string {
  if (!fechaIso) return '—';
  try {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return fechaIso;
    
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(incluirHora ? { hour: '2-digit', minute: '2-digit' } : {})
    });
  } catch {
    return fechaIso;
  }
}

export function formatearNumeroPedido(numero: string | number | null | undefined): string {
  if (numero === null || numero === undefined || numero === '') return '#—';
  const s = String(numero);
  return /^\d+$/.test(s) ? `#${s}` : s;
}
