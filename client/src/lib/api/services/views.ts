// src/lib/api/services/views.ts

/**
 * APIs de vistas de base de datos
 * VwAttendanceDay, VwPunchDay, VwLeaveWindows, VwEmployeeScheduleAtDate
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

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
