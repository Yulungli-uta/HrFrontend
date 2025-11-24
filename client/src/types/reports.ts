/**
 * Tipos TypeScript para el Sistema de Reportes
 * Universidad Técnica de Ambato
 */

// ============================================
// Tipos Base
// ============================================

export type ReportType = 'employees' | 'attendance' | 'departments';
export type ReportFormat = 'pdf' | 'excel';

// ============================================
// Filtros de Reportes
// ============================================

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  departmentId?: number;
  facultyId?: number;
  employeeId?: number;
  employeeType?: string;
  isActive?: boolean;
  includeInactive?: boolean;
}

// ============================================
// Configuración de Reportes
// ============================================

export interface ReportConfig {
  type: ReportType;
  title: string;
  description: string;
  icon: string;
  availableFormats: ReportFormat[];
  availableFilters: (keyof ReportFilter)[];
}

// Configuraciones predefinidas de reportes
export const REPORT_CONFIGS: Record<ReportType, ReportConfig> = {
  employees: {
    type: 'employees',
    title: 'Reporte de Empleados',
    description: 'Información completa de empleados, salarios y contratos',
    icon: 'Users',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'departmentId', 'facultyId', 'employeeType', 'isActive']
  },
  attendance: {
    type: 'attendance',
    title: 'Reporte de Asistencia',
    description: 'Registros de entrada/salida y horas trabajadas',
    icon: 'Clock',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'employeeId', 'departmentId', 'facultyId']
  },
  departments: {
    type: 'departments',
    title: 'Reporte de Departamentos',
    description: 'Estadísticas y resumen por departamento',
    icon: 'Building',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['facultyId', 'includeInactive']
  }
};

// ============================================
// Parámetros de Descarga/Preview
// ============================================

export interface DownloadReportParams {
  type: ReportType;
  format: ReportFormat;
  filter?: ReportFilter;
  preview?: boolean;
}

// ============================================
// Respuestas de API
// ============================================

export interface PreviewResponse {
  success: boolean;
  data: string; // Base64
  message?: string;
}

export interface DownloadResponse {
  data: Blob;
}

// ============================================
// Auditoría de Reportes
// ============================================

export interface ReportAudit {
  id: number;
  userId: string;
  userEmail: string;
  reportType: string;
  reportFormat: 'PDF' | 'Excel';
  filtersApplied?: string;
  generatedAt: string;
  fileSizeBytes?: number;
  generationTimeMs?: number;
  clientIp?: string;
  success: boolean;
  errorMessage?: string;
  fileName?: string;
}

export interface ReportAuditFilter {
  startDate?: string;
  endDate?: string;
  reportType?: string;
  userId?: string;
  top?: number;
}

// ============================================
// Estado del Hook
// ============================================

export interface UseReportState {
  isDownloading: boolean;
  isPreviewing: boolean;
  previewData: string | null;
  error: Error | null;
}

// ============================================
// Utilidades
// ============================================

/**
 * Obtiene el nombre de archivo para un reporte
 */
export function getReportFileName(type: ReportType, format: ReportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  return `reporte-${type}-${date}.${format}`;
}

/**
 * Obtiene el MIME type para un formato
 */
export function getReportMimeType(format: ReportFormat): string {
  return format === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

/**
 * Formatea el tamaño de archivo
 */
export function formatBytes(bytes?: number): string {
  if (!bytes) return 'N/A';
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Capitaliza la primera letra
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
