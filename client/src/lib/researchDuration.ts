// src/lib/researchDuration.ts
//
// Tiempo entre dos fechas (ambas inclusive) en años, meses y días. Debe coincidir con
// ResearchDuration.Between del backend, que es quien calcula y guarda la referencia: aquí solo se
// usa para mostrar el valor mientras se llena el formulario.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

function toUtcDays(value: string): number | null {
  const m = DATE_ONLY.exec(value);
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000);
}

function parts(value: string): { y: number; m: number; d: number } | null {
  const m = DATE_ONLY.exec(value);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
}

/** Suma un día a "yyyy-MM-dd" (para el inicio de la prórroga: el día siguiente al fin del proyecto). */
export function addOneDay(value: string): string {
  const days = toUtcDays(value);
  if (days === null) return "";
  return new Date((days + 1) * 86_400_000).toISOString().slice(0, 10);
}

/** Texto del tiempo entre dos fechas inclusive ("2 años", "6 meses", "1 año, 2 meses y 5 días"); "" si faltan datos. */
export function durationText(start: string, end: string): string {
  const s = parts(start);
  const e = parts(end);
  const sDays = toUtcDays(start);
  const eDays = toUtcDays(end);
  if (!s || !e || sDays === null || eDays === null || eDays < sDays) return "";

  // El día final cuenta: se mide hasta el día siguiente al fin.
  const limit = parts(new Date((eDays + 1) * 86_400_000).toISOString().slice(0, 10))!;
  let totalMonths = (limit.y - s.y) * 12 + limit.m - s.m;
  if (limit.d < s.d) totalMonths--;
  if (totalMonths < 0) totalMonths = 0;

  const anchor = new Date(Date.UTC(s.y, s.m - 1 + totalMonths, 1));
  const lastDayOfMonth = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate();
  const anchorDay = Math.min(s.d, lastDayOfMonth);
  const anchorDays = Math.floor(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchorDay) / 86_400_000);
  const days = eDays + 1 - anchorDays;

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const out: string[] = [];
  if (years > 0) out.push(years === 1 ? "1 año" : `${years} años`);
  if (months > 0) out.push(months === 1 ? "1 mes" : `${months} meses`);
  if (days > 0) out.push(days === 1 ? "1 día" : `${days} días`);

  if (out.length === 0) return "0 días";
  if (out.length === 1) return out[0];
  return `${out.slice(0, -1).join(", ")} y ${out[out.length - 1]}`;
}
