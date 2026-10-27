// features/auth/services/sessionRecovery.ts
import type { PermissionLoadReason } from "@/services/permissions/permissionLoadError";

/**
 * Recuperación de sesión cuando no se pueden cargar los permisos: en lugar de dejar al
 * usuario con una sesión incompleta ("No tienes permisos") se cierra la sesión una vez
 * y se le pide volver a entrar. Un freno evita ciclos si el fallo persiste.
 */

const GUARD_KEY = "auth.reloginAt";
const NOTICE_KEY = "auth.reloginNotice";
const RETURN_TO_KEY = "auth.returnTo";

/** Ventana en la que no se vuelve a cerrar la sesión automáticamente. */
export const RELOGIN_GUARD_MS = 5 * 60 * 1000;

export const SESSION_RESET_REASON = "PERMISSIONS_RECOVERY";

/** Evento que avisa a un login ya montado de que hay un aviso nuevo (el cierre ocurre sin recargar la página). */
export const RELOGIN_NOTICE_EVENT = "auth:relogin-notice";

export interface ReloginNotice {
  code: string;
}

const REASON_LABEL: Record<string, string> = {
  TOKEN: "TOKEN",
  NETWORK: "RED",
  BAD_RESPONSE: "RESP",
};

/** Código corto para que el usuario lo comunique a DITIC. Ej.: S-RED-1323 */
export function buildRecoveryCode(reason: PermissionLoadReason, now: Date = new Date()): string {
  const label = reason.startsWith("HTTP_") ? `H${reason.slice(5)}` : (REASON_LABEL[reason] ?? "ERR");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `S-${label}-${hh}${mm}`;
}

function readNumber(storage: Storage, key: string): number | null {
  try {
    const raw = storage.getItem(key);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** true si todavía no se cerró la sesión por este motivo dentro de la ventana de freno. */
export function canForceRelogin(now: number = Date.now()): boolean {
  const last = readNumber(localStorage, GUARD_KEY);
  return last === null || now - last > RELOGIN_GUARD_MS;
}

export function markForcedRelogin(now: number = Date.now()): void {
  try {
    localStorage.setItem(GUARD_KEY, String(now));
  } catch {
    /* sin almacenamiento: el freno no aplica, pero el flujo sigue */
  }
}

export function setReloginNotice(notice: ReloginNotice): void {
  try {
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify(notice));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(RELOGIN_NOTICE_EVENT));
}

/**
 * Lee el aviso sin borrarlo: la pantalla de login puede montarse más de una vez durante el cierre
 * de sesión. Se borra solo al iniciar sesión correctamente (clearReloginNotice).
 */
export function readReloginNotice(): ReloginNotice | null {
  try {
    const raw = sessionStorage.getItem(NOTICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReloginNotice;
    return typeof parsed?.code === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearReloginNotice(): void {
  try {
    sessionStorage.removeItem(NOTICE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveReturnTo(path: string): void {
  if (!path || path === "/" || path.startsWith("/login")) return;
  try {
    sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    /* ignore */
  }
}

/** Ruta a la que volver tras iniciar sesión (solo rutas internas). */
export function consumeReturnTo(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_TO_KEY);
    if (!path) return null;
    sessionStorage.removeItem(RETURN_TO_KEY);
    return path.startsWith("/") && !path.startsWith("//") ? path : null;
  } catch {
    return null;
  }
}
