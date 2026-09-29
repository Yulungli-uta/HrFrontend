// client/src/lib/textNormalize.ts

/**
 * Recorre un objeto/array de forma recursiva y en cada string hace trim() a los extremos
 * y colapsa espacios múltiples internos a uno solo. No toca campos que no sean string.
 *
 * Punto único de normalización para "espacios en blanco al inicio/fin y más de un espacio
 * entre palabras" (hallazgo informe UTA-DITIC-PS-027-2026, observación 2) — se aplica en
 * DynamicFormDialog/PersonFormDialog antes de enviar los datos, en vez de repetir la misma
 * lógica en cada schema Zod de los ~11 formularios del módulo.
 */
export function trimDeep<T>(value: T): T {
  if (typeof value === "string") {
    return value.trim().replace(/[ \t]+/g, " ") as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => trimDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date) && !(value instanceof File)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = trimDeep(val);
    }
    return result as T;
  }
  return value;
}
