// Formateadores de la consulta de planificaciones de horas extra.

/** Minutos → "Xh Ym" (o "—" si no hay valor). */
export function formatMinutes(minutes?: number | null): string {
  if (minutes === undefined || minutes === null) return '—';
  if (minutes === 0) return '0 h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Horas decimales → "12,50 h" (o "—" si no hay valor). */
export function formatHours(hours?: number | null): string {
  if (hours === undefined || hours === null) return '—';
  return `${hours.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`;
}

/** "HH:mm:ss" (TimeSpan del backend) → "HH:mm". */
export function formatClock(value?: string | null): string {
  return value ? value.slice(0, 5) : '—';
}
