import { apiFetch } from '../../core/fetch';
import type { ApiResponse } from '../../core/fetch';
import type { PagedResult } from '../../core/pagination';

export interface StudentProvisioningDto {
  id: string;
  studentId: number;
  email: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  provisioningStatusId: number;
  provisioningStatusName?: string;
  adObjectId?: string;
  sourceReference?: string;
  errorMessage?: string;
  requestedBy?: string;
  provisionedAt?: string;
  disabledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentEnrollmentSyncResult {
  success: boolean;
  message: string;
  provisioned: number;
  disabled: number;
}

// Estado de aprovisionamiento (coincide con StudentProvisioningStatus enum en backend)
export const StudentProvisioningStatus = {
  Requested:   3001,
  CreatedInAd: 3002,
  AdFailed:    3003,
  Disabled:    3004,
} as const;

// Todos los endpoints apuntan a HrBackend (state vive en tbl_StudentProvisioning)
export const StudentProvisioningAPI = {
  list: (
    page = 1,
    pageSize = 20,
    statusId?: number,
  ): Promise<ApiResponse<{ items: StudentProvisioningDto[]; total: number; page: number; pageSize: number }>> =>
    apiFetch(
      `/api/v1/rh/student-provisioning?page=${page}&pageSize=${pageSize}${statusId !== undefined ? `&statusId=${statusId}` : ''}`,
    ),

  getById: (id: string): Promise<ApiResponse<StudentProvisioningDto>> =>
    apiFetch(`/api/v1/rh/student-provisioning/${id}`),

  disable: (studentId: number): Promise<ApiResponse<{ success: boolean; studentId: number; email?: string; disabledAt?: string; errorMessage?: string }>> =>
    apiFetch(`/api/v1/rh/student-provisioning/${studentId}/disable`, { method: 'POST' }),
};
