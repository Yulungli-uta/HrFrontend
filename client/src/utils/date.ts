// src/utils/date.ts

/** Convierte un input type="datetime-local" (string) a ISO UTC con milis y Z */
export function localDateTimeToISO(value?: string | null): string | null {
  if (!value) return null;
  // value viene como "YYYY-MM-DDTHH:mm"
  const local = new Date(value);
  return new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    local.getHours(),
    local.getMinutes(),
    0,
    0
  ).toISOString(); // ISO con Z (UTC)
}

/** Convierte un input type="date" (string) a ISO UTC 00:00:00.000Z */
export function dateOnlyStartToISO(value?: string | null): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const local = new Date(y, (m - 1), d, 0, 0, 0, 0);
  return local.toISOString();
}

/** Convierte un input type="date" (string) a ISO UTC 23:59:59.999Z */
export function dateOnlyEndToISO(value?: string | null): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const local = new Date(y, (m - 1), d, 23, 59, 59, 999);
  return local.toISOString();
}

/** Solo la parte de fecha local YYYY-MM-DD (útil para justificationDate cuando viene de datetime) */
export function toDateOnlyLocal(value?: string | null): string | null {
  if (!value) return null;
  const dt = new Date(value);
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const d = `${dt.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Diferencia en horas (con decimales) entre 2 datetime-local strings; asume mismo día */
export function diffHoursSameDay(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diffMs = Math.max(0, e - s);
  return +(diffMs / (1000 * 60 * 60)).toFixed(2);
}
