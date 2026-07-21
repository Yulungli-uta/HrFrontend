// features/auth/services/tokenService.ts
import { TokenPair, UserSession } from "../types/authTypes";
import { getBrowserId } from "@/utils/browserId";
import { logger } from "@/lib/logger";

function key(suffix: string): string {
  const browserId = getBrowserId();
  return `wsuta:${browserId}:${suffix}`;
}

/**
 * Decodifica el payload de un JWT sin validar firma (la validación es del backend).
 * Retorna null si el token no tiene formato JWT válido.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    return JSON.parse(atob(payloadPart)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const tokenService = {
  getAccessToken(): string | null {
    try {
      const token = localStorage.getItem(key("accessToken"));
      logger.auth.debug("getAccessToken →", token ? "EXISTS" : "NULL");
      return token;
    } catch (e) {
      logger.auth.error("Error leyendo accessToken de localStorage", e);
      return null;
    }
  },

  getRefreshToken(): string | null {
    try {
      const token = localStorage.getItem(key("refreshToken"));
      logger.auth.debug("getRefreshToken →", token ? "EXISTS" : "NULL");
      return token;
    } catch (e) {
      logger.auth.error("Error leyendo refreshToken de localStorage", e);
      return null;
    }
  },

  getUserSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(key("userSession"));
      if (!raw) {
        logger.auth.debug("getUserSession → NULL");
        return null;
      }
      const session = JSON.parse(raw) as UserSession;
      logger.auth.debug("getUserSession → OK", { id: session.id, email: session.email });
      return session;
    } catch (e) {
      logger.auth.error("Error parseando userSession", e);
      return null;
    }
  },

  setTokens(tokens: TokenPair): void {
    try {
      // Nunca loguear el valor de los tokens, ni siquiera en modo debug
      logger.auth.debug("setTokens → SAVED");
      localStorage.setItem(key("accessToken"), tokens.accessToken);
      localStorage.setItem(key("refreshToken"), tokens.refreshToken);
    } catch (e) {
      logger.auth.error("Error guardando tokens en localStorage", e);
    }
  },

  setUserSession(userData: UserSession): void {
    try {
      logger.auth.debug("setUserSession →", {
        id: userData.id,
        email: userData.email,
        userType: userData.userType,
      });
      localStorage.setItem(key("userSession"), JSON.stringify(userData));
    } catch (e) {
      logger.auth.error("Error guardando userSession", e);
    }
  },

  clearTokens(): void {
    try {
      logger.auth.debug("clearTokens → CLEARED");
      localStorage.removeItem(key("accessToken"));
      localStorage.removeItem(key("refreshToken"));
      localStorage.removeItem(key("userSession"));
    } catch (e) {
      logger.auth.error("Error limpiando tokens de localStorage", e);
    }
  },

  extractAdGroups(token: string): string[] {
    const payload = decodeJwtPayload(token);
    if (!payload) return [];
    const raw = payload["ad_group"];
    if (!raw) return [];
    const groups = Array.isArray(raw) ? raw : [raw];
    logger.auth.debug("extractAdGroups →", groups.length, "grupos");
    return groups.filter((g): g is string => typeof g === "string");
  },

  /**
   * Retorna el instante de expiración del token en milisegundos epoch,
   * o null si el token no es decodificable o no tiene claim exp.
   */
  getTokenExpirationMs(token: string): number | null {
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp;
    return typeof exp === "number" ? exp * 1000 : null;
  },

  isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp;
    if (typeof exp !== "number") {
      logger.auth.debug("isTokenExpired → token inválido o sin exp");
      return true;
    }
    const expired = exp * 1000 < Date.now();
    logger.auth.debug("isTokenExpired →", expired ? "EXPIRED" : "VALID");
    return expired;
  },
};
