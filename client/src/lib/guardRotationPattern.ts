// client/src/lib/guardRotationPattern.ts

/**
 * Abreviatura de día de la semana para un dayOrder de un patrón de rotación de Guardias.
 * Día 1 = Domingo (convención ya usada en los patrones reales, ej. "sábado mañana + sábado
 * velada" en un ciclo de 7 días). Pedido del usuario 2026-09-28: reemplazar los números
 * crudos (1, 2, 3…) por esta abreviatura en la UI. Para ciclos de más de 7 días se repite el
 * patrón semanal (día 8 = Dom otra vez).
 */
const WEEKDAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function dayOrderLabel(dayOrder: number): string {
  return WEEKDAY_ABBR[(dayOrder - 1) % 7];
}

/**
 * Domingo (en formato "YYYY-MM-DD") igual o inmediatamente anterior a `dateStr`.
 * Para patrones de 7 días, el "Inicio de ciclo" (StartCycleDate) tiene que caer siempre en
 * domingo para que la convención "Día 1 = Domingo" de `dayOrderLabel` sea cierta — si no, el
 * patrón queda corrido respecto a lo que el usuario configuró (hallazgo real 2026-10-05: grupo
 * "AMARILLO OCTUBRE 2026" con ancla en lunes).
 */
export function nearestSundayOnOrBefore(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() - date.getDay());
  return date.toISOString().slice(0, 10);
}
