// services/permissions/cacheService.ts
import { logger } from "@/lib/logger";

const SESSION_KEY = "uta-session-id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server-session";

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
    logger.auth.debug("[CACHE] New sessionId created");
  }
  return sessionId;
}

/**
 * Cache por usuario + sesión de navegador
 * Clave: cache:{userId}:{sessionId}:{key}
 */
export class CacheService {
  private userId: string | number;
  private sessionId: string;

  constructor(userId: string | number) {
    this.userId = userId;
    this.sessionId = getOrCreateSessionId();
  }

  private key(key: string) {
    return `cache:${this.userId}:${this.sessionId}:${key}`;
  }

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.key(key));
      const value = raw ? JSON.parse(raw) : null;
      logger.auth.debug("[CACHE] GET", this.key(key));
      return value;
    } catch (err) {
      logger.auth.error("[CACHE] Error al leer caché:", err);
      return null;
    }
  }

  set<T>(key: string, value: T) {
    try {
      logger.auth.debug("[CACHE] SET", this.key(key));
      localStorage.setItem(this.key(key), JSON.stringify(value));
    } catch (err) {
      logger.auth.error("[CACHE] Error al escribir caché:", err);
    }
  }

  /** Cache defensivo: si el fetch falla, devuelve el valor anterior */
  async tryGetOrSet<T>(key: string, fallbackFn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    try {
      const fresh = await fallbackFn();
      this.set(key, fresh);
      return fresh;
    } catch (err) {
      logger.auth.warn("[CACHE] FALLBACK, usando valor cacheado:", err);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
      return {} as T;
    }
  }

  /** Limpia el caché SOLO de este usuario + sesión */
  clearAllForCurrent() {
    const prefix = `cache:${this.userId}:${this.sessionId}:`;
    logger.auth.debug("[CACHE] CLEAR for user/session:", prefix);
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  }

  /** 🔥 Limpia TODO el caché de permisos de TODOS los usuarios/sesiones */
  static clearAll() {
    logger.auth.debug("[CACHE] CLEAR ALL (global)");
    const prefix = "cache:";
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}
