// src/lib/api/services/reports.ts

import { apiFetch, type ApiResponse } from '../core/fetch';
import type {
  ReportType,
  ReportFormat,
  ReportFilter,
  PreviewResponse,
  ReportAudit,
  ReportAuditFilter,
} from '@/types/reports';

export class ReportError extends Error {
  public status?: number;
  public url?: string;
  public details?: unknown;

  constructor(
    message: string,
    options?: { status?: number; url?: string; details?: unknown; cause?: unknown }
  ) {
    super(message);
    this.name = 'ReportError';
    if (options?.status !== undefined) this.status = options.status;
    if (options?.url !== undefined) this.url = options.url;
    if (options?.details !== undefined) this.details = options.details;

    if (options?.cause) this.cause = options.cause;
  }
}

class ReportService {
  private baseUrl = '/api/v1/rh/reports';

  /**
   * Construye el endpoint v2 genérico.
   * Rutas: POST /api/v1/rh/reports/v2/{type}/preview|pdf/download|excel
   *
   * El backend acepta cualquier slug registrado en ReportTypeMapper:
   * employees | attendance | departments | attendancesumary | attendancesummary
   */
  private buildEndpoint(type: ReportType, format: ReportFormat, action: 'preview' | 'download'): string {
    if (action === 'preview') return `${this.baseUrl}/v2/${type}/preview`;
    if (format === 'pdf') return `${this.baseUrl}/v2/${type}/pdf/download`;
    return `${this.baseUrl}/v2/${type}/excel`;
  }

  private handleApiResponse<T>(response: ApiResponse<T>, endpoint: string): T {
    if (response.status === 'error') {
      throw new ReportError(response.error.message, {
        status: response.error.code,
        url: endpoint,
        details: response.error.details,
      });
    }
    return response.data;
  }

  async preview(type: ReportType, filter?: ReportFilter): Promise<{ base64Data: string; fileName?: string; mimeType?: string }> {
    const endpoint = this.buildEndpoint(type, 'pdf', 'preview');

    const response = await apiFetch<any>(endpoint, {
      method: 'POST',
      body: JSON.stringify(filter ?? {}),
    });

    const payload = this.handleApiResponse(response, endpoint);

    // ✅ Soporta ambos shapes:
    // A) payload = { base64Data, fileName, mimeType }
    // B) payload = { data: { base64Data, ... } }
    const data = payload?.base64Data ? payload : payload?.data;

    if (!data?.base64Data) {
      throw new ReportError('El servidor no devolvió base64Data para la vista previa.', {
        url: endpoint,
        details: payload,
      });
    }

    return data;
  }

  async download(type: ReportType, format: ReportFormat, filter?: ReportFilter): Promise<Blob> {
    const endpoint = this.buildEndpoint(type, format, 'download');

    const response = await apiFetch<Blob>(endpoint, {
      method: 'POST',
      body: JSON.stringify(filter ?? {}),
      headers: {
        Accept: format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    return this.handleApiResponse(response, endpoint);
  }

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
    const endpoint = query ? `${this.baseUrl}/audits?${query}` : `${this.baseUrl}/audits`;

    const response = await apiFetch<ReportAudit[]>(endpoint, { method: 'GET' });
    return this.handleApiResponse(response, endpoint);
  }

  validateDateRange(filter: ReportFilter): boolean {
    if (filter.startDate && filter.endDate) {
      const start = new Date(filter.startDate);
      const end = new Date(filter.endDate);
      return start <= end;
    }
    return true;
  }

  cleanFilters(filter: ReportFilter): ReportFilter {
    const cleaned: ReportFilter = {};
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key as keyof ReportFilter] = value as any;
      }
    });
    return cleaned;
  }
}

export const reportService = new ReportService();
export default reportService;

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 150);
}
