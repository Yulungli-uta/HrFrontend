/**
 * Utilidades de manejo de errores para la capa API.
 * Principio SRP: responsabilidad única de interpretar y formatear errores.
 *
 * CORRECCIÓN: Unifica el contrato de error entre `core/fetch.ts` (ApiError con
 * { code, message, details }) y los consumidores que usaban `parseApiError`
 * del antiguo `src/lib/error-handling.tsx`.
 *
 * NOTA (investigado, no tocado): existe una segunda función `parseApiError`
 * en `@/lib/error-handling.tsx` con firma incompatible (devuelve el objeto
 * `ApiError { status, code, message, details }`, no un `string`). Ambas
 * versiones son, hoy, internamente consistentes con sus propios consumidores
 * reales (~13 archivos usan esta versión como string; ~56 usan la de
 * `error-handling.tsx` como objeto vía `.message`/`.status`) — no hay bug
 * activo. Delegar esta versión a la otra requeriría normalizar primero el
 * shape `{code,...}` (core/fetch.ts) vs `{status,...}` (error-handling.tsx),
 * que hoy NO son intercambiables (la versión objeto solo reconoce `status`,
 * no `code`, y perdería el mensaje real si se le pasara un ApiError de
 * core/fetch.ts sin adaptar primero). Se dejó sin tocar a propósito para no
 * arriesgar los ~70 call-sites sin poder verificar visualmente cada pantalla.
 */

import type { ApiError, ApiResponse } from '../core/fetch';

// =============================================================================
// Manejo de errores de la API
// =============================================================================

/**
 * Extrae un mensaje legible de un ApiError.
 * Compatible con el formato { code, message, details } de `core/fetch.ts`.
 */
export function handleApiError(
  error: ApiError | unknown,
  defaultMsg = 'Ocurrió un error desconocido'
): string {
  if (!error) return defaultMsg;

  const e = error as ApiError;

  if (e.details) {
    if (typeof e.details === 'object') {
      return `${e.message}: ${JSON.stringify(e.details)}`;
    }
    return `${e.message}: ${e.details}`;
  }

  return e.message || defaultMsg;
}

/**
 * Extrae un mensaje de error desde cualquier origen:
 * - ApiError del cliente refactorizado ({ code, message, details })
 * - Error nativo de JavaScript
 * - Respuesta de axios/fetch con formato { response.data.message }
 * - String directo
 *
 * Mantiene compatibilidad con el `parseApiError` del antiguo `error-handling.tsx`.
 */
export function parseApiError(error: unknown, defaultMsg = 'Error desconocido'): string {
  if (!error) return defaultMsg;

  // Error nativo de JavaScript
  if (error instanceof Error) {
    return error.message || defaultMsg;
  }

  if (typeof error === 'string') {
    return error || defaultMsg;
  }

  const e = error as Record<string, unknown>;

  // Formato ApiError del cliente refactorizado
  if (typeof e.code === 'number' && typeof e.message === 'string') {
    return handleApiError(e as unknown as ApiError, defaultMsg);
  }

  // Formato axios: { response: { data: { message } } }
  const responseData = (e.response as Record<string, unknown>)?.data as
    | Record<string, unknown>
    | undefined;
  if (responseData?.message) {
    return String(responseData.message);
  }

  // Formato { message }
  if (e.message) {
    return String(e.message);
  }

  // Formato { error }
  if (e.error && typeof e.error === 'string') {
    return e.error;
  }

  // Formato { title } (ASP.NET Core ProblemDetails)
  if (e.title && typeof e.title === 'string') {
    return e.title;
  }

  return defaultMsg;
}

/**
 * Extrae los datos de una ApiResponse o lanza el error si el status es 'error'.
 * Útil para simplificar el manejo en hooks y servicios.
 */
export function unwrapApiResponse<T>(
  response: ApiResponse<T>,
  errorMsg?: string
): T {
  if (response.status === 'success') {
    return response.data;
  }
  throw new Error(handleApiError(response.error, errorMsg));
}
