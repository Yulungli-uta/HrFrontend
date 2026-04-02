// src/lib/api/services/holidays.ts

/**
 * APIs de feriados
 */

import { apiFetch } from '../core/fetch';
import { createApiService as createCrudService } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';

// =============================================================================
// DTO de Feriados
// =============================================================================

export interface HolidayResponseDTO {
  holidayID: number;
  name: string;
  holidayDate: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

// =============================================================================
// API de Feriados
// =============================================================================

export const HolidaysAPI = {
  ...createCrudService<HolidayResponseDTO, any>('/api/v1/rh/holiday'),

  getByYear: (year: number): Promise<ApiResponse<HolidayResponseDTO[]>> =>
    apiFetch<HolidayResponseDTO[]>(`/api/v1/rh/holiday/year/${year}`),

  getActive: (): Promise<ApiResponse<HolidayResponseDTO[]>> =>
    apiFetch<HolidayResponseDTO[]>('/api/v1/rh/holiday/active'),

  isHoliday: (date: string): Promise<ApiResponse<boolean>> =>
    apiFetch<boolean>(`/api/v1/rh/holiday/check/${date}`),
};
