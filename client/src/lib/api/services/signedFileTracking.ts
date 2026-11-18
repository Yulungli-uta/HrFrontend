// src/lib/api/services/signedFileTracking.ts
/**
 * Acciones de personal y contratos con archivo firmado registrado, y vista previa del archivo.
 * Solo lectura: el backend decide qué registros ve el usuario (permiso + alcance por departamento).
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedResult } from '../core/pagination';
import type {
  ContractSignedFile,
  ContractSignedFileQuery,
  PersonnelActionSignedFile,
  PersonnelActionSignedFileQuery,
} from '@/types/signedFileTracking';

const BASE = '/api/v1/rh/signed-file-tracking';

function toQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `?${qs}` : '';
}

const PDF_HEADERS = { Accept: 'application/pdf' };

export const SignedFileTrackingAPI = {
  listActions: (query: PersonnelActionSignedFileQuery): Promise<ApiResponse<PagedResult<PersonnelActionSignedFile>>> =>
    apiFetch<PagedResult<PersonnelActionSignedFile>>(`${BASE}/personnel-actions${toQuery({ ...query })}`),

  listContracts: (query: ContractSignedFileQuery): Promise<ApiResponse<PagedResult<ContractSignedFile>>> =>
    apiFetch<PagedResult<ContractSignedFile>>(`${BASE}/contracts${toQuery({ ...query })}`),

  /** PDF firmado de una acción (el backend lo lee del servidor de archivos). */
  actionFile: (actionId: number): Promise<ApiResponse<Blob>> =>
    apiFetch<Blob>(`${BASE}/personnel-actions/${actionId}/file`, { method: 'GET', headers: PDF_HEADERS }),

  /** PDF firmado de un contrato (el backend lo lee del servidor de archivos). */
  contractFile: (contractId: number): Promise<ApiResponse<Blob>> =>
    apiFetch<Blob>(`${BASE}/contracts/${contractId}/file`, { method: 'GET', headers: PDF_HEADERS }),
};
