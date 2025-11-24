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

import { apiClient } from './client';
import type {
  ReportType,
  ReportFormat,
  ReportFilter,
  PreviewResponse,
  DownloadResponse,
  ReportAudit,
  ReportAuditFilter
} from '@/types/reports';

// ============================================
// Servicio Genérico de Reportes
// ============================================

class ReportService {
  private baseUrl = '/reports';

  /**
   * Construye la URL del endpoint basado en tipo, formato y acción
   */
  private buildEndpoint(type: ReportType, format: ReportFormat, action: 'preview' | 'download'): string {
    if (action === 'preview') {
      return `${this.baseUrl}/${type}/preview`;
    }
    return `${this.baseUrl}/${type}/${format}`;
  }

  /**
   * Preview de PDF (genérico para cualquier reporte)
   */
  async preview(type: ReportType, filter?: ReportFilter): Promise<PreviewResponse> {
    const endpoint = this.buildEndpoint(type, 'pdf', 'preview');
    const response = await apiClient.get<PreviewResponse>(endpoint, { params: filter });
    return response.data;
  }

  /**
   * Descarga de reporte (genérico para cualquier tipo y formato)
   */
  async download(type: ReportType, format: ReportFormat, filter?: ReportFilter): Promise<Blob> {
    const endpoint = this.buildEndpoint(type, format, 'download');
    const response = await apiClient.get<Blob>(endpoint, {
      params: filter,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Obtiene auditorías de reportes
   */
  async getAudits(filter?: ReportAuditFilter): Promise<ReportAudit[]> {
    const response = await apiClient.get<ReportAudit[]>(`${this.baseUrl}/audit`, {
      params: filter
    });
    return response.data;
  }
}

// Exportar instancia singleton
export const reportService = new ReportService();

// ============================================
// API Legacy (para compatibilidad)
// ============================================

/**
 * @deprecated Usar reportService.preview() en su lugar
 */
export const ReportsAPI = {
  // Preview
  previewEmployees: (filter?: ReportFilter) => reportService.preview('employees', filter),
  previewAttendance: (filter?: ReportFilter) => reportService.preview('attendance', filter),
  previewDepartments: (filter?: ReportFilter) => reportService.preview('departments', filter),

  // Download PDF
  downloadEmployeesPdf: (filter?: ReportFilter) => reportService.download('employees', 'pdf', filter),
  downloadAttendancePdf: (filter?: ReportFilter) => reportService.download('attendance', 'pdf', filter),
  downloadDepartmentsPdf: (filter?: ReportFilter) => reportService.download('departments', 'pdf', filter),

  // Download Excel
  downloadEmployeesExcel: (filter?: ReportFilter) => reportService.download('employees', 'excel', filter),
  downloadAttendanceExcel: (filter?: ReportFilter) => reportService.download('attendance', 'excel', filter),
  downloadDepartmentsExcel: (filter?: ReportFilter) => reportService.download('departments', 'excel', filter),

  // Audit
  getAudits: (filter?: ReportAuditFilter) => reportService.getAudits(filter)
};

// ============================================
// Funciones de Utilidad
// ============================================

/**
 * Descarga un blob como archivo
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

/**
 * Convierte Base64 a Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// ============================================
// Exportación por Defecto
// ============================================

export default reportService;
