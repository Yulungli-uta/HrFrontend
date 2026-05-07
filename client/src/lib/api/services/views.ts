/**
 * Archivo: src/lib/api/services/views.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - Archivo conservado dentro del bloque funcional correspondiente.
 * - Se mantiene la implementacion original y solo se agrega esta cabecera descriptiva
 *   para facilitar ubicacion y revision del servicio.
 */

// src/lib/api/services/views.ts

/**
 * APIs de vistas de base de datos
 * VwAttendanceDay, VwPunchDay, VwLeaveWindows, VwEmployeeScheduleAtDate
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

// =============================================================================
// Constantes de rutas base
// =============================================================================

const HR_VIEWS_BASE = {
  departments: '/api/v1/rh/vw-departments',
  jobActivities: '/api/v1/rh/vw-job-activities',
  jobs: '/api/v1/rh/vw-jobs',
} as const;

// =============================================================================
// Tipos
// =============================================================================

export interface VwDepartmentWithType {
  departmentID: number;
  code: string;
  departmentName: string;
  shortName?: string | null;
  parentID?: number | null;
  parentDepartmentName?: string | null;
  departmentTypeID: number;
  departmentTypeName: string;
  departmentTypeDescription?: string | null;
  departmentScopeID?: number | null;
  departmentScopeName?: string | null;
  departmentScopeDescription?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  deanDirector?: number | null;
  budgetCode?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface VwJobActivity {
  jobID: number;
  jobDescription?: string | null;
  jobTypeName: string;
  occupationalGroup: string;
  activitiesID: number;
  activityDescription?: string | null;
  activitiesType: string;
  activityAssignmentActive: boolean;
}

export interface VwJobWithDegreeAndGroup {
  jobID: number;
  jobDescription?: string | null;
  jobTypeName?: string | null;
  groupID?: number | null;
  occupationalGroup?: string | null;
  rmu?: number | null;
  degreeID?: number | null;
  degree?: string | null;
  degreeIsActive?: boolean | null;
}

// =============================================================================
// API de Vista de Días de Asistencia
// =============================================================================

export const VwAttendanceDayAPI = {
  /**
   * Lista todos los días de asistencia esperados vs trabajados
   */
  getAll: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/vw-attendance-day'),

  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-attendance-day/by-employee/${employeeId}`),

  getByDateRange: (fromDate: string, toDate: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(
      `/api/v1/rh/cv/vw-attendance-day/by-date-range?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`
    ),
};

// =============================================================================
// API de Vista de Picadas Diarias
// =============================================================================

export const VwPunchDayAPI = {
  getAll: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/vw-punch-day'),

  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-punch-day/by-employee/${employeeId}`),

  getByDateRange: (fromDate: string, toDate: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(
      `/api/v1/rh/cv/vw-punch-day/by-date-range?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`
    ),
};

// =============================================================================
// API de Vista de Ventanas de Ausencias
// =============================================================================

export const VwLeaveWindowsAPI = {
  getAll: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/vw-leave-windows'),

  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-leave-windows/by-employee/${employeeId}`),

  getByLeaveType: (leaveType: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-leave-windows/by-type/${leaveType}`),
};

// =============================================================================
// API de Vista de Horarios por Fecha
// =============================================================================

export const VwEmployeeScheduleAtDateAPI = {
  getAll: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/vw-employee-schedule-at-date'),

  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-employee-schedule-at-date/by-employee/${employeeId}`),

  getByDate: (date: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(
      `/api/v1/rh/cv/vw-employee-schedule-at-date/by-date?date=${encodeURIComponent(date)}`
    ),
};

// =============================================================================
// API de Vista de Departamentos con Tipo
// =============================================================================

export const VwDepartmentWithTypeAPI = {
  getAll: (): Promise<ApiResponse<VwDepartmentWithType[]>> =>
    apiFetch<VwDepartmentWithType[]>(HR_VIEWS_BASE.departments),

  getActive: (): Promise<ApiResponse<VwDepartmentWithType[]>> =>
    apiFetch<VwDepartmentWithType[]>(`${HR_VIEWS_BASE.departments}/active`),

  getByType: (typeId: number): Promise<ApiResponse<VwDepartmentWithType[]>> =>
    apiFetch<VwDepartmentWithType[]>(`${HR_VIEWS_BASE.departments}/by-type/${typeId}`),

  getByScope: (scopeId: number): Promise<ApiResponse<VwDepartmentWithType[]>> =>
    apiFetch<VwDepartmentWithType[]>(`${HR_VIEWS_BASE.departments}/by-scope/${scopeId}`),

  getById: (id: number): Promise<ApiResponse<VwDepartmentWithType>> =>
    apiFetch<VwDepartmentWithType>(`${HR_VIEWS_BASE.departments}/${id}`),
};

// =============================================================================
// API de Vista de Actividades por Cargo
// =============================================================================

export const VwJobActivityAPI = {
  getAll: (): Promise<ApiResponse<VwJobActivity[]>> =>
    apiFetch<VwJobActivity[]>(HR_VIEWS_BASE.jobActivities),

  getActiveAssignments: (): Promise<ApiResponse<VwJobActivity[]>> =>
    apiFetch<VwJobActivity[]>(`${HR_VIEWS_BASE.jobActivities}/active`),

  getByJob: (jobId: number): Promise<ApiResponse<VwJobActivity[]>> =>
    apiFetch<VwJobActivity[]>(`${HR_VIEWS_BASE.jobActivities}/by-job/${jobId}`),

  getActiveByJob: (jobId: number): Promise<ApiResponse<VwJobActivity[]>> =>
    apiFetch<VwJobActivity[]>(`${HR_VIEWS_BASE.jobActivities}/by-job/${jobId}/active`),
};

// =============================================================================
// API de Vista de Cargos con Título y Grupo
// =============================================================================

export const VwJobWithDegreeAndGroupAPI = {
  getAll: (): Promise<ApiResponse<VwJobWithDegreeAndGroup[]>> =>
    apiFetch<VwJobWithDegreeAndGroup[]>(HR_VIEWS_BASE.jobs),

  getByGroup: (groupId: number): Promise<ApiResponse<VwJobWithDegreeAndGroup[]>> =>
    apiFetch<VwJobWithDegreeAndGroup[]>(`${HR_VIEWS_BASE.jobs}/by-group/${groupId}`),

  getWithActiveDegree: (): Promise<ApiResponse<VwJobWithDegreeAndGroup[]>> =>
    apiFetch<VwJobWithDegreeAndGroup[]>(`${HR_VIEWS_BASE.jobs}/active-degree`),

  getById: (id: number): Promise<ApiResponse<VwJobWithDegreeAndGroup>> =>
    apiFetch<VwJobWithDegreeAndGroup>(`${HR_VIEWS_BASE.jobs}/${id}`),
};
