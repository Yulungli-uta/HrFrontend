import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

export interface ContractExpirationResult {
  success: boolean;
  message: string;
  processed: number;
}

export interface StudentEnrollmentSyncResult {
  success: boolean;
  message: string;
  provisioned: number;
  disabled: number;
}

export const ScheduledJobsAPI = {
  runContractExpiration: (): Promise<ApiResponse<ContractExpirationResult>> =>
    apiFetch<ContractExpirationResult>(
      '/api/v1/rh/scheduled-jobs/contract-expiration/run',
      { method: 'POST' },
    ),

  runStudentEnrollmentSync: (
    periodCode: string,
    previousPeriod?: string,
  ): Promise<ApiResponse<StudentEnrollmentSyncResult>> => {
    const params = new URLSearchParams({ periodCode });
    if (previousPeriod) params.append('previousPeriod', previousPeriod);
    return apiFetch<StudentEnrollmentSyncResult>(
      `/api/v1/rh/scheduled-jobs/student-enrollment/run?${params.toString()}`,
      { method: 'POST' },
    );
  },
};
