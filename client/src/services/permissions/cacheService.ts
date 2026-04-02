// services/permissions/cacheService.ts
const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

const SESSION_KEY = "uta-session-id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server-session";

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
    DEBUG && console.log("[CACHE] New sessionId created:", sessionId);
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
      DEBUG && console.log("[CACHE] GET", this.key(key), value);
      return value;
    } catch (err) {
      console.error("[CACHE] Error al leer caché:", err);
      return null;
    }
  }

  set<T>(key: string, value: T) {
    try {
      DEBUG && console.log("[CACHE] SET", this.key(key), value);
      localStorage.setItem(this.key(key), JSON.stringify(value));
    } catch (err) {
      console.error("[CACHE] Error al escribir caché:", err);
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
      DEBUG && console.warn("[CACHE] FALLBACK, usando valor cacheado:", err);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
      return {} as T;
    }
  }

  /** Limpia el caché SOLO de este usuario + sesión */
  clearAllForCurrent() {
    const prefix = `cache:${this.userId}:${this.sessionId}:`;
    DEBUG && console.log("[CACHE] CLEAR for user/session:", prefix);
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  }

  /** 🔥 Limpia TODO el caché de permisos de TODOS los usuarios/sesiones */
  static clearAll() {
    DEBUG && console.log("[CACHE] CLEAR ALL (global)");
    const prefix = "cache:";
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}
