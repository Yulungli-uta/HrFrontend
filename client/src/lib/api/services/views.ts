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
import type { PagedResult } from '../core/pagination';

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

// =============================================================================
// Tipos — Vista vw_Authority
// =============================================================================

/** DTO de solo lectura que mapea la vista HR.vw_Authority */
export interface VwAuthority {
  authorityID: number;
  departmentID: number;
  departmentCode: string;
  departmentName: string;
  employeeID: number;
  employeeIDCard: string;
  employeeFullName: string;
  authorityTypeID: number;
  authorityTypeName: string;
  authorityTypeDescription?: string | null;
  jobID?: number | null;
  jobDescription?: string | null;
  denomination?: string | null;
  startDate: string;         // ISO date "YYYY-MM-DD"
  endDate?: string | null;
  resolutionCode?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

// =============================================================================
// API de Vista de Autoridades (vw_Authority)
// =============================================================================

const VW_AUTHORITY_BASE = '/api/v1/rh/vw-authority';

/**
 * VwAuthorityAPI — Acceso de solo lectura a la vista HR.vw_Authority.
 *
 * La vista desnormaliza los joins de DepartmentAuthorities con:
 * Departments, Employees → People, ref_Types (tipo de autoridad) y Jobs.
 *
 * Métodos:
 *  - getAll()                    → GET /vw-authority
 *  - getActive()                 → GET /vw-authority/active
 *  - getPaged(params)            → GET /vw-authority/paged
 *  - getByDepartment(id)         → GET /vw-authority/by-department/:id
 *  - getByEmployee(id)           → GET /vw-authority/by-employee/:id
 *  - getById(id)                 → GET /vw-authority/:id
 */
export const VwAuthorityAPI = {
  getAll: (): Promise<ApiResponse<VwAuthority[]>> =>
    apiFetch<VwAuthority[]>(VW_AUTHORITY_BASE),

  getActive: (): Promise<ApiResponse<VwAuthority[]>> =>
    apiFetch<VwAuthority[]>(`${VW_AUTHORITY_BASE}/active`),

  getPaged: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    onlyActive?: boolean;
  }): Promise<ApiResponse<PagedResult<VwAuthority>>> => {
    const qs = new URLSearchParams({
      page:     String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.onlyActive !== undefined ? { onlyActive: String(params.onlyActive) } : {}),
    });
    return apiFetch<PagedResult<VwAuthority>>(`${VW_AUTHORITY_BASE}/paged?${qs.toString()}`);
  },

  getByDepartment: (departmentId: number): Promise<ApiResponse<VwAuthority[]>> =>
    apiFetch<VwAuthority[]>(`${VW_AUTHORITY_BASE}/by-department/${departmentId}`),

  getByEmployee: (employeeId: number): Promise<ApiResponse<VwAuthority[]>> =>
    apiFetch<VwAuthority[]>(`${VW_AUTHORITY_BASE}/by-employee/${employeeId}`),

  getById: (id: number): Promise<ApiResponse<VwAuthority>> =>
    apiFetch<VwAuthority>(`${VW_AUTHORITY_BASE}/${id}`),
};
