/**
 * Utilidad de gestión del token de autenticación.
 * Principio SRP: responsabilidad única de establecer/limpiar el token en la capa API.
 *
 * CORRECCIÓN: `setAuthToken` existía en el archivo monolítico `api.ts.back` pero
 * no fue migrado a la nueva estructura. Este módulo lo restaura de forma compatible
 * con `tokenService` (persistencia en localStorage) y `API_CONFIG` (headers en memoria).
 */

import { API_CONFIG } from '../core/config';
import { tokenService } from '@/features/auth';

// =============================================================================
// Gestión del token de autenticación
// =============================================================================

/**
 * Establece el token JWT en los headers por defecto de la API y en el
 * servicio de persistencia de tokens.
 *
 * @param token  Token JWT de acceso. Pasar `null` o cadena vacía para limpiar.
 *
 * @example
 * // Después de un login exitoso:
 * setAuthToken(loginResponse.accessToken);
 *
 * // Al cerrar sesión:
 * setAuthToken(null);
 */
export function setAuthToken(token: string | null): void {
  if (token) {
    // 1. Actualizar header en memoria para que apiFetch lo use inmediatamente
    API_CONFIG.DEFAULT_HEADERS = {
      ...API_CONFIG.DEFAULT_HEADERS,
      Authorization: `Bearer ${token}`,
    };

    // 2. Persistir en localStorage a través de tokenService si no está ya guardado
    //    (evitar sobreescribir el refreshToken si el token ya es el mismo)
    if (tokenService.getAccessToken() !== token) {
      const existingRefresh = tokenService.getRefreshToken() ?? '';
      tokenService.setTokens({ accessToken: token, refreshToken: existingRefresh });
    }
  } else {
    // Limpiar token de los headers en memoria
    const { Authorization: _removed, ...headersWithoutAuth } =
      API_CONFIG.DEFAULT_HEADERS as Record<string, string>;
    API_CONFIG.DEFAULT_HEADERS = headersWithoutAuth;

    // Limpiar tokens del almacenamiento persistente
    tokenService.clearTokens();
  }
}

/**
 * Obtiene el token de acceso actual desde el servicio de persistencia.
 * Útil para construir headers manualmente en llamadas fuera de `apiFetch`.
 */
export function getAuthToken(): string | null {
  return tokenService.getAccessToken();
}

/**
 * Construye el header de autorización Bearer para uso manual.
 * Retorna `undefined` si no hay token disponible.
 */
export function buildAuthHeader(): { Authorization: string } | undefined {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}
