/**
 * Tipos TypeScript para el Sistema de Reportes
 * Universidad Técnica de Ambato
 */

// ============================================
// Tipos Base
// ============================================

export type ReportType =
  | 'employees'
  | 'attendance'
  | 'departments'
  | 'attendancesumary'
  // Reportes v2 — sources del usuario
  | 'employees-by-department'
  | 'department-contract-summary'
  | 'schedule-contract-summary'
  // Reportes v2 — AttendanceCalculations
  | 'lateness'
  | 'overtime'
  | 'attendance-cross';

export type ReportFormat = 'pdf' | 'excel';

/**
 * Orientación de página para el PDF generado.
 * - `portrait`  → Vertical  (A4 210×297 mm) — por defecto en la mayoría de reportes.
 * - `landscape` → Horizontal (A4 297×210 mm) — recomendado para reportes con muchas columnas.
 */
export type PageOrientation = 'portrait' | 'landscape';

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
  /**
   * ID del tipo de empleado (relación con la tabla de tipos de empleado).
   * Usado por los reportes de estructura organizacional.
   */
  employeeTypeId?: number;
  isActive?: boolean;
  includeInactive?: boolean;
  /**
   * Orientación de página del PDF.
   * Si no se envía, el backend usa el valor por defecto definido en el `IReportSource`.
   * (p.ej. `attendancesumary` usa `landscape` por defecto al tener 15 columnas)
   */
  orientation?: PageOrientation;
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
  // ── Reportes v1 ────────────────────────────────────────────────────────────
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
  },
  attendancesumary: {
    type: 'attendancesumary',
    title: 'Reporte de Resumen de Asistencias',
    description: 'Estadísticas y resumen consolidado de asistencia por empleado',
    icon: 'ClipboardList',
    availableFormats: ['pdf', 'excel'],
    // 'orientation' se incluye porque este reporte tiene 15 columnas y necesita
    // que el usuario pueda elegir entre horizontal (por defecto) o vertical.
    availableFilters: ['startDate', 'endDate', 'employeeId', 'employeeType', 'orientation']
  },

  // ── Reportes v2 — sources del usuario ──────────────────────────────────────
  'employees-by-department': {
    type: 'employees-by-department',
    title: 'Empleados por Dependencia',
    description: 'Listado detallado de empleados agrupado por dependencia organizacional',
    icon: 'Users',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['departmentId', 'employeeTypeId', 'isActive', 'orientation']
  },
  'department-contract-summary': {
    type: 'department-contract-summary',
    title: 'Resumen por Dependencia y Contrato',
    description: 'Resumen consolidado de empleados agrupado por dependencia y tipo de contrato',
    icon: 'Building2',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['departmentId', 'employeeTypeId', 'isActive', 'orientation']
  },
  'schedule-contract-summary': {
    type: 'schedule-contract-summary',
    title: 'Resumen por Horario y Contrato',
    description: 'Resumen consolidado de empleados agrupado por horario asignado y tipo de contrato',
    icon: 'CalendarClock',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['departmentId', 'employeeTypeId', 'isActive', 'orientation']
  },

  // ── Reportes v2 — AttendanceCalculations ───────────────────────────────────
  lateness: {
    type: 'lateness',
    title: 'Reporte de Atrasos',
    description: 'Detalle de atrasos, tardanzas y salidas anticipadas por empleado en el período',
    icon: 'AlarmClock',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'employeeId', 'departmentId', 'orientation']
  },
  overtime: {
    type: 'overtime',
    title: 'Reporte de Horas Extras',
    description: 'Horas extras ordinarias, nocturnas, feriado y fuera de horario por empleado',
    icon: 'Timer',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'employeeId', 'departmentId', 'orientation']
  },
  'attendance-cross': {
    type: 'attendance-cross',
    title: 'Reporte Cruzado de Asistencia',
    description: 'Vista consolidada: horas trabajadas, permisos, vacaciones, justificaciones y licencias',
    icon: 'LayoutGrid',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'employeeId', 'departmentId', 'orientation']
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

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Capitaliza la primera letra
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
