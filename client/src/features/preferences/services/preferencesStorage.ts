// Caché local de las preferencias (nunca guarda tokens ni datos personales).
// Clave por usuario para la caché completa y una clave "visual" global que usa el script de
// index.html para aplicar tamaño de letra/contraste/animaciones antes del primer pintado.
import type { UserPreferences } from '@/types/userPreferences';

const USER_KEY_PREFIX = 'wsuta-prefs-';
export const VISUAL_KEY = 'wsuta-prefs-visual';
export const HOME_FLAG_KEY = 'wsuta-home-landing';
const HOME_REDIRECT_KEY = 'wsuta-home-redirect';
const RETURN_TO_KEY = 'wsuta-return-to';

export function readCachedPreferences(userId: string): UserPreferences | null {
  try {
    const raw = localStorage.getItem(USER_KEY_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as UserPreferences) : null;
  } catch {
    return null;
  }
}

export function writeCachedPreferences(userId: string, prefs: UserPreferences): void {
  try {
    localStorage.setItem(USER_KEY_PREFIX + userId, JSON.stringify(prefs));
    localStorage.setItem(
      VISUAL_KEY,
      JSON.stringify({
        fontScale: prefs.fontScale,
        density: prefs.density,
        highContrast: prefs.highContrast,
        reduceMotion: prefs.reduceMotion,
      })
    );
  } catch {
    /* almacenamiento no disponible (modo privado, cuota): la app funciona sin caché */
  }
}

export function clearCachedPreferences(userId: string): void {
  try {
    localStorage.removeItem(USER_KEY_PREFIX + userId);
    localStorage.removeItem(VISUAL_KEY);
  } catch {
    /* ignore */
  }
}

export function clearVisualCache(): void {
  try {
    localStorage.removeItem(VISUAL_KEY);
  } catch {
    /* ignore */
  }
}

export function readHomeFlag(): string | null {
  try {
    return sessionStorage.getItem(HOME_FLAG_KEY);
  } catch {
    return null;
  }
}

export function writeHomeFlag(value: 'pending' | 'done' | null): void {
  try {
    if (value === null) {
      sessionStorage.removeItem(HOME_FLAG_KEY);
      sessionStorage.removeItem(HOME_REDIRECT_KEY);
    } else sessionStorage.setItem(HOME_FLAG_KEY, value);
  } catch {
    /* ignore */
  }
}

/** Última redirección a la página de inicio: destino y momento (ms). */
export interface HomeRedirectRecord {
  target: string;
  at: number;
}

export function readHomeRedirect(): HomeRedirectRecord | null {
  try {
    const raw = sessionStorage.getItem(HOME_REDIRECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.target === 'string' && typeof parsed?.at === 'number' ? (parsed as HomeRedirectRecord) : null;
  } catch {
    return null;
  }
}

// ── Enlace directo: página pedida antes de iniciar sesión ────────────────────────

const RETURN_TO_PATTERN = /^\/[A-Za-z0-9._~\-/%]*(\?[A-Za-z0-9._~\-=&%]*)?$/;

/**
 * ¿Es una ruta interna segura a la que volver tras el login? Solo rutas relativas de la propia aplicación: sin esquema,
 * sin "//", sin ".." y fuera de las pantallas de autenticación (evita redirecciones abiertas y bucles con el login).
 */
export function isSafeReturnTo(path: string | null | undefined): path is string {
  if (!path || path.length > 300 || path.startsWith('//') || path.includes('..')) return false;
  if (!RETURN_TO_PATTERN.test(path)) return false;
  const pathname = path.split('?')[0];
  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/auth/') || pathname.startsWith('/firma-externa/')) return false;
  return true;
}

export function writeReturnTo(path: string): void {
  if (!isSafeReturnTo(path)) return;
  try {
    sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    /* ignore */
  }
}

/** Lee (sin borrar) la página pedida antes del login; null si no hay o no es segura. */
export function peekReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(RETURN_TO_KEY);
    return isSafeReturnTo(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearReturnTo(): void {
  try {
    sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    /* ignore */
  }
}

// En memoria (se reinicia con cada carga de la página): ¿ya hubo una sesión iniciada en esta carga?
let sessionAuthenticatedThisLoad = false;
export const markSessionAuthenticated = (): void => {
  sessionAuthenticatedThisLoad = true;
};
export const wasSessionAuthenticated = (): boolean => sessionAuthenticatedThisLoad;

export function writeHomeRedirect(target: string): void {
  try {
    sessionStorage.setItem(HOME_REDIRECT_KEY, JSON.stringify({ target, at: Date.now() } satisfies HomeRedirectRecord));
  } catch {
    /* ignore */
  }
}
