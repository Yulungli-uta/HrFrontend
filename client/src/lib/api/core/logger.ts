/**
 * Logger de peticiones/respuestas API.
 * Principio SRP: responsabilidad única de trazabilidad HTTP.
 * Configurable por variables de entorno VITE_API_DEBUG / VITE_API_LOG_LEVEL.
 */

import type { ApiError } from './fetch';

// =============================================================================
// Tipos internos
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

// =============================================================================
// Clase ApiLogger
// =============================================================================

export class ApiLogger {
  private readonly config: LogConfig;

  constructor() {
    const debugMode = import.meta.env.VITE_API_DEBUG === 'true';
    const logLevel = (
      import.meta.env.VITE_API_LOG_LEVEL || (debugMode ? 'debug' : 'error')
    ) as LogLevel;

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
        formatted[key] = value.substring(0, 20) + '...';
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

  logResponse(
    method: string,
    url: string,
    response: Response,
    data: unknown,
    duration: number
  ): void {
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

  logError(
    method: string,
    url: string,
    error: ApiError | Error,
    duration: number,
    response?: Response
  ): void {
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

    if (response && this.config.showHeaders) {
      console.log('📋 Response Headers:', this.formatHeaders(response.headers));
    }

    console.trace('📍 Stack trace');
    console.groupEnd();
  }
}

// Singleton exportado
export const apiLogger = new ApiLogger();
