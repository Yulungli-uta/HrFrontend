/**
 * Servicio API Genérico para Reportes
 * Universidad Técnica de Ambato
 * 
 * Este servicio es completamente genérico y reutilizable.
 * Para agregar un nuevo reporte, solo necesitas:
 * 1. Agregar el tipo en types/reports.ts
 * 2. Agregar la configuración en REPORT_CONFIGS
 * 3. ¡Listo! El servicio funciona automáticamente
 */

import { apiFetch, API_CONFIG } from './client';
import type {
  ReportType,
  ReportFormat,
  ReportFilter,
  PreviewResponse,
  ReportAudit,
  ReportAuditFilter
} from '@/types/reports';

// ============================================
// Servicio Genérico de Reportes
// ============================================

class ReportService {
  private baseUrl = '/api/reports';

  /**
   * Construye query params desde un objeto de filtros
   */
  private buildQueryString(filter?: ReportFilter): string {
    if (!filter) return '';
    
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Construye la URL del endpoint basado en tipo, formato y acción
   */
  private buildEndpoint(type: ReportType, format: ReportFormat, action: 'preview' | 'download'): string {
    if (action === 'preview') {
      return `${this.baseUrl}/${type}/preview`;
    }
    return `${this.baseUrl}/${type}/download/${format}`;
  }

  /**
   * Preview de PDF (genérico para cualquier reporte)
   */
  async preview(type: ReportType, filter?: ReportFilter): Promise<PreviewResponse> {
    const endpoint = this.buildEndpoint(type, 'pdf', 'preview');
    const queryString = this.buildQueryString(filter);
    const response = await apiFetch<PreviewResponse>(`${endpoint}${queryString}`);
    
    if (response.status === 'error') {
      throw new Error(response.error.message);
    }
    
    return response.data;
  }

  /**
   * Descarga de reporte (genérico para cualquier tipo y formato)
   */
  async download(type: ReportType, format: ReportFormat, filter?: ReportFilter): Promise<Blob> {
    const endpoint = this.buildEndpoint(type, format, 'download');
    const queryString = this.buildQueryString(filter);
    
    // Para descargar archivos, usamos fetch directo para obtener blob
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}${queryString}`, {
      headers,
      credentials: API_CONFIG.CREDENTIALS
    });
    
    if (!response.ok) {
      throw new Error(`Error al descargar reporte: ${response.statusText}`);
    }
    
    return await response.blob();
  }

  /**
   * Obtiene auditorías de reportes
   */
  async getAudits(filter?: ReportAuditFilter): Promise<ReportAudit[]> {
    const queryString = this.buildQueryString(filter as any);
    const response = await apiFetch<ReportAudit[]>(`${this.baseUrl}/audit${queryString}`);
    
    if (response.status === 'error') {
      throw new Error(response.error.message);
    }
    
    return response.data;
  }
}

// Exportar instancia singleton
export const reportService = new ReportService();

// Exportar también como default
export default reportService;

// ============================================
// Utilidades
// ============================================

/**
 * Descarga un blob como archivo en el navegador
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
