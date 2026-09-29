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
