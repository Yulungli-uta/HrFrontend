// src/lib/dateOnly.ts
//
// Fechas "solo fecha" (DateOnly del backend, llegan como "yyyy-MM-dd"): fecha de nacimiento,
// fecha de pago, etc. NO deben pasar por `new Date("yyyy-MM-dd")`: JavaScript lo interpreta como
// medianoche UTC y, en zonas al oeste de UTC (Ecuador es UTC-5), `toLocaleDateString` lo muestra
// un día antes (1974-01-27 -> "26 de enero de 1974").

import { todayEcuador } from "./clock";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Convierte "yyyy-MM-dd" (o "yyyy-MM-ddTHH:mm:ss...", se ignora la hora) a una fecha LOCAL a
 * medianoche, para que formatearla en la zona del usuario muestre el mismo día calendario.
 * Cualquier otro formato se delega a `new Date(...)`. Devuelve null si el valor no es válido.
 */
export function parseDateOnly(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const match = DATE_ONLY.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formatea una fecha "solo fecha" sin desfase de día. Sin `locale` usa el del navegador (igual que
 * `toLocaleDateString()`); devuelve "" si el valor está vacío o no es una fecha válida.
 */
export function formatDateOnly(
  value: string | Date | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString(locale, options) : "";
}

/**
 * Fecha de HOY como "yyyy-MM-dd" (para `max` de inputs de fecha y reglas "no posterior a hoy").
 * Usa el día de Ecuador (estándar "Fecha y hora UTA", ver `clock.ts`); no `toISOString()`, que da el día UTC.
 */
export function todayDateOnly(now: Date = new Date()): string {
  return todayEcuador(now);
}
