// src/lib/clock.ts
//
// Estándar "Fecha y hora UTA": toda fecha/hora de negocio es hora de Ecuador (America/Guayaquil,
// UTC-5, sin horario de verano) y la decide el servidor. El cliente solo envía fechas elegidas por el
// usuario ("YYYY-MM-DD"). Cuando el cliente necesita "hoy" (valor por defecto, `max` de un input,
// reglas "no posterior a hoy") debe usar el día de Ecuador, no el del navegador ni el de UTC:
// después de las 19:00 el día UTC ya es el siguiente y un navegador en otra zona vería otro día.

export const ECUADOR_TIME_ZONE = "America/Guayaquil";

const ECUADOR_OFFSET = "-05:00";
const ZONELESS_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ECUADOR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Día calendario de Ecuador de un instante, como "yyyy-MM-dd". */
export function ecuadorDateOf(instant: Date): string {
  return dayFormatter.format(instant);
}

/** Hoy en Ecuador como "yyyy-MM-dd". Nunca usar `new Date().toISOString().slice(0, 10)` (es el día UTC). */
export function todayEcuador(now: Date = new Date()): string {
  return ecuadorDateOf(now);
}

/**
 * Interpreta un datetime que llega del servidor. El servidor guarda hora de Ecuador SIN zona
 * ("2026-10-26T19:30:00"): se toma como hora de Ecuador, no como la del navegador. Si ya trae zona
 * ("Z" o "+hh:mm") se respeta. Devuelve null si el valor está vacío o no es válido.
 */
export function parseServerDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = ZONELESS_DATETIME.test(value) ? `${value.replace(" ", "T")}${ECUADOR_OFFSET}` : value;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DATE_ONLY_EXACT = /^\d{4}-\d{2}-\d{2}$/;

type FormatInput = Date | string | number | null | undefined;
type Resolved = { date: Date; timeZone: string };

/**
 * Resuelve el valor a mostrar. Fecha de calendario ("yyyy-MM-dd") se formatea en UTC para que el día no se
 * corra (JavaScript la interpreta como medianoche UTC). Un instante o un datetime del servidor sin zona se
 * formatean en hora de Ecuador, sin depender de la zona del navegador.
 */
function resolve(value: FormatInput): Resolved | null {
  if (value === null || value === undefined || value === "") return null;
  let date: Date | null;
  let timeZone = ECUADOR_TIME_ZONE;
  if (typeof value === "string") {
    if (DATE_ONLY_EXACT.test(value)) {
      date = new Date(`${value}T00:00:00Z`);
      timeZone = "UTC";
    } else {
      date = parseServerDateTime(value);
    }
  } else {
    date = new Date(value);
  }
  if (!date || Number.isNaN(date.getTime())) return null;
  return { date, timeZone };
}

/** Fecha para mostrar (equivale a `toLocaleDateString`) con las reglas de zona del estándar. "" si no es válida. */
export function formatDate(value: FormatInput, locale = "es-EC", options: Intl.DateTimeFormatOptions = {}): string {
  const resolved = resolve(value);
  return resolved ? resolved.date.toLocaleDateString(locale, { ...options, timeZone: resolved.timeZone }) : "";
}

/** Fecha y hora para mostrar (equivale a `toLocaleString`) en hora de Ecuador. "" si no es válida. */
export function formatDateTime(value: FormatInput, locale = "es-EC", options: Intl.DateTimeFormatOptions = {}): string {
  const resolved = resolve(value);
  return resolved ? resolved.date.toLocaleString(locale, { ...options, timeZone: resolved.timeZone }) : "";
}

/** Hora para mostrar (equivale a `toLocaleTimeString`) en hora de Ecuador. "" si no es válida. */
export function formatTime(value: FormatInput, locale = "es-EC", options: Intl.DateTimeFormatOptions = {}): string {
  const resolved = resolve(value);
  return resolved ? resolved.date.toLocaleTimeString(locale, { ...options, timeZone: resolved.timeZone }) : "";
}

/** Formatea un instante en hora de Ecuador con fecha y hora cortas por defecto. */
export function formatEcuador(
  value: FormatInput,
  locale = "es-EC",
  options: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" },
): string {
  return formatDateTime(value, locale, options);
}

// ---- Aritmética de fechas de calendario ("yyyy-MM-dd"), sin depender de la zona del navegador ----

const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

function toUtcDate(dateOnly: string): Date {
  const match = DATE_ONLY_PREFIX.exec(dateOnly);
  if (!match) throw new Error(`Fecha inválida: ${dateOnly}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

const fromUtcDate = (date: Date): string => date.toISOString().slice(0, 10);

/** Suma días a una fecha "yyyy-MM-dd" (puede ser negativo). */
export function addDays(dateOnly: string, days: number): string {
  const date = toUtcDate(dateOnly);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtcDate(date);
}

/** Suma meses a una fecha "yyyy-MM-dd" (mismo desborde de fin de mes que `Date#setMonth`). */
export function addMonths(dateOnly: string, months: number): string {
  const date = toUtcDate(dateOnly);
  date.setUTCMonth(date.getUTCMonth() + months);
  return fromUtcDate(date);
}

/** Suma años a una fecha "yyyy-MM-dd". */
export function addYears(dateOnly: string, years: number): string {
  const date = toUtcDate(dateOnly);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return fromUtcDate(date);
}

/** Domingo de la semana que contiene la fecha dada (0 = domingo). */
export function sundayOnOrBefore(dateOnly: string): string {
  return addDays(dateOnly, -toUtcDate(dateOnly).getUTCDay());
}

/** Primer día del mes de Ecuador actual, "yyyy-MM-01". */
export function firstDayOfCurrentMonthEcuador(now: Date = new Date()): string {
  return `${todayEcuador(now).slice(0, 7)}-01`;
}

/** Mes actual de Ecuador, "yyyy-MM". */
export function currentMonthEcuador(now: Date = new Date()): string {
  return todayEcuador(now).slice(0, 7);
}

/** Fecha y hora actual de Ecuador para `<input type="datetime-local">`, "yyyy-MM-ddTHH:mm". */
export function nowEcuadorLocalInput(now: Date = new Date()): string {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: ECUADOR_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return `${todayEcuador(now)}T${time}`;
}

/** Valor de fecha del servidor ("yyyy-MM-dd" o con hora) como "yyyy-MM-dd", sin desfase de día. */
export function toDateOnlyString(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    const match = DATE_ONLY_PREFIX.exec(value);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : ecuadorDateOf(date);
}
