/**
 * Cliente HTTP base para llamadas API.
 * Principio SRP: responsabilidad única de ejecutar peticiones HTTP con autenticación.
 * Maneja autenticación, timeouts, logging, refresh automático y errores de forma centralizada.
 */

import { authService, tokenService } from '@/services/auth';
import { API_CONFIG, resolveBaseUrl } from './config';
import { apiLogger } from './logger';

// =============================================================================
// Tipos públicos
// =============================================================================

export type ApiResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

export interface ApiError {
  code: number;
  message: string;
  details?: unknown;
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

// =============================================================================
// Estado global de refresh (evita refresh simultáneos)
// =============================================================================

let refreshPromise: Promise<string | null> | null = null;

// =============================================================================
// Helpers internos
// =============================================================================

function nowMs(): number {
  return typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();
}

function newRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Enmascara campos sensibles en el payload para evitar exponer secretos en logs. */
function maskSensitive(obj: unknown): unknown {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(maskSensitive);
  if (typeof obj !== 'object') return obj;

  const clone: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  const sensitiveKeys = new Set(
    [
      'password',
      'currentPassword',
      'newPassword',
      'refreshToken',
      'accessToken',
      'token',
      'clientSecret',
      'secret',
    ].map((s) => s.toLowerCase())
  );

  for (const k of Object.keys(clone)) {
    if (sensitiveKeys.has(k.toLowerCase())) {
      clone[k] = '***';
    } else {
      clone[k] = maskSensitive(clone[k]);
    }
  }
  return clone;
}

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

function clearLocalSessionArtifacts(): void {
  try {
    tokenService.clearTokens();
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem('wsuta-last-activity');
    localStorage.removeItem('wsuta-employee-details');
  } catch {
    // ignore
  }
}

function redirectToLogin(): void {
  clearLocalSessionArtifacts();

  if (typeof window !== 'undefined') {
    const loginUrl = `${import.meta.env.BASE_URL}login`;
    const currentPath = window.location.pathname + window.location.search + window.location.hash;

    if (!currentPath.includes('/login')) {
      try {
        window.location.replace(loginUrl);
      } catch {
        window.location.href = loginUrl;
      }
    }
  }
}

function buildHeaders(initHeaders?: HeadersInit, token?: string | null): Headers {
  const headers = new Headers({
    ...API_CONFIG.DEFAULT_HEADERS,
    ...((initHeaders as Record<string, string>) || {}),
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function parseSuccessResponse<T>(
  response: Response,
  headers: Headers,
  method: string,
  url: string,
  elapsedMs: number
): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type') || '';

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

  let parsed: unknown = rawText;
  if (rawText && isJsonContentType(contentType)) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  apiLogger.logResponse(method, url, response, parsed, elapsedMs);

  if (parsed && typeof parsed === 'object' && 'status' in (parsed as object)) {
    return parsed as ApiResponse<T>;
  }

  return { status: 'success', data: parsed as T };
}

async function parseErrorResponse(
  response: Response,
  method: string,
  url: string,
  elapsedMs: number
): Promise<ApiResponse<never>> {
  const contentType = response.headers.get('content-type') || '';

  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    rawText = '';
  }

  let parsed: unknown = rawText;
  if (rawText && isJsonContentType(contentType)) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  apiLogger.logResponse(method, url, response, parsed, elapsedMs);

  let errorMessage = `Error HTTP ${response.status}`;
  let errorDetails: unknown = undefined;

  if (parsed && typeof parsed === 'object') {
    const p = parsed as Record<string, unknown>;
    errorMessage =
      (p.message as string) ||
      (p.error as string) ||
      (p.title as string) ||
      errorMessage;
    errorDetails = p.details ?? parsed;
  } else if (typeof parsed === 'string' && parsed.trim()) {
    errorMessage = parsed;
    errorDetails = { raw: parsed };
  }

  const apiError: ApiError = {
    code: response.status,
    message: errorMessage,
    details: errorDetails,
  };

  apiLogger.logError(method, url, apiError, elapsedMs, response);

  return { status: 'error', error: apiError };
}

async function executeRequest(
  url: string,
  headers: Headers,
  initWithoutHeaders: RequestInit,
  controller: AbortController
): Promise<Response> {
  return fetch(url, {
    credentials: API_CONFIG.CREDENTIALS,
    ...initWithoutHeaders,
    headers,
    signal: controller.signal,
  });
}

/**
 * Intenta renovar el access token usando un único refresh compartido.
 * Si varias requests reciben 401 al mismo tiempo, todas esperan la misma promesa.
 */
async function getFreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) return null;

      const newTokens = await authService.refreshToken(refreshToken);
      tokenService.setTokens(newTokens);

      return newTokens.accessToken;
    } catch (error) {
      console.error('[API] Error refreshing access token:', error);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// =============================================================================
// Cliente HTTP principal
// =============================================================================

/**
 * Función base para todas las llamadas HTTP a la API.
 * Inyecta automáticamente el token Bearer, maneja timeouts y normaliza errores.
 * Si recibe 401, intenta renovar el access token una sola vez y reintenta la petición.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const requestId = newRequestId();
  const started = nowMs();
  const startedEpoch = Date.now();

  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? API_CONFIG.TIMEOUT;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const base = resolveBaseUrl(path);
  const url = `${base}${path}`;
  const method = (init.method || 'GET').toUpperCase();

  let bodyForLog: unknown = undefined;
  if (init.body instanceof FormData) {
    bodyForLog = init.body;
  } else if (init.body != null) {
    try {
      bodyForLog =
        typeof init.body === 'string' ? JSON.parse(init.body as string) : init.body;
    } catch {
      bodyForLog = init.body;
    }
    bodyForLog = maskSensitive(bodyForLog);
  }

  try {
    const { headers: _ignored, timeoutMs: _ignoredTimeout, ...initWithoutHeaders } = init;

    let accessToken = tokenService.getAccessToken();
    let headers = buildHeaders(init.headers, accessToken);

    apiLogger.logRequest(method, url, headers, bodyForLog, startedEpoch);

    let response = await executeRequest(url, headers, initWithoutHeaders, controller);

    // Si no está autorizado, intentar refresh y reintentar una sola vez
    if (response.status === 401) {
      const newAccessToken = await getFreshAccessToken();

      if (newAccessToken) {
        accessToken = newAccessToken;
        headers = buildHeaders(init.headers, accessToken);

        apiLogger.logRequest(
          `${method} (RETRY)`,
          url,
          headers,
          bodyForLog,
          Date.now()
        );

        response = await executeRequest(url, headers, initWithoutHeaders, controller);
      } else {
        clearTimeout(timeoutId);

        const elapsedMs = Math.round(nowMs() - started);
        const errorResult = await parseErrorResponse(response, method, url, elapsedMs);

        redirectToLogin();
        return errorResult as ApiResponse<T>;
      }
    }

    clearTimeout(timeoutId);

    const elapsedMs = Math.round(nowMs() - started);

    if (response.ok) {
      return await parseSuccessResponse<T>(response, headers, method, url, elapsedMs);
    }

    const errorResult = await parseErrorResponse(response, method, url, elapsedMs);

    // Si incluso después del retry sigue siendo 401, cerrar sesión
    if (response.status === 401) {
      redirectToLogin();
    }

    return errorResult as ApiResponse<T>;
  } catch (error) {
    clearTimeout(timeoutId);

    const elapsedMs = Math.round(nowMs() - started);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        const apiError: ApiError = {
          code: 408,
          message: 'La solicitud excedió el tiempo de espera',
          details: { timeout: timeoutMs, requestId },
        };

        apiLogger.logError(method, url, apiError, elapsedMs);

        return { status: 'error', error: apiError };
      }

      apiLogger.logError(method, url, error, elapsedMs);

      return {
        status: 'error',
        error: {
          code: 0,
          message: error.message || 'Error de conexión',
          details: { error, requestId },
        },
      };
    }

    apiLogger.logError(method, url, new Error('Error desconocido'), elapsedMs);

    return {
      status: 'error',
      error: {
        code: 0,
        message: 'Error desconocido',
        details: { error, requestId },
      },
    };
  }
}