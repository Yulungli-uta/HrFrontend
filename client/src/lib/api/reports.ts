// lib/api/reports.ts

import type {
  ReportType,
  ReportFormat,
  ReportFilter,
  PreviewResponse,
  ReportAudit,
  ReportAuditFilter,
} from '@/types/reports';

// ============================================
// Error personalizado
// ============================================

export class ApiError extends Error {
  public status?: number;
  public url?: string;
  public details?: unknown;

  constructor(message: string, options?: { status?: number; url?: string; details?: unknown; cause?: unknown }) {
    super(message);
    this.name = 'ApiError';

    if (options?.status !== undefined) this.status = options.status;
    if (options?.url !== undefined) this.url = options.url;
    if (options?.details !== undefined) this.details = options.details;

    // @ts-expect-error: 'cause' existe en Error moderno
    if (options?.cause) this.cause = options.cause;
  }
}

// ============================================
// Helpers de logging (solo en DEV)
// ============================================

const isDev = import.meta.env.DEV === true;

function maskHeaders(headers: HeadersInit | undefined): HeadersInit | undefined {
  if (!headers) return headers;

  // Normalizar a objeto simple
  const plain: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      plain[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      plain[key] = value;
    }
  } else {
    Object.assign(plain, headers);
  }

  if (plain['Authorization']) {
    plain['Authorization'] = '***MASKED***';
  }

  return plain;
}

function safeParseBodyForLog(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

function logApiRequest(url: string, options: RequestInit) {
  if (!isDev) return;

  console.groupCollapsed(
    `%c[API Request] → ${options.method ?? 'GET'} ${url}`,
    'color:#0ea5e9;font-weight:bold;'
  );
  console.log('URL:', url);
  console.log('Method:', options.method ?? 'GET');
  console.log('Headers:', maskHeaders(options.headers));
  console.log('Body:', safeParseBodyForLog(options.body as any));
  console.groupEnd();
}

function logApiResponse(url: string, response: Response, body: unknown) {
  if (!isDev) return;

  console.groupCollapsed(
    `%c[API Response] ✓ ${response.status} ${url}`,
    'color:#22c55e;font-weight:bold;'
  );
  console.log('Status:', response.status);
  console.log('OK:', response.ok);
  console.log('Content-Type:', response.headers.get('content-type'));
  console.log('Body:', body);
  console.groupEnd();
}

function logApiHttpError(url: string, response: Response, body: unknown, friendlyMessage: string) {
  if (!isDev) return;

  console.group(
    `%c[API Error HTTP ${response.status}] ${url}`,
    'color:#f97316;font-weight:bold;'
  );
  console.error('Status:', response.status);
  console.error('StatusText:', response.statusText);
  console.error('URL:', url);
  console.error('Mensaje amigable:', friendlyMessage);
  console.error('Response body:', body);
  console.groupEnd();
}

function logApiNetworkError(url: string, error: unknown) {
  if (!isDev) return;

  console.group(
    `%c[API Error Network] ${url}`,
    'color:#ef4444;font-weight:bold;'
  );
  console.error('No se pudo conectar al servidor.');
  console.error('Error:', error);
  console.groupEnd();
}

// ============================================
// Servicio de Reportes
// ============================================

class ReportService {
  private baseUrl = '/api/v1/rh/reports';

  /**
   * Obtiene la URL base desde las variables de entorno de Vite
   */
  private getApiBaseUrl(): string {
    const baseUrl = import.meta.env.VITE_API_BASE;
    if (!baseUrl) {
      console.warn('[ReportService] VITE_API_BASE no está definida, usando rutas relativas.');
      return '';
    }
    return baseUrl.replace(/\/+$/, '');
  }

  /**
   * Construye la URL completa del endpoint
   */
  private buildFullUrl(endpoint: string): string {
    return `${this.getApiBaseUrl()}${endpoint}`;
  }

  /**
   * Construye la ruta relativa al backend para un reporte
   */
  private buildEndpoint(type: ReportType, format: ReportFormat, action: 'preview' | 'download'): string {
    if (action === 'preview') {
      // POST /reports/{type}/preview
      return `${this.baseUrl}/${type}/preview`;
    }

    // Descargas
    if (format === 'pdf') {
      // POST /reports/{type}/pdf/download
      return `${this.baseUrl}/${type}/pdf/download`;
    }

    // Excel
    return `${this.baseUrl}/${type}/excel`;
  }

  // ============================================
  // apiFetch -> Para endpoints JSON
  // ============================================

  private async apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('accessToken');

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const finalOptions: RequestInit = {
      ...options,
      method: options.method ?? 'GET',
      headers: {
        ...defaultHeaders,
        ...(options.headers ?? {}),
      },
      credentials: 'include',
    };

    logApiRequest(url, finalOptions);

    let response: Response;

    // Errores de red (no llega al servidor)
    try {
      response = await fetch(url, finalOptions);
    } catch (error) {
      logApiNetworkError(url, error);
      throw new ApiError('No se pudo conectar con el servidor.', { url, cause: error });
    }

    const contentType = response.headers.get('content-type') ?? '';
    let body: unknown = null;

    // Parsear respuesta
    try {
      if (contentType.includes('application/json')) {
        body = await response.json();
      } else {
        const text = await response.text();
        body = text || null;
      }
    } catch {
      body = null;
    }

    // Si no fue OK, construir mensaje amigable con más detalle
    if (!response.ok) {
      const anyBody = body as any;
      const friendlyMessage =
        anyBody?.message ||
        anyBody?.error?.message ||
        response.statusText ||
        `Error inesperado (${response.status})`;

      logApiHttpError(url, response, body, friendlyMessage);

      throw new ApiError(friendlyMessage, {
        status: response.status,
        url,
        details: body,
      });
    }

    logApiResponse(url, response, body);

    return body as T;
  }

  // ============================================
  // PREVIEW → POST + JSON (con base64)
  // ============================================

  async preview(type: ReportType, filter?: ReportFilter): Promise<PreviewResponse['data']> {
    const endpoint = this.buildEndpoint(type, 'pdf', 'preview');
    const fullUrl = this.buildFullUrl(endpoint);

    const response = await this.apiFetch<PreviewResponse>(fullUrl, {
      method: 'POST',
      body: JSON.stringify(filter ?? {}),
    });

    if (response.status === 'error') {
      // Esto ya viene del backend formateado como error
      throw new ApiError(response.error.message, { details: response.error });
    }

    return response.data;
  }

  // ============================================
  // DOWNLOAD → POST + BLOB
  // ============================================

  async download(type: ReportType, format: ReportFormat, filter?: ReportFilter): Promise<Blob> {
    const endpoint = this.buildEndpoint(type, format, 'download');
    const fullUrl = this.buildFullUrl(endpoint);

    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const options: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(filter ?? {}),
      credentials: 'include',
    };

    logApiRequest(fullUrl, options);

    let response: Response;

    try {
      response = await fetch(fullUrl, options);
    } catch (error) {
      logApiNetworkError(fullUrl, error);
      throw new ApiError('No se pudo conectar con el servidor para descargar el reporte.', {
        url: fullUrl,
        cause: error,
      });
    }

    if (!response.ok) {
      let body: unknown = null;
      const contentType = response.headers.get('content-type') ?? '';

      try {
        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }
      } catch {
        body = null;
      }

      const anyBody = body as any;
      const friendlyMessage =
        anyBody?.message ||
        anyBody?.error?.message ||
        response.statusText ||
        `Error al descargar reporte (${response.status})`;

      logApiHttpError(fullUrl, response, body, friendlyMessage);

      throw new ApiError(friendlyMessage, {
        status: response.status,
        url: fullUrl,
        details: body,
      });
    }

    if (isDev) {
      console.groupCollapsed(
        `%c[API Response] ✓ DOWNLOAD ${response.status} ${fullUrl}`,
        'color:#22c55e;font-weight:bold;'
      );
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.groupEnd();
    }

    return await response.blob();
  }

  // ============================================
  // AUDITS → GET + querystring
  // ============================================

  async getAudits(filter?: ReportAuditFilter): Promise<ReportAudit[]> {
    const params = new URLSearchParams();

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const query = params.toString();
    const url = this.buildFullUrl(
      query ? `${this.baseUrl}/audits?${query}` : `${this.baseUrl}/audits`
    );

    return await this.apiFetch<ReportAudit[]>(url);
  }
}

export const reportService = new ReportService();
export default reportService;

// ============================================
// Utilidad: descarga de Blob
// ============================================

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;

  // Opcional: log mínimo en DEV
  if (isDev) {
    console.log('[downloadBlob] Descargando archivo:', { fileName, size: blob.size });
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
