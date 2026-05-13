/**
 * Archivo: src/lib/api/services/contracts.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - Bloque funcional de contratos y entidades relacionales usadas durante la revision
 *   contractual: solicitud, historial salarial, movimiento personal, actividades,
 *   grados, cargos, job activity, occupational group y certificacion financiera.
 * - Se integra la implementacion completa relacionada al contrato sin recortar codigo.
 */

// src/lib/api/services/payroll.ts

/**
 * APIs de contratos, nómina, salarios y actividades
 */

import { apiFetch } from '../core/fetch';
import { createApiService as createCrudService } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';
import type { PagedRequest, PagedResult } from '../core/pagination';
import type {
  Contract, InsertContract,
} from '@/shared/schema';

import {
  ApprovePersonnelActionRequest,
  CancelPersonnelActionRequest,
  CommentRequest,
  CreatePersonnelActionRequest,
  CreatePersonnelActionResponse,
  GenerateDocumentOverridesRequest,
  PagedPersonnelActionResult,
  PersonnelActionDetail,
  PersonnelActionQueryFilter,
  PersonnelActionStatusHistory,
  PersonnelActionSummary,
  UpdatePersonnelActionRequest,
  UploadSignedDocumentRequest,
} from '@/types/personnel-actions';

// =============================================================================
// API de Contratos (con workflow completo)
// =============================================================================

export const ContratosAPI = createCrudService<Contract, InsertContract>('/api/v1/rh/contracts');

const CONTRACTS_BASE = '/api/v1/rh/contracts';

export const ContractsRHAPI = {
  ...createCrudService<any, any>(CONTRACTS_BASE),

  /**
   * Sobrescribe listPaged para soportar filtros adicionales server-side:
   * statusTypeId (TypeId del estado) y certificationId.
   */
  listPaged: (params: PagedRequest & {
    statusTypeId?: number | null;
    certificationId?: number | null;
    year?: number | null;
    sortDirection?: "asc" | "desc";
  }): Promise<ApiResponse<PagedResult<any>>> => {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      sortDirection: params.sortDirection ?? "desc",
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.statusTypeId != null ? { statusTypeId: String(params.statusTypeId) } : {}),
      ...(params.certificationId != null ? { certificationId: String(params.certificationId) } : {}),
      ...(params.year != null && params.year > 0 ? { year: String(params.year) } : {}),
    });
    return apiFetch<PagedResult<any>>(`${CONTRACTS_BASE}/paged?${qs.toString()}`);
  },

  /**
   * Obtiene los estados permitidos para la siguiente transición del contrato.
   */
  allowedNextStatuses: (currentStatusTypeId: number): Promise<ApiResponse<number[]>> =>
    apiFetch<number[]>(
      `${CONTRACTS_BASE}/status/allowed?currentStatusTypeId=${currentStatusTypeId}`
    ),

  /**
   * Cambia manualmente el estado del contrato.
   */
  changeStatus: (
    id: number | string,
    payload: { toStatusTypeID: number; comment?: string | null }
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${CONTRACTS_BASE}/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Obtiene el historial de cambios de estado del contrato.
   */
  history: (id: number | string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${CONTRACTS_BASE}/${id}/history`),

  /**
   * Obtiene los addendums asociados al contrato.
   */
  addendums: (id: number | string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${CONTRACTS_BASE}/${id}/addendums`),

  /**
   * Obtiene un contrato por su identificador.
   */
  getById: (id: number | string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${CONTRACTS_BASE}/${id}`),

  /**
   * Obtiene el estado documental del contrato.
   */
  documentStatus: (id: number | string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${CONTRACTS_BASE}/${id}/document-status`),

  /**
   * Genera el documento PDF del contrato usando la plantilla configurada.
   */
  generateDocument: (
    id: number | string,
    payload?: {
      overrides?: Record<string, string> | null;
      forceRegenerate?: boolean;
    }
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${CONTRACTS_BASE}/${id}/generate-document`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),

  /**
   * Marca el documento del contrato como pendiente de firmas.
   */
  markPendingSignatures: (
    id: number | string,
    payload?: { comment?: string | null }
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${CONTRACTS_BASE}/${id}/document/pending-signatures`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),

  /**
   * Registra el archivo firmado del contrato y actualiza su estado documental.
   */
  uploadSignedDocument: (
    id: number | string,
    payload: { storedFileId: number; comment?: string | null }
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${CONTRACTS_BASE}/${id}/document/upload-signed`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Finaliza el flujo documental del contrato.
   */
  finalizeDocument: (
    id: number | string,
    payload?: { comment?: string | null }
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${CONTRACTS_BASE}/${id}/document/finalize`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),

  /**
   * Anula el flujo documental del contrato indicando un motivo.
   */
  cancelDocument: (
    id: number | string,
    payload: { reason: string }
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${CONTRACTS_BASE}/${id}/document/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Congela el documento generado para evitar regeneraciones automáticas.
   */
  freezeDocument: (
    id: number | string,
    payload: { documentId: number; templateVersion: number }
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${CONTRACTS_BASE}/${id}/freeze-document`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /**
   * Descongela el documento del contrato para permitir regenerarlo.
   */
  unfreezeDocument: (id: number | string): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${CONTRACTS_BASE}/${id}/unfreeze-document`, {
      method: 'PATCH',
    }),
};

// =============================================================================
// API de Tipos de Contrato
// =============================================================================

export const ContractTypeAPI = {
  ...createCrudService<any, any>('/api/v1/rh/contract-type'),

  getWithTemplate: (id: number | string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/contract-type/${id}/with-template`),

  setDefaultTemplate: (
    id: number | string,
    templateId: number | string
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/contract-type/${id}/default-template`, {
      method: 'PATCH',
      body: JSON.stringify({ templateId }),
    }),

  /** Genera y reserva el siguiente número de documento para el tipo de contrato. */
  getNextNumber: (id: number | string): Promise<ApiResponse<{
    documentNumber: string;
    prefix: string;
    year: number;
    sequence: number;
  }>> =>
    apiFetch(`/api/v1/rh/contract-type/${id}/next-number`, { method: 'POST' }),
};

// =============================================================================
// API de Tipos de Acción de Personal (reemplaza RefType category='ACTION_TYPE')
// =============================================================================

const PERSONNEL_ACTION_TYPE_BASE = '/api/v1/rh/personnel-action-type';

export interface PersonnelActionTypeDto {
  personnelActionTypeId: number;
  name: string;
  code: string;
  description?: string | null;
  numberingPrefix: string;
  numberingYear: number;
  numberingLastSequence: number;
  templateCode?: string | null;
  isActive: boolean;
}

export const PersonnelActionTypeAPI = {
  getAll: (): Promise<ApiResponse<PersonnelActionTypeDto[]>> =>
    apiFetch<PersonnelActionTypeDto[]>(PERSONNEL_ACTION_TYPE_BASE),

  getActive: (): Promise<ApiResponse<PersonnelActionTypeDto[]>> =>
    apiFetch<PersonnelActionTypeDto[]>(`${PERSONNEL_ACTION_TYPE_BASE}/active`),

  getById: (id: number): Promise<ApiResponse<PersonnelActionTypeDto>> =>
    apiFetch<PersonnelActionTypeDto>(`${PERSONNEL_ACTION_TYPE_BASE}/${id}`),

  /** Genera y reserva el siguiente número de documento para el tipo de acción. */
  getNextNumber: (id: number): Promise<ApiResponse<{
    documentNumber: string;
    prefix: string;
    year: number;
    sequence: number;
  }>> =>
    apiFetch(`${PERSONNEL_ACTION_TYPE_BASE}/${id}/next-number`, { method: 'POST' }),

  create: (payload: {
    name: string;
    code: string;
    description?: string;
    numberingPrefix: string;
    templateCode?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<PersonnelActionTypeDto>> =>
    apiFetch<PersonnelActionTypeDto>(PERSONNEL_ACTION_TYPE_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: {
    name: string;
    code: string;
    description?: string;
    numberingPrefix: string;
    templateCode?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${PERSONNEL_ACTION_TYPE_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  delete: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${PERSONNEL_ACTION_TYPE_BASE}/${id}`, { method: 'DELETE' }),
};

// =============================================================================
// API de Solicitudes de Contrato
// =============================================================================

const CONTRACT_REQUEST_BASE = '/api/v1/rh/contract-request';

export const ContractRequestAPI = {
  ...createCrudService<any, any>(CONTRACT_REQUEST_BASE),

  /** Solicitudes paginadas con filtros opcionales. */
  paged: (filter?: {
    statusName?: string | null;
    departmentId?: number | null;
    workModalityId?: number | null;
    search?: string | null;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();
    if (filter?.statusName) params.set('statusName', filter.statusName);
    if (filter?.departmentId != null) params.set('departmentId', String(filter.departmentId));
    if (filter?.workModalityId != null) params.set('workModalityId', String(filter.workModalityId));
    if (filter?.search) params.set('search', filter.search);
    if (filter?.page != null) params.set('page', String(filter.page));
    if (filter?.pageSize != null) params.set('pageSize', String(filter.pageSize));
    const qs = params.toString();
    return apiFetch<any>(`${CONTRACT_REQUEST_BASE}/paged${qs ? `?${qs}` : ''}`);
  },

  /** Solicitudes filtradas por nombre de estado (e.g. PENDIENTE_CERT_FINANCIERA). */
  byStatus: (statusName: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${CONTRACT_REQUEST_BASE}/by-status?statusName=${encodeURIComponent(statusName)}`),

  /** Cantidad pendiente de contratar para una solicitud. */
  pendingCount: (requestId: number): Promise<ApiResponse<{ requestId: number; pendingCount: number }>> =>
    apiFetch(`${CONTRACT_REQUEST_BASE}/${requestId}/pending-count`),

  /** Todas las personas registradas en el detalle de la solicitud. */
  getPeople: (requestId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${CONTRACT_REQUEST_BASE}/${requestId}/people`),

  /** Personas del detalle en estado PENDIENTE (sin contrato aún). */
  getPendingPeople: (requestId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${CONTRACT_REQUEST_BASE}/${requestId}/pending-people`),

  /** Personas disponibles desde HR.tbl_People para completar cupos. */
  getAvailablePeople: (requestId: number, search?: string): Promise<ApiResponse<any[]>> => {
    const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return apiFetch<any[]>(`${CONTRACT_REQUEST_BASE}/${requestId}/available-people${qs}`);
  },

  /** Cupos disponibles de la solicitud. */
  getSlots: (requestId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${CONTRACT_REQUEST_BASE}/${requestId}/slots`),

  /** Agrega una persona al detalle de la solicitud. */
  addPerson: (requestId: number, payload: object): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${CONTRACT_REQUEST_BASE}/${requestId}/people`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Actualiza una persona del detalle. */
  updatePerson: (requestId: number, requestPersonId: number, payload: object): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${CONTRACT_REQUEST_BASE}/${requestId}/people/${requestPersonId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  /** Genera contrato desde una persona del detalle de la solicitud. */
  generateContractFromPerson: (requestId: number, requestPersonId: number, payload?: object): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${CONTRACT_REQUEST_BASE}/${requestId}/people/${requestPersonId}/generate-contract`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),

  /** Genera contrato para una persona nueva desde HR.tbl_People (completa cupos). */
  generateContractFromAvailablePerson: (requestId: number, payload: object): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${CONTRACT_REQUEST_BASE}/${requestId}/available-people/generate-contract`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// =============================================================================
// API de Historial Salarial
// =============================================================================

export const HistorialSalarialAPI = createCrudService<any, any>('/api/v1/rh/salary-history');


// =============================================================================
// API de Movimientos de Personal
// =============================================================================

export const MovimientosPersonalAPI = createCrudService<any, any>(
  '/api/v1/rh/personnel-movements'
);

// =============================================================================
// API de Certificación Financiera
// =============================================================================

const FINANCIAL_CERT_BASE = '/api/v1/rh/financial-certification';

export const FinancialCertificationAPI = {
  ...createCrudService<any, any>(FINANCIAL_CERT_BASE),

  /** Detalle enriquecido de una certificación (statusName, requestSummary). */
  getDetail: (id: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${FINANCIAL_CERT_BASE}/${id}`),

  /** Certificaciones paginadas con filtros opcionales. */
  paged: (filter?: {
    statusName?: string | null;
    requestId?: number | null;
    certCode?: string | null;
    search?: string | null;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();
    if (filter?.statusName) params.set('statusName', filter.statusName);
    if (filter?.requestId != null) params.set('requestId', String(filter.requestId));
    if (filter?.certCode) params.set('certCode', filter.certCode);
    if (filter?.search) params.set('search', filter.search);
    if (filter?.page != null) params.set('page', String(filter.page));
    if (filter?.pageSize != null) params.set('pageSize', String(filter.pageSize));
    const qs = params.toString();
    return apiFetch<any>(`${FINANCIAL_CERT_BASE}/paged${qs ? `?${qs}` : ''}`);
  },

  /** Certificaciones en estado PENDIENTE_REVISION (buzón de Financiero). */
  getPending: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${FINANCIAL_CERT_BASE}/pending`),

  /** Aprueba una certificación → solicitud pasa a PENDIENTE_CONTRATACION. */
  approve: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${FINANCIAL_CERT_BASE}/${id}/approve`, { method: 'POST' }),

  /** Rechaza una certificación con motivo → solicitud pasa a CERT_RECHAZADA. */
  reject: (id: number, reason: string): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${FINANCIAL_CERT_BASE}/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /**
   * Rechazo temporal → solicitud pasa a PENDIENTE_CORRECCION.
   * Permite al solicitante corregir y reenviar.
   */
  rejectTemporary: (id: number, reason: string): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${FINANCIAL_CERT_BASE}/${id}/reject-temporary`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /**
   * Reenvía la certificación corregida a revisión financiera.
   * Certificación → PENDIENTE_REVISION; solicitud → PENDIENTE_CERT_FINANCIERA.
   */
  resend: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${FINANCIAL_CERT_BASE}/${id}/resend`, {
      method: 'POST',
    }),
};

// =============================================================================
// API de Actividades
// =============================================================================

export const ActivityAPI = createCrudService<any, any>('/api/v1/rh/activity');

// =============================================================================
// API de Actividades Adicionales
// =============================================================================

export const AdditionalActivityAPI = {
  ...createCrudService<any, any>('/api/v1/rh/additional-activity'),

  getByContractId: (contractId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/additional-activity/contract/${contractId}`),
};

// =============================================================================
// API de Grados / Títulos
// =============================================================================

export const DegreeAPI = createCrudService<any, any>('/api/v1/rh/degree');

// =============================================================================
// API de Actividades de Cargos
// =============================================================================

export const JobActivityAPI = createCrudService<any, any>('/api/v1/rh/job-activity');

// =============================================================================
// API de Grupos Ocupacionales
// =============================================================================

export const OccupationalGroupAPI = createCrudService<any, any>('/api/v1/rh/occupational-group');

// =============================================================================
// API de Cargos
// =============================================================================

export const CargosAPI = createCrudService<any, any>('/api/v1/rh/jobs');

// =============================================================================
// API de Cargos Especializados
// =============================================================================

export const CargosEspecializadosAPI = {
  getActiveJobs: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/jobs/active'),

  searchJobs: (title: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/jobs/search?title=${encodeURIComponent(title)}`),
};

// =============================================================================
// API de Acciones de Personal
// Base backend: api/v1/hr/personnel-actions
// =============================================================================

const PERSONNEL_ACTIONS_BASE = '/api/v1/rh/personnel-actions';

export const PersonnelActionsAPI = {
  getPaged: (
    filter?: PersonnelActionQueryFilter
  ): Promise<ApiResponse<PagedPersonnelActionResult>> => {
    const query = filter
      ? `?${new URLSearchParams(
        Object.entries(filter)
          .filter(([, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => [key, String(value)])
      ).toString()}`
      : '';

    return apiFetch<PagedPersonnelActionResult>(`${PERSONNEL_ACTIONS_BASE}${query}`);
  },

  getById: (id: number): Promise<ApiResponse<PersonnelActionDetail>> =>
    apiFetch<PersonnelActionDetail>(`${PERSONNEL_ACTIONS_BASE}/${id}`),

  getByEmployee: (employeeId: number): Promise<ApiResponse<PersonnelActionSummary[]>> =>
    apiFetch<PersonnelActionSummary[]>(`${PERSONNEL_ACTIONS_BASE}/by-employee/${employeeId}`),

  create: (
    payload: CreatePersonnelActionRequest
  ): Promise<ApiResponse<CreatePersonnelActionResponse>> =>
    apiFetch<CreatePersonnelActionResponse>(PERSONNEL_ACTIONS_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: UpdatePersonnelActionRequest): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${PERSONNEL_ACTIONS_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  approve: (
    id: number,
    payload: ApprovePersonnelActionRequest
  ): Promise<ApiResponse<CreatePersonnelActionResponse>> =>
    apiFetch<CreatePersonnelActionResponse>(`${PERSONNEL_ACTIONS_BASE}/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateDocument: (
    id: number,
    payload?: GenerateDocumentOverridesRequest
  ): Promise<ApiResponse<CreatePersonnelActionResponse>> =>
    apiFetch<CreatePersonnelActionResponse>(
      `${PERSONNEL_ACTIONS_BASE}/${id}/generate-document`,
      {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }
    ),

  markPendingSignatures: (id: number, payload?: CommentRequest): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${PERSONNEL_ACTIONS_BASE}/${id}/mark-pending-signatures`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),

  uploadSignedDocument: (
    id: number,
    payload: UploadSignedDocumentRequest
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${PERSONNEL_ACTIONS_BASE}/${id}/upload-signed-document`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  finalize: (id: number, payload?: CommentRequest): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${PERSONNEL_ACTIONS_BASE}/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),

  cancel: (id: number, payload: CancelPersonnelActionRequest): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${PERSONNEL_ACTIONS_BASE}/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  history: (id: number): Promise<ApiResponse<PersonnelActionStatusHistory[]>> =>
    apiFetch<PersonnelActionStatusHistory[]>(
      `${PERSONNEL_ACTIONS_BASE}/${id}/history`
    ),

  previewDocument: (payload: {
    employeeId: number;
    overrides: Record<string, string>;
  }): Promise<ApiResponse<{ pdfBase64: string; fileName: string }>> =>
    apiFetch<{ pdfBase64: string; fileName: string }>(
      `${PERSONNEL_ACTIONS_BASE}/preview-document`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
};