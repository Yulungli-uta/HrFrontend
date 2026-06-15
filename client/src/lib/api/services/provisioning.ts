/**
 * APIs del módulo de Aprovisionamiento de Empleados
 * Endpoints en RepositoryUta: /api/provisioning/* y /api/licenses/*
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedResult } from '../core/pagination';

// =============================================================================
// Tipos
// =============================================================================

export type ProvisioningStatus =
  | 'Requested'
  | 'CreatedInLocalAd'
  | 'PendingEntraSync'
  | 'SyncedInEntra'
  | 'LicenseAssigned'
  | 'LicenseFailed'
  | 'LocalAdFailed';

export const PROVISIONING_STATUS_ID: Record<ProvisioningStatus, number> = {
  Requested:        2001,
  CreatedInLocalAd: 2002,
  PendingEntraSync: 2003,
  SyncedInEntra:    2004,
  LicenseAssigned:  2005,
  LicenseFailed:    2006,
  LocalAdFailed:    2007,
};

export interface UserProvisioningDto {
  id: string;
  hrEmployeeId: number;
  email: string;
  displayName: string;
  givenName?: string | null;
  surname?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  jobTitle?: string | null;
  employeeTypeId: number;
  employeeTypeName?: string | null;
  provisioningStatusId: number;
  provisioningStatusName?: string | null;
  authUserId?: string | null;
  localAdObjectId?: string | null;
  entraObjectId?: string | null;
  licenseSkuId?: string | null;
  provisionedAt?: string | null;
  licenseAssignedAt?: string | null;
  lastCheckedAt?: string | null;
  errorMessage?: string | null;
  requestedBy?: string | null;
  sourceReference?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CompletePendingResult {
  totalProcessed: number;
  licenseAssigned: number;
  stillPending: number;
  failed: number;
  results: UserProvisioningDto[];
}

export interface PasswordResetResult {
  provisioningId: string;
  hrEmployeeId: number;
  email: string;
  newTemporaryPassword: string;
  message: string;
}

export interface SubscribedSkuDto {
  skuId: string;
  skuPartNumber: string;
  displayName?: string | null;
  prepaidEnabled: number;
  consumedUnits: number;
  availableUnits: number;
}

// =============================================================================
// Helper interno — desenvuelve el ApiResponse estándar de RepositoryUta
// =============================================================================

async function fetchProv<T>(
  url: string,
  init?: Parameters<typeof apiFetch>[1],
): Promise<ApiResponse<T>> {
  const raw = await apiFetch<any>(url, init);
  if (raw.status === 'success' && raw.data && typeof raw.data === 'object' && 'success' in raw.data) {
    if (raw.data.success === false) {
      return {
        status: 'error',
        error: { code: 400, message: raw.data.message || 'Error en aprovisionamiento' },
      };
    }
    return { status: 'success', data: raw.data.data as T };
  }
  return raw as ApiResponse<T>;
}

function serializeQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// =============================================================================
// ProvisioningAPI
// =============================================================================

export const ProvisioningAPI = {
  /** Lista aprovisionamientos con paginación y filtro opcional por statusId. */
  list: (
    page: number = 1,
    pageSize: number = 50,
    statusId?: number | null,
  ): Promise<ApiResponse<PagedResult<UserProvisioningDto>>> =>
    fetchProv<PagedResult<UserProvisioningDto>>(
      `/api/provisioning/employees${serializeQuery({ page, pageSize, statusId })}`,
      { method: 'GET' },
    ),

  /** Retorna el estado actual de un aprovisionamiento. */
  getStatus: (id: string): Promise<ApiResponse<UserProvisioningDto>> =>
    fetchProv<UserProvisioningDto>(
      `/api/provisioning/employees/${encodeURIComponent(id)}`,
      { method: 'GET' },
    ),

  /** Reintenta un aprovisionamiento en estado *Failed. */
  retry: (id: string): Promise<ApiResponse<UserProvisioningDto>> =>
    fetchProv<UserProvisioningDto>(
      `/api/provisioning/employees/${encodeURIComponent(id)}/retry`,
      { method: 'PATCH' },
    ),

  /** Verifica sincronización con Entra y asigna licencia O365 si corresponde. */
  complete: (id: string): Promise<ApiResponse<UserProvisioningDto>> =>
    fetchProv<UserProvisioningDto>(
      `/api/provisioning/employees/${encodeURIComponent(id)}/complete`,
      { method: 'POST' },
    ),

  /** Procesa todos los registros en estado PendingEntraSync / SyncedInEntra. */
  completePending: (): Promise<ApiResponse<CompletePendingResult>> =>
    fetchProv<CompletePendingResult>(
      `/api/provisioning/employees/complete-pending`,
      { method: 'POST' },
    ),

  /** Restablece la contraseña en AD Local para el empleado del registro indicado. */
  resetPassword: (id: string): Promise<ApiResponse<PasswordResetResult>> =>
    fetchProv<PasswordResetResult>(
      `/api/provisioning/employees/${encodeURIComponent(id)}/reset-password`,
      { method: 'POST' },
    ),

  /** Deshabilita la cuenta AD, mueve a OU Inactivos y quita del grupo activo. */
  disable: (id: string): Promise<ApiResponse<UserProvisioningDto>> =>
    fetchProv<UserProvisioningDto>(
      `/api/provisioning/employees/${encodeURIComponent(id)}/disable`,
      { method: 'POST' },
    ),

  /** Mismo flujo de baja por GUID del objeto AD (para llamadas desde gestión AD Local). */
  disableByAdId: (adObjectId: string): Promise<ApiResponse<UserProvisioningDto>> =>
    fetchProv<UserProvisioningDto>(
      `/api/provisioning/employees/by-ad-id/${encodeURIComponent(adObjectId)}/disable`,
      { method: 'POST' },
    ),

  /**
   * Deshabilita la cuenta AD usando el ID de empleado HR.
   * Servicio: RepositoryUta — POST /api/provisioning/employees/by-hr-id/{hrEmployeeId}/disable
   * Ejecuta el mismo flujo completo: quita del grupo activo, mueve a OU Inactivos y deshabilita.
   * Se usa desde el flujo de acción de personal cuando requiresAdUserDisable = true.
   */
  disableByHrEmployeeId: (hrEmployeeId: number): Promise<ApiResponse<UserProvisioningDto>> =>
    fetchProv<UserProvisioningDto>(
      `/api/provisioning/employees/by-hr-id/${hrEmployeeId}/disable`,
      { method: 'POST' },
    ),
} as const;

// =============================================================================
// LicensesAPI
// =============================================================================

export const LicensesAPI = {
  /** Lista los SKUs de suscripción disponibles en el tenant O365. */
  getSkus: (): Promise<ApiResponse<SubscribedSkuDto[]>> =>
    fetchProv<SubscribedSkuDto[]>(`/api/licenses/skus`, { method: 'GET' }),
} as const;
