/**
 * Logger de peticiones/respuestas API.
 * Principio SRP: responsabilidad única de trazabilidad HTTP.
 * Configurable por variables de entorno VITE_API_DEBUG / VITE_API_LOG_LEVEL
 * O en tiempo de ejecución desde la consola del navegador:
 *
 *   window.apiDebug(true)   → activa logs detallados (headers, body, timings)
 *   window.apiDebug(false)  → desactiva logs detallados (solo errores)
 *   window.apiDebug()       → muestra estado actual
 */

import type { ApiError } from './fetch';

// =============================================================================
// Clave de localStorage para el toggle runtime
// =============================================================================

const LS_KEY = 'API_DEBUG';

// =============================================================================
// Tipos internos
// =============================================================================

type LogLevel = 'none' | 'error' | 'info' | 'debug';

interface LogConfig {
  enabled: boolean;
  baseLevel: LogLevel;   // nivel compilado (env var)
  showTimings: boolean;
  maxBodyLength: number;
}

// =============================================================================
// Clase ApiLogger
// =============================================================================

export class ApiLogger {
  private readonly config: LogConfig;

  constructor() {
    const envDebug = import.meta.env.VITE_API_DEBUG === 'true';
    const envLevel = (
      import.meta.env.VITE_API_LOG_LEVEL || (envDebug ? 'debug' : 'error')
    ) as LogLevel;

    this.config = {
      enabled: import.meta.env.VITE_API_LOGGING !== 'false',
      baseLevel: envLevel,
      showTimings: import.meta.env.VITE_API_LOG_TIMINGS !== 'false',
      maxBodyLength: parseInt(import.meta.env.VITE_API_LOG_MAX_BODY || '2000', 10),
    };
  }

  // -------------------------------------------------------------------------
  // Toggle runtime: lee localStorage en cada llamada (sin reinicio)
  // -------------------------------------------------------------------------

  private isRuntimeDebug(): boolean {
    try {
      const val = localStorage.getItem(LS_KEY);
      if (val === 'true') return true;
      if (val === 'false') return false;
    } catch {
      // localStorage no disponible (SSR / incógnito bloqueado)
    }
    return false;
  }

  private effectiveLevel(): LogLevel {
    if (this.isRuntimeDebug()) return 'debug';
    return this.config.baseLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: LogLevel[] = ['none', 'error', 'info', 'debug'];
    const configLevelIndex = levels.indexOf(this.effectiveLevel());
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= configLevelIndex;
  }

  private isDebugActive(): boolean {
    return this.effectiveLevel() === 'debug';
  }

  private truncateBody(body: unknown): unknown {
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
        formatted[key] = value.substring(0, 30) + '...';
      } else {
        formatted[key] = value;
      }
    });
    return formatted;
  }

  logRequest(
    method: string,
    url: string,
    headers: Headers,
    body?: unknown,
    startTime?: number
  ): void {
    if (!this.shouldLog('debug')) return;

    const debug = this.isDebugActive();

    console.groupCollapsed(
      `%c→ ${method} %c${url}`,
      'color: #0ea5e9; font-weight: bold',
      'color: #64748b'
    );

    if (this.config.showTimings && startTime) {
      console.log(`⏱️ Started at: ${new Date(startTime).toISOString()}`);
    }

    if (debug) {
      console.log('📋 Headers:', this.formatHeaders(headers));
    }

    if (debug && body && !(body instanceof FormData)) {
      console.log('📦 Body:', this.truncateBody(body));
    } else if (debug && body instanceof FormData) {
      console.log('📦 Body: FormData (inspecciona en DevTools → Network)');
    }

    console.groupEnd();
  }

  logResponse(
    method: string,
    url: string,
    response: Response,
    data: unknown,
    duration: number
  ): void {
    if (!this.shouldLog('info')) return;

    const debug = this.isDebugActive();
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

    if (debug) {
      console.log('📋 Response Headers:', this.formatHeaders(response.headers));
    }

    if (debug) {
      if (data instanceof Blob) {
        console.log(`📦 Response: Blob (${data.size} bytes, type: ${data.type})`);
      } else {
        console.log('📦 Response Data:', this.truncateBody(data));
      }
    }

    console.groupEnd();
  }

  logError(
    method: string,
    url: string,
    error: ApiError | Error,
    duration: number,
    response?: Response
  ): void {
    if (!this.shouldLog('error')) return;

    const debug = this.isDebugActive();

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

    if ('code' in error) {
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

    if (debug && response) {
      console.log('📋 Response Headers:', this.formatHeaders(response.headers));
    }

    console.trace('📍 Stack trace');
    console.groupEnd();
  }
}

// =============================================================================
// Singleton exportado
// =============================================================================

export const apiLogger = new ApiLogger();

// =============================================================================
// Helper global para activar/desactivar desde la consola del navegador:
//   window.apiDebug(true)   → activa logs detallados
//   window.apiDebug(false)  → desactiva
//   window.apiDebug()       → muestra estado actual
// =============================================================================

declare global {
  interface Window {
    apiDebug: (enabled?: boolean) => void;
  }
}

window.apiDebug = (enabled?: boolean): void => {
  if (enabled === undefined) {
    const current = localStorage.getItem(LS_KEY);
    const active = current === 'true';
    console.info(
      `%c[ApiLogger] Debug logs: ${active ? '✅ ON' : '❌ OFF'}`,
      `color: ${active ? '#10b981' : '#ef4444'}; font-weight: bold`
    );
    console.info('  window.apiDebug(true)  → activar');
    console.info('  window.apiDebug(false) → desactivar');
    return;
  }

  localStorage.setItem(LS_KEY, String(enabled));
  console.info(
    `%c[ApiLogger] Debug logs ${enabled ? '✅ ACTIVADOS' : '❌ DESACTIVADOS'} — efectivo en la siguiente petición`,
    `color: ${enabled ? '#10b981' : '#ef4444'}; font-weight: bold`
  );
};
