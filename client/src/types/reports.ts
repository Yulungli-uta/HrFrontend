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
  | 'attendance-cross'
  // Reportes v2 — Gestión RH
  | 'contracts'
  | 'active-contracts'
  | 'personnel-actions'
  | 'active-personnel-actions'
  | 'employee-history'
  | 'granted-permissions'
  | 'contract-requests'
  | 'certifications'
  // Reportes v2 — Guardias
  | 'guard-shift-planning'
  | 'guard-location-coverage'
  | 'guard-shift-changes'
  | 'guard-group-roster'
  | 'guard-schedule-matrix';

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
  employeeId?: number;
  employeeType?: string;
  /** ID del tipo de empleado (relación con la tabla de tipos de empleado). */
  employeeTypeId?: number;
  /** ID del tipo de contrato (tbl_ContractType). Filtro para contratos vigentes. */
  contractTypeId?: number;
  /** TypeId del régimen laboral (ref_Types categoría LABOR_REGIME). */
  laborRegimeId?: number;
  /** EmployeeId del empleado que creó el contrato. */
  createdByEmployeeId?: number;
  /** ID del tipo de acción de personal (tbl_PersonnelActionTypes). */
  actionTypeId?: number;
  isActive?: boolean;
  includeInactive?: boolean;
  /** Filtra por estado (contratos, acciones, permisos, solicitudes, certificaciones). */
  status?: string;
  /** ID de la ubicación de servicio de guardias (tbl_GuardServiceLocations). */
  locationId?: number;
  /** ID del grupo de rotación de guardias (tbl_GuardRotationGroups). */
  groupId?: number;
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
  /** Opciones estáticas de estado (se usa cuando los valores no están en ref_Types). */
  statusOptions?: { value: string; label: string }[];
  /**
   * Categoría de ref_Types para cargar opciones de estado dinámicamente.
   * Cuando está presente, tiene prioridad sobre statusOptions.
   * Ej: 'CONTRACT_STATUS', 'PERSONNEL_ACTION_STATUS'.
   */
  statusCategory?: string;
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
    availableFilters: ['startDate', 'endDate', 'departmentId', 'employeeType', 'isActive']
  },
  attendance: {
    type: 'attendance',
    title: 'Reporte de Asistencia',
    description: 'Registros de entrada/salida y horas trabajadas',
    icon: 'Clock',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'employeeId', 'departmentId']
  },
  departments: {
    type: 'departments',
    title: 'Reporte de Departamentos',
    description: 'Estadísticas y resumen por departamento',
    icon: 'Building',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['includeInactive']
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
  },

  // ── Gestión RH ────────────────────────────────────────────────────────────
  contracts: {
    type: 'contracts',
    title: 'Reporte de Contratos',
    description: 'Contratos de personal con filtro por estado, departamento y período',
    icon: 'FileText',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'departmentId', 'status', 'orientation'],
    statusCategory: 'CONTRACT_STATUS',
  },
  'active-contracts': {
    type: 'active-contracts',
    title: 'Contratos Vigentes',
    description: 'Contratos activos a la fecha actual con filtro por tipo, régimen y creador',
    icon: 'FileCheck',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['departmentId', 'contractTypeId', 'laborRegimeId', 'createdByEmployeeId', 'status', 'orientation'],
    statusCategory: 'CONTRACT_STATUS',
  },
  'personnel-actions': {
    type: 'personnel-actions',
    title: 'Reporte de Acciones de Personal',
    description: 'Todas las acciones de personal con filtro por estado y período',
    icon: 'ClipboardSignature',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'employeeId', 'status', 'orientation'],
    statusCategory: 'PERSONNEL_ACTION_STATUS',
  },
  'active-personnel-actions': {
    type: 'active-personnel-actions',
    title: 'Acciones de Personal Vigentes',
    description: 'Acciones de movimiento, ingreso y económicas vigentes con filtro por período y empleado',
    icon: 'ClipboardCheck',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'employeeId', 'departmentId', 'actionTypeId', 'status', 'orientation'],
    statusCategory: 'PERSONNEL_ACTION_STATUS',
  },
  'employee-history': {
    type: 'employee-history',
    title: 'Historial del Empleado',
    description: 'Contratos y acciones de cambio de puesto por empleado (excluye disciplinarias)',
    icon: 'History',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['employeeId', 'departmentId', 'orientation'],
  },
  'granted-permissions': {
    type: 'granted-permissions',
    title: 'Reporte de Permisos Otorgados',
    description: 'Permisos de personal con filtro por estado, período y departamento',
    icon: 'CalendarCheck',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'employeeId', 'departmentId', 'status', 'orientation'],
    statusOptions: [
      { value: 'APPROVED', label: 'Aprobados' },
      { value: 'PENDING', label: 'Pendientes' },
      { value: 'REJECTED', label: 'Rechazados' },
    ]
  },
  'contract-requests': {
    type: 'contract-requests',
    title: 'Reporte de Solicitudes de Contrato',
    description: 'Solicitudes de contratación por departamento con avance de cumplimiento',
    icon: 'FilePlus',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'departmentId', 'status', 'orientation'],
    statusCategory: 'CONTRACT_REQUEST_STATUS',
  },
  certifications: {
    type: 'certifications',
    title: 'Reporte de Certificaciones Financieras',
    description: 'Certificaciones de disponibilidad presupuestaria con selección de estado',
    icon: 'BadgeCheck',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'status', 'orientation'],
    statusCategory: 'FIN_CERT_STATUS',
  },

  // ── Reportes v2 — Guardias ────────────────────────────────────────────────
  'guard-shift-planning': {
    type: 'guard-shift-planning',
    title: 'Planificación de Turnos de Guardias',
    description: 'Detalle de turnos asignados por guardia, grupo y ubicación en un período',
    icon: 'CalendarRange',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'groupId', 'locationId', 'employeeId', 'status', 'orientation'],
    statusOptions: [
      { value: 'Activo', label: 'Activo' },
      { value: 'Reemplazado', label: 'Reemplazado' },
      { value: 'Ausente', label: 'Ausente' },
    ],
  },
  'guard-location-coverage': {
    type: 'guard-location-coverage',
    title: 'Cobertura de Guardias por Ubicación',
    description: 'Cantidad de guardias asignados por ubicación, fecha y turno; resalta ubicaciones sin cobertura',
    icon: 'MapPin',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'locationId', 'orientation'],
  },
  'guard-shift-changes': {
    type: 'guard-shift-changes',
    title: 'Cambios de Turno y Reemplazos',
    description: 'Intercambios, ausencias y reemplazos de guardias con estado de aprobación',
    icon: 'ArrowLeftRight',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'groupId', 'locationId', 'employeeId', 'status', 'orientation'],
    statusOptions: [
      { value: 'Pendiente', label: 'Pendiente' },
      { value: 'Aprobado', label: 'Aprobado' },
      { value: 'Rechazado', label: 'Rechazado' },
    ],
  },
  'guard-group-roster': {
    type: 'guard-group-roster',
    title: 'Guardias por Grupo y Ubicación',
    description: 'Listado de guardias activos con su grupo, ubicación asignada y período de rotación vigente',
    icon: 'Users',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['groupId', 'locationId', 'orientation'],
  },
  'guard-schedule-matrix': {
    type: 'guard-schedule-matrix',
    title: 'Cronograma Matricial de Guardias',
    description: 'Cronograma imprimible: filas = guardias, columnas = fechas, celdas = turno (M/T/N/L)',
    icon: 'LayoutGrid',
    availableFormats: ['pdf', 'excel'],
    availableFilters: ['startDate', 'endDate', 'groupId', 'locationId', 'orientation'],
  },
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
  const ext = format === 'excel' ? 'xlsx' : format;
  return `reporte-${type}-${date}.${ext}`;
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
