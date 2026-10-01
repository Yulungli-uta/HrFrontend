// client/src/lib/textNormalize.ts

/**
 * Claves que NUNCA se tocan, aunque su valor sea string — un espacio de más/menos en una
 * contraseña, token o secreto es parte del dato real, no "suciedad" de digitación. Mismo
 * criterio que ya usaba `maskSensitive` en lib/api/core/fetch.ts para no loguearlas; aquí
 * se reutiliza para no mutarlas.
 */
const DEFAULT_TRIM_SKIP_KEYS = new Set(
  [
    "password",
    "currentpassword",
    "newpassword",
    "confirmpassword",
    "refreshtoken",
    "accesstoken",
    "token",
    "clientsecret",
    "secret",
    "apikey",
    "hmacsecret",
  ].map((k) => k.toLowerCase())
);

/**
 * Recorre un objeto/array de forma recursiva y en cada string hace trim() a los extremos
 * y colapsa espacios múltiples internos a uno solo. No toca campos que no sean string, ni
 * las claves en `skipKeys` (comparación insensible a mayúsculas/minúsculas).
 *
 * Punto único de normalización para "espacios en blanco al inicio/fin y más de un espacio
 * entre palabras" (hallazgo informe UTA-DITIC-PS-027-2026, observación 2). Se aplica a
 * nivel de transporte HTTP en `apiFetch` (lib/api/core/fetch.ts) — cubre todos los
 * servicios/módulos del sistema sin repetir la lógica en cada formulario. También se usa
 * puntualmente en DynamicFormDialog/PersonFormDialog (Hoja de Vida) desde antes de que
 * existiera el punto central; aplicarlo dos veces es inofensivo (la función es idempotente).
 */
export function trimDeep<T>(value: T, skipKeys: Set<string> = DEFAULT_TRIM_SKIP_KEYS): T {
  if (typeof value === "string") {
    return value.trim().replace(/[ \t]+/g, " ") as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => trimDeep(item, skipKeys)) as unknown as T;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date) && !(value instanceof File)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = skipKeys.has(key.toLowerCase()) ? val : trimDeep(val, skipKeys);
    }
    return result as T;
  }
  return value;
}
