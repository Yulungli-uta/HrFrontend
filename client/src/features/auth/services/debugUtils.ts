// services/auth/debugUtils.ts
//
// Utilidades de diagnóstico de tokens JWT. Toda la salida pasa por el logger
// central (gateada por VITE_DEBUG_AUTH): en producción no imprime nada.
// Nunca loguear el token completo ni el payload íntegro: solo metadatos
// (expiración, formato) que no comprometen la sesión.

import { logger } from "@/lib/logger";

/**
 * Decodifica un token JWT sin verificar la firma
 * @param token Token JWT
 * @returns Objeto con el payload decodificado o null si es inválido
 */
export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    if (!token) {
      logger.auth.warn("decodeJwt: token vacío");
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      logger.auth.warn("decodeJwt: el token no tiene 3 partes");
      return null;
    }

    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsedPayload = JSON.parse(decodedPayload) as Record<string, unknown>;

    if (typeof parsedPayload.exp === "number") {
      const expirationDate = new Date(parsedPayload.exp * 1000);
      const now = new Date();
      const isExpired = now > expirationDate;

      logger.auth.debug("decodeJwt: expiración del token", {
        expiration: expirationDate.toISOString(),
        isExpired,
        expiresIn: isExpired
          ? "EXPIRED"
          : `${Math.round((expirationDate.getTime() - now.getTime()) / 1000)} seconds`,
      });
    }

    return parsedPayload;
  } catch (error) {
    logger.auth.error("decodeJwt: error decodificando JWT", error);
    return null;
  }
}

/**
 * Verifica si un token JWT es válido (sin verificar firma, solo formato y expiración)
 * @param token Token JWT
 * @returns true si el token parece válido
 */
export function isJwtValid(token: string): boolean {
  if (!token) {
    logger.auth.warn("isJwtValid: token vacío");
    return false;
  }

  const decoded = decodeJwt(token);
  if (!decoded) {
    return false;
  }

  if (typeof decoded.exp === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      logger.auth.warn("isJwtValid: el token está expirado");
      return false;
    }
  }

  return true;
}

/**
 * Analiza y reporta (vía logger, solo en modo debug) metadatos de un token:
 * expiración, emisión y ventana de validez. No expone el token ni el payload.
 * @param token Token JWT a analizar
 */
export function analyzeToken(token: string): void {
  const decoded = decodeJwt(token);
  if (!decoded) {
    logger.auth.debug("analyzeToken: token no decodificable");
    return;
  }

  const meta: Record<string, unknown> = {};

  if (typeof decoded.exp === "number") {
    const expirationDate = new Date(decoded.exp * 1000);
    const now = new Date();
    const isExpired = now > expirationDate;
    meta.expiration = expirationDate.toISOString();
    meta.isExpired = isExpired;
    meta.expiresIn = isExpired
      ? "EXPIRED"
      : `${Math.round((expirationDate.getTime() - now.getTime()) / 1000)} seconds`;
  }

  if (typeof decoded.iat === "number") {
    meta.issuedAt = new Date(decoded.iat * 1000).toISOString();
  }

  if (typeof decoded.nbf === "number") {
    meta.notValidBefore = new Date(decoded.nbf * 1000).toISOString();
  }

  logger.auth.debug("analyzeToken: metadatos del token", meta);
}
