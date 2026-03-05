/**
 * Cliente HTTP base para llamadas API
 * Maneja autenticación, timeouts y errores de forma centralizada
 * + Logging completo request/response (toggle por env)
 */

import { tokenService } from '@/services/auth';

// =============================================================================
// Configuración
// =============================================================================

export const API_CONFIG = {
  // RH / API principal (5000)
  RH_BASE_URL:
    import.meta.env.VITE_RH_API_BASE ||
    import.meta.env.VITE_RH_API_BASE_URL ||
    import.meta.env.VITE_API_BASE ||
    "http://localhost:5000",

  // Auth / Notificaciones (5010)
  AUTH_BASE_URL:
    import.meta.env.VITE_AUTH_API_BASE_URL ||
    import.meta.env.VITE_AUTH_API_BASE ||
    import.meta.env.VITE_API_AUTH_BASE ||
    "http://localhost:5010",

  // Reportes (si debe ir a una dirección distinta)
  REPORTS_BASE_URL:
    import.meta.env.VITE_REPORTS_API_BASE_URL ||
    import.meta.env.VITE_REPORTS_API_BASE ||
    "http://localhost:5050",

  // Files (si lo usas como servicio separado; por defecto cae en RH)
  FILES_BASE_URL:
    import.meta.env.VITE_FILES_API_BASE ||
    import.meta.env.VITE_FILES_API_BASE_URL ||
    import.meta.env.VITE_API_BASE ||
    "http://localhost:5000",

  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  TIMEOUT: 30000, // 30 segundos
  CREDENTIALS: "include" as RequestCredentials
};

// =============================================================================
// Tipos
// =============================================================================

export type ApiResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

export interface ApiError {
  code: number;
  message: string;
  details?: any;
}

// =============================================================================
// Logging (request/response tracing) - configurable por variables de entorno
// =============================================================================

type LogLevel = 'none' | 'error' | 'info' | 'debug';

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  showTimings: boolean;
  showHeaders: boolean;
  showBody: boolean;
  maxBodyLength: number;
}

class ApiLogger {
  private config: LogConfig;

  constructor() {
    const debugMode = import.meta.env.VITE_API_DEBUG === 'true';
    const logLevel = (import.meta.env.VITE_API_LOG_LEVEL || (debugMode ? 'debug' : 'error')) as LogLevel;

    this.config = {
      enabled: import.meta.env.VITE_API_LOGGING !== 'false',
      level: logLevel,
      showTimings: import.meta.env.VITE_API_LOG_TIMINGS !== 'false',
      showHeaders: debugMode,
      showBody: debugMode,
      maxBodyLength: parseInt(import.meta.env.VITE_API_LOG_MAX_BODY || '1000', 10),
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: LogLevel[] = ['none', 'error', 'info', 'debug'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= configLevelIndex;
  }

  private truncateBody(body: any): any {
    if (!body) return body;

    const str = typeof body === 'string' ? body : JSON.stringify(body);
    if (str.length <= this.config.maxBodyLength) {
      return body;
    }

    return (
      str.substring(0, this.config.maxBodyLength) +
      `... (truncated ${str.length - this.config.maxBodyLength} chars)`
    );
  }

  private formatHeaders(headers: Headers): Record<string, string> {
    const formatted: Record<string, string> = {};
    headers.forEach((value, key) => {
      if (key.toLowerCase() === 'authorization') {
        formatted[key] = value.substring(0, 20) + '...';
      } else {
        formatted[key] = value;
      }
    });
    return formatted;
  }

  logRequest(method: string, url: string, headers: Headers, body?: any, startTime?: number): void {
    if (!this.shouldLog('debug')) return;

    console.groupCollapsed(
      `%c→ ${method} %c${url}`,
      'color: #0ea5e9; font-weight: bold',
      'color: #64748b'
    );

    if (this.config.showTimings && startTime) {
      console.log(`⏱️ Started at: ${new Date(startTime).toISOString()}`);
    }

    if (this.config.showHeaders) {
      console.log('📋 Headers:', this.formatHeaders(headers));
    }

    if (this.config.showBody && body && !(body instanceof FormData)) {
      console.log('📦 Body:', this.truncateBody(body));
    } else if (body instanceof FormData) {
      console.log('📦 Body: FormData (use browser DevTools to inspect)');
    }

    console.groupEnd();
  }

  logResponse(method: string, url: string, response: Response, data: any, duration: number): void {
    if (!this.shouldLog('info')) return;

    const status = response.status;
    const isSuccess = status >= 200 && status < 300;
    const color = isSuccess ? '#10b981' : '#f59e0b';
    const icon = isSuccess ? '✓' : '⚠';

    console.groupCollapsed(
      `%c${icon} ${method} %c${status} %c${url} %c${duration}ms`,
      `color: ${color}; font-weight: bold`,
      `color: ${color}; font-weight: bold`,
      'color: #64748b',
      'color: #8b5cf6; font-weight: bold'
    );

    if (this.config.showTimings) {
      console.log(`⏱️ Duration: ${duration}ms`);
      console.log(`📅 Completed at: ${new Date().toISOString()}`);
    }

    if (this.config.showHeaders) {
      console.log('📋 Response Headers:', this.formatHeaders(response.headers));
    }

    if (this.config.showBody) {
      if (data instanceof Blob) {
        console.log(`📦 Response: Blob (${data.size} bytes, type: ${data.type})`);
      } else {
        console.log('📦 Response Data:', this.truncateBody(data));
      }
    }

    console.groupEnd();
  }

  logError(method: string, url: string, error: ApiError | Error, duration: number, response?: Response): void {
    if (!this.shouldLog('error')) return;

    console.groupCollapsed(
      `%c✗ ${method} %c${url} %cFAILED %c${duration}ms`,
      'color: #ef4444; font-weight: bold',
      'color: #64748b',
      'color: #ef4444; font-weight: bold',
      'color: #8b5cf6; font-weight: bold'
    );

    if (this.config.showTimings) {
      console.log(`⏱️ Duration: ${duration}ms`);
      console.log(`📅 Failed at: ${new Date().toISOString()}`);
    }

    if ('code' in (error as any)) {
      const e = error as ApiError;
      console.error('❌ API Error:', {
        code: e.code,
        message: e.message,
        details: e.details,
      });
    } else {
      const e = error as Error;
      console.error('❌ Network Error:', e.message);
    }

    if (response && this.config.showHeaders) {
      console.log('📋 Response Headers:', this.formatHeaders(response.headers));
    }

    console.trace('📍 Stack trace');
    console.groupEnd();
  }
}

const apiLogger = new ApiLogger();

function nowMs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function newRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// En logs, evita exponer secretos comunes en payloads.
function maskSensitive(obj: any): any {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(maskSensitive);
  if (typeof obj !== 'object') return obj;

  const clone: any = { ...obj };
  const sensitiveKeys = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'refreshToken',
    'accessToken',
    'token',
    'clientSecret',
    'secret',
  ].map(s => s.toLowerCase()));

  for (const k of Object.keys(clone)) {
    if (sensitiveKeys.has(k.toLowerCase())) {
      clone[k] = '***';
    } else {
      clone[k] = maskSensitive(clone[k]);
    }
  }
  return clone;
}

// =============================================================================
// Resolución de Base URL (RH vs AUTH vs FILES)
// =============================================================================

function resolveBaseUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return '';

  // Reportes debe resolverse aparte (más específico que /api/v1/rh)
  if (path.startsWith('/api/v1/rh/reports')) return API_CONFIG.REPORTS_BASE_URL;

  if (path.startsWith('/api/v1/rh')) return API_CONFIG.RH_BASE_URL;

  if (path.startsWith('/api/auth') || path.startsWith('/api/app-auth')) {
    return API_CONFIG.AUTH_BASE_URL;
  }

  if (path.startsWith('/api/files') || path.startsWith('/files')) {
    return API_CONFIG.FILES_BASE_URL;
  }

  // ✅ Endpoints que en este frontend se consumen como parte del servicio Auth
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

  if (AUTH_PREFIXES.some(p => path.startsWith(p))) {
    return API_CONFIG.AUTH_BASE_URL;
  }

  // Excepción heredada: si estas rutas viven en RH, mantenerlo; si no, eliminar.
  const rhUsersPermissionsRegex =
    /^\/api\/users\/[^/]+\/(permissions|roles|menu-items|permissions-urls)(\/|$)/i;

  if (rhUsersPermissionsRegex.test(path)) {
    return API_CONFIG.RH_BASE_URL;
  }

  // Default
  return API_CONFIG.RH_BASE_URL;
}

// =============================================================================
// Helpers para detectar descargas (PDF/Excel/etc.)
// =============================================================================

function isJsonContentType(contentType: string): boolean {
  return contentType.includes('application/json') || contentType.includes('+json');
}

function wantsBinaryResponse(finalHeaders: Headers, contentType: string): boolean {
  const accept = (finalHeaders.get('Accept') || '').toLowerCase();

  const ct = (contentType || '').toLowerCase();
  if (ct.includes('application/pdf')) return true;
  if (ct.includes('application/vnd')) return true;
  if (ct.includes('application/octet-stream')) return true;

  if (accept.includes('application/pdf')) return true;
  if (accept.includes('application/vnd')) return true;
  if (accept.includes('application/octet-stream')) return true;

  return false;
}

// =============================================================================
// Cliente HTTP
// =============================================================================

export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const requestId = newRequestId();
  const started = nowMs();
  const startedEpoch = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  const accessToken = tokenService.getAccessToken();

  const headers = new Headers({
    ...API_CONFIG.DEFAULT_HEADERS,
    ...(init.headers || {})
  });

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const base = resolveBaseUrl(path);
  const url = `${base}${path}`;

  const method = (init.method || 'GET').toUpperCase();

  let bodyForLog: any = undefined;
  if (init.body instanceof FormData) {
    bodyForLog = init.body;
  } else if (init.body != null) {
    try {
      bodyForLog = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    } catch {
      bodyForLog = init.body;
    }
    bodyForLog = maskSensitive(bodyForLog);
  }

  apiLogger.logRequest(method, url, headers, bodyForLog, startedEpoch);

  try {
    const { headers: _ignoredHeaders, ...initWithoutHeaders } = init;

    const response = await fetch(url, {
      credentials: API_CONFIG.CREDENTIALS,
      ...initWithoutHeaders,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const elapsedMs = Math.round(nowMs() - started);
    const contentType = response.headers.get('content-type') || '';

    if (response.ok) {
      if (response.status === 204) {
        apiLogger.logResponse(method, url, response, undefined, elapsedMs);
        return { status: 'success', data: undefined as unknown as T };
      }

      if (wantsBinaryResponse(headers, contentType) && !isJsonContentType(contentType)) {
        const blob = await response.blob();
        apiLogger.logResponse(method, url, response, blob, elapsedMs);
        return { status: 'success', data: blob as unknown as T };
      }

      let rawText = '';
      try {
        rawText = await response.text();
      } catch {
        rawText = '';
      }

      let parsed: any = rawText;
      if (rawText && isJsonContentType(contentType)) {
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = rawText;
        }
      }

      apiLogger.logResponse(method, url, response, parsed, elapsedMs);

      if (parsed && typeof parsed === 'object' && 'status' in parsed) {
        return parsed as ApiResponse<T>;
      }

      return { status: 'success', data: parsed as T };
    }

    const elapsed = elapsedMs;
    const ct = contentType;

    let rawText = '';
    try {
      rawText = await response.text();
    } catch {
      rawText = '';
    }

    let parsed: any = rawText;
    if (rawText && isJsonContentType(ct)) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = rawText;
      }
    }

    apiLogger.logResponse(method, url, response, parsed, elapsed);

    let errorMessage = `Error HTTP ${response.status}`;
    let errorDetails: any = undefined;

    if (parsed && typeof parsed === 'object') {
      errorMessage =
        (parsed as any).message ||
        (parsed as any).error ||
        (parsed as any).title ||
        errorMessage;
      errorDetails = (parsed as any).details || parsed;
    } else if (typeof parsed === 'string' && parsed.trim()) {
      errorMessage = parsed;
      errorDetails = { raw: parsed };
    }

    const apiError: ApiError = {
      code: response.status,
      message: errorMessage,
      details: errorDetails,
    };

    apiLogger.logError(method, url, apiError, elapsed, response);

    return {
      status: 'error',
      error: apiError
    };

  } catch (error) {
    clearTimeout(timeoutId);

    const elapsedMs = Math.round(nowMs() - started);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        const apiError: ApiError = {
          code: 408,
          message: 'La solicitud excedió el tiempo de espera',
          details: { timeout: API_CONFIG.TIMEOUT, requestId },
        };

        apiLogger.logError(method, url, apiError, elapsedMs);

        return {
          status: 'error',
          error: {
            code: 408,
            message: 'La solicitud excedió el tiempo de espera',
            details: { timeout: API_CONFIG.TIMEOUT, requestId }
          }
        };
      }

      apiLogger.logError(method, url, error, elapsedMs);

      return {
        status: 'error',
        error: {
          code: 0,
          message: error.message || 'Error de conexión',
          details: { error, requestId }
        }
      };
    }

    apiLogger.logError(method, url, new Error('Error desconocido'), elapsedMs);

    return {
      status: 'error',
      error: {
        code: 0,
        message: 'Error desconocido',
        details: { error, requestId }
      }
    };
  }
}

// =============================================================================
// Funciones auxiliares para CRUD
// =============================================================================

// =============================================================================
// Tipos de Paginación
// =============================================================================

/**
 * Parámetros para solicitudes paginadas al backend.
 * Corresponde al nuevo método GetPagedAsync del backend.
 */
export interface PagedRequest {
  /** Número de página (base 1). */
  page: number;
  /** Cantidad de registros por página. */
  pageSize: number;
  /** Campo por el que ordenar (opcional). */
  sortBy?: string;
  /** Dirección del orden: 'asc' | 'desc' (opcional). */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Respuesta paginada del backend.
 * Corresponde al DTO PagedResult<T> del backend.
 */
export interface PagedResult<T> {
  /** Lista de registros de la página actual. */
  items: T[];
  /** Número de página actual (base 1). */
  page: number;
  /** Cantidad de registros por página. */
  pageSize: number;
  /** Total de registros en la base de datos. */
  totalCount: number;
  /** Total de páginas calculadas. */
  totalPages: number;
  /** Indica si existe una página anterior. */
  hasPreviousPage: boolean;
  /** Indica si existe una página siguiente. */
  hasNextPage: boolean;
}

// =============================================================================
// Fábrica de servicios CRUD
// =============================================================================

export function createCrudService<TEntity, TInsert = TEntity, TUpdate = Partial<TInsert>>(
  basePath: string
) {
  return {
    /**
     * Obtiene todos los registros sin paginación.
     * @deprecated Usar listPaged() para listas grandes. Mantener para catálogos pequeños.
     */
    list: () => apiFetch<TEntity[]>(basePath),

    /**
     * Obtiene registros paginados desde el backend.
     * Usa el endpoint GET /basePath/paged?page=1&pageSize=20
     */
    listPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<TEntity>>> => {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        ...(params.sortBy ? { sortBy: params.sortBy } : {}),
        ...(params.sortDirection ? { sortDirection: params.sortDirection } : {})
      });
      return apiFetch<PagedResult<TEntity>>(`${basePath}/paged?${qs.toString()}`);
    },

    get: (id: string | number) => apiFetch<TEntity>(`${basePath}/${id}`),
    create: (data: TInsert) => apiFetch<TEntity>(basePath, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: string | number, data: TUpdate) => apiFetch<TEntity>(`${basePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: string | number) => apiFetch<void>(`${basePath}/${id}`, {
      method: 'DELETE'
    })
  };
}
