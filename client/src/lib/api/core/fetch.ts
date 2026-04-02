/**
 * Cliente HTTP base para llamadas API.
 * Principio SRP: responsabilidad única de ejecutar peticiones HTTP con autenticación.
 * Maneja autenticación, timeouts, logging y errores de forma centralizada.
 */

import { tokenService } from '@/services/auth';
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

// =============================================================================
// Cliente HTTP principal
// =============================================================================

/**
 * Función base para todas las llamadas HTTP a la API.
 * Inyecta automáticamente el token Bearer, maneja timeouts y normaliza errores.
 */
export async function apiFetch<T = unknown>(
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
    ...(init.headers as Record<string, string> || {}),
  });

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const base = resolveBaseUrl(path);
  const url = `${base}${path}`;
  const method = (init.method || 'GET').toUpperCase();

  // Preparar body para logging (sin exponer datos sensibles)
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

  apiLogger.logRequest(method, url, headers, bodyForLog, startedEpoch);

  try {
    // Separar headers del init para evitar duplicados
    const { headers: _ignored, ...initWithoutHeaders } = init;

    const response = await fetch(url, {
      credentials: API_CONFIG.CREDENTIALS,
      ...initWithoutHeaders,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const elapsedMs = Math.round(nowMs() - started);
    const contentType = response.headers.get('content-type') || '';

    if (response.ok) {
      // 204 No Content
      if (response.status === 204) {
        apiLogger.logResponse(method, url, response, undefined, elapsedMs);
        return { status: 'success', data: undefined as unknown as T };
      }

      // Respuesta binaria (PDF, Excel, etc.)
      if (wantsBinaryResponse(headers, contentType) && !isJsonContentType(contentType)) {
        const blob = await response.blob();
        apiLogger.logResponse(method, url, response, blob, elapsedMs);
        return { status: 'success', data: blob as unknown as T };
      }

      // Respuesta JSON o texto
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

      // Si el backend ya devuelve un ApiResponse envuelto, pasarlo directamente
      if (
        parsed &&
        typeof parsed === 'object' &&
        'status' in (parsed as object)
      ) {
        return parsed as ApiResponse<T>;
      }

      return { status: 'success', data: parsed as T };
    }

    // ─── Respuesta con error HTTP ────────────────────────────────────────────
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
