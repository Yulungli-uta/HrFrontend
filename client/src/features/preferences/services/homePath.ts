// Resolución y validación de la página de inicio configurable.
// No concede permisos: una ruta solo es elegible si el usuario ya tiene acceso (mismas reglas que
// ProtectedRoute: requiredPath contra permisos y requiredRoles). Si algo falla → "/".
import type { UserSession } from '@/features/auth';
import { PermissionService } from '@/services/permissions';

export const DEFAULT_HOME_PATH = '/';

/**
 * Tras iniciar sesión con Microsoft, AuthContext navega a "/" unos 300 ms después de completar el login
 * (setTimeout), es decir, DESPUÉS de que ya se redirigió a la página de inicio elegida. Si "/" vuelve a
 * mostrarse dentro de esta ventana desde la última redirección, se repite la redirección en vez de dejar
 * al usuario en la pantalla por defecto. Pasada la ventana, "/" vuelve a ser la pantalla normal.
 */
export const HOME_REDIRECT_REAPPLY_WINDOW_MS = 5000;

export function shouldReapplyHomeRedirect(
  record: { target: string; at: number } | null,
  now: number,
  windowMs: number = HOME_REDIRECT_REAPPLY_WINDOW_MS
): record is { target: string; at: number } {
  return !!record && record.target !== DEFAULT_HOME_PATH && now - record.at >= 0 && now - record.at < windowMs;
}

/** Subconjunto de RouteConfig que necesita el resolvedor (evita importar routes.config). */
export interface HomeRouteInfo {
  path: string;
  requiredPath?: string;
  requiredRoles?: string[];
}

export interface HomeOption {
  path: string;
  label: string;
  group: string;
}

const SAFE_PATH = /^\/([A-Za-z0-9._~-]+(\/[A-Za-z0-9._~-]+)*)?$/;

function normalize(path: string): string {
  const t = (path || '/').trim().replace(/\/+$/, '');
  return t === '' ? '/' : t;
}

/** ¿El usuario puede entrar a esta ruta estática? Misma lógica que ProtectedRoute. */
export function canAccessRoute(user: UserSession | null, route: HomeRouteInfo): boolean {
  if (!user) return false;
  if (route.requiredPath && !PermissionService.hasRouteAccess(user, route.requiredPath)) {
    const perms = (user.permissions ?? []).map(normalize);
    const required = normalize(route.requiredPath);
    if (!perms.some((p) => p !== '/' && required.startsWith(p + '/'))) return false;
  }
  if (route.requiredRoles?.length && !PermissionService.hasAnyRole(user, route.requiredRoles)) {
    return false;
  }
  return true;
}

/**
 * Opciones elegibles como página de inicio: hojas del menú del usuario cuya URL es una ruta
 * estática (sin parámetros) existente a la que realmente tiene acceso.
 */
export function getHomeOptions(user: UserSession | null, routes: HomeRouteInfo[]): HomeOption[] {
  const items = (user?.menuItems ?? []) as any[];
  if (!user || items.length === 0) return [];

  const byId = new Map<number, { name: string; parentId: number | null }>();
  for (const m of items) {
    const id = m.menuItemId ?? m.id;
    byId.set(id, { name: m.menuItemName ?? m.name ?? '', parentId: m.parentId ?? null });
  }
  const rootName = (id: number | null): string => {
    let cur = id !== null ? byId.get(id) : undefined;
    let guard = 0;
    while (cur && cur.parentId && guard++ < 10) cur = byId.get(cur.parentId);
    return cur?.name ?? '';
  };

  const routeByPath = new Map(
    routes
      .filter((r) => !r.path.includes(':') && !r.path.includes('*'))
      .map((r) => [normalize(r.path), r] as const)
  );

  const seen = new Set<string>();
  const options: HomeOption[] = [];
  for (const m of items) {
    const url: string | null = m.url ?? null;
    if (!url) continue;
    const path = normalize(url);
    if (path === DEFAULT_HOME_PATH || seen.has(path) || !SAFE_PATH.test(path)) continue;
    const route = routeByPath.get(path);
    if (!route || !canAccessRoute(user, route)) continue;
    seen.add(path);
    options.push({
      path,
      label: m.menuItemName ?? m.name ?? path,
      group: rootName(m.parentId ?? null),
    });
  }
  return options.sort((a, b) => (a.group + a.label).localeCompare(b.group + b.label, 'es'));
}

/** Devuelve la ruta a la que redirigir tras el login, o "/" si la guardada ya no es válida. */
export function resolveHomePath(
  homePath: string | undefined | null,
  user: UserSession | null,
  routes: HomeRouteInfo[]
): string {
  if (!homePath) return DEFAULT_HOME_PATH;
  const path = normalize(homePath);
  if (path === DEFAULT_HOME_PATH || !SAFE_PATH.test(path)) return DEFAULT_HOME_PATH;
  const allowed = getHomeOptions(user, routes).some((o) => o.path === path);
  return allowed ? path : DEFAULT_HOME_PATH;
}
