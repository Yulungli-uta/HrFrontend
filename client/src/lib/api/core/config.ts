/**
 * Configuración centralizada de la API.
 * Principio SRP: este módulo sólo gestiona la configuración y resolución de base URL.
 */

// =============================================================================
// Configuración
// =============================================================================

export interface ApiConfigType {
  RH_BASE_URL: string;
  AUTH_BASE_URL: string;
  REPORTS_BASE_URL: string;
  FILES_BASE_URL: string;
  DEFAULT_HEADERS: Record<string, string>;
  TIMEOUT: number;
  CREDENTIALS: RequestCredentials;
}

export const API_CONFIG: ApiConfigType = {
  // RH / API principal (5000)
  RH_BASE_URL:
    import.meta.env.VITE_RH_API_BASE ||
    import.meta.env.VITE_RH_API_BASE_URL ||
    import.meta.env.VITE_API_BASE ||
    'http://localhost:5000',

  // Auth / Notificaciones (5010)
  AUTH_BASE_URL:
    import.meta.env.VITE_AUTH_API_BASE_URL ||
    import.meta.env.VITE_AUTH_API_BASE ||
    import.meta.env.VITE_API_AUTH_BASE ||
    'http://localhost:5010',

  // Reportes (si debe ir a una dirección distinta)
  REPORTS_BASE_URL:
    import.meta.env.VITE_REPORTS_API_BASE_URL ||
    import.meta.env.VITE_REPORTS_API_BASE ||
    'http://localhost:5050',

  // Files (si lo usas como servicio separado; por defecto cae en RH)
  FILES_BASE_URL:
    import.meta.env.VITE_FILES_API_BASE ||
    import.meta.env.VITE_FILES_API_BASE_URL ||
    import.meta.env.VITE_API_BASE ||
    'http://localhost:5000',

  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },

  TIMEOUT: 30000, // 30 segundos

  CREDENTIALS: 'include' as RequestCredentials,
};

// =============================================================================
// Resolución de Base URL (RH vs AUTH vs FILES)
// =============================================================================

/**
 * Determina la base URL correcta para un path dado.
 * Principio OCP: agregar nuevos prefijos sin modificar la lógica existente.
 */
export function resolveBaseUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return '';

  // Reportes (más específico que /api/v1/rh)
  if (path.startsWith('/api/v1/rh/reports')) return API_CONFIG.REPORTS_BASE_URL;

  if (path.startsWith('/api/v1/rh')) return API_CONFIG.RH_BASE_URL;

  if (path.startsWith('/api/auth') || path.startsWith('/api/app-auth')) {
    return API_CONFIG.AUTH_BASE_URL;
  }

  if (path.startsWith('/api/files') || path.startsWith('/files')) {
    return API_CONFIG.FILES_BASE_URL;
  }

  // Endpoints que se consumen como parte del servicio Auth
  const AUTH_PREFIXES = [
    '/api/users',
    '/api/roles',
    '/api/user-roles',
    '/api/menu-items',
    '/api/menu',
    '/api/role-menu-items',
    '/api/notifications',
    '/api/app-params',
    '/api/audit-log',
    '/api/azure-management',
    '/api/azure-sync-log',
    '/api/hr-sync-log',
    '/api/failed-logins',
    '/api/local-credentials',
    '/api/login-history',
    '/api/permission-change-history',
    '/api/permissions',
    '/api/role-change-history',
    '/api/security-tokens',
    '/api/sessions',
    '/api/user-activity',
    '/api/user-employees',
  ];

  if (AUTH_PREFIXES.some((p) => path.startsWith(p))) {
    return API_CONFIG.AUTH_BASE_URL;
  }

  // Excepción: rutas de usuarios con permisos/roles que viven en RH
  const rhUsersPermissionsRegex =
    /^\/api\/users\/[^/]+\/(permissions|roles|menu-items|permissions-urls)(\/|$)/i;

  if (rhUsersPermissionsRegex.test(path)) {
    return API_CONFIG.RH_BASE_URL;
  }

  return API_CONFIG.RH_BASE_URL;
}
