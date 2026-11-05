/**
 * Archivo: src/lib/api/services/publicationSync.ts
 *
 * Sincronización de publicaciones científicas (Scopus y otros proveedores): perfil de investigador (ORCID e IDs por
 * plataforma), vista previa/confirmación y revisión por la Dirección de Investigación. Los proveedores viven en
 * ref_Types (categoría SCIENTIFIC_PROVIDER); las credenciales solo existen en el servidor.
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedResult } from '../core/pagination';

// ── Perfil de investigador ───────────────────────────────────────────────────

export interface ResearcherProviderIdDto {
  id: number;
  providerTypeId: number;
  providerCode: string;
  externalId: string;
  verifiedAt: string | null;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncSummary: string | null;
}

export interface ResearcherProfileDto {
  personId: number;
  orcid: string | null;
  orcidEnteredAt: string | null;
  providerIds: ResearcherProviderIdDto[];
  /** Quien consulta puede registrar/corregir el ORCID y los IDs (la propia persona o un Administrador). */
  canEdit: boolean;
}

/** Resultado de registrar el ORCID: guardado, o pendiente de confirmar porque el nombre de ORCID no coincide. */
export interface SetOrcidResult {
  saved: boolean;
  requiresConfirmation: boolean;
  /** Nombre que publica ORCID (para confirmar con la persona). */
  orcidName: string | null;
  /** Aviso cuando se guardó sin poder comprobar el nombre (ORCID sin nombre público o sin respuesta). */
  warning: string | null;
  profile: ResearcherProfileDto | null;
}

const PROFILE_BASE = '/api/v1/rh/cv/researcher-profiles';

export const ResearcherProfileAPI = {
  get: (personId: number): Promise<ApiResponse<ResearcherProfileDto>> =>
    apiFetch<ResearcherProfileDto>(`${PROFILE_BASE}/person/${personId}`),

  /** El servidor comprueba en orcid.org que exista y que el nombre corresponda; si no coincide pide confirmación. */
  setOrcid: (personId: number, orcid: string, acknowledgeNameMismatch = false): Promise<ApiResponse<SetOrcidResult>> =>
    apiFetch<SetOrcidResult>(`${PROFILE_BASE}/person/${personId}/orcid`, {
      method: 'PUT',
      body: JSON.stringify({ orcid, acknowledgeNameMismatch }),
    }),

  addProviderId: (personId: number, providerCode: string, externalId: string): Promise<ApiResponse<ResearcherProviderIdDto>> =>
    apiFetch<ResearcherProviderIdDto>(`${PROFILE_BASE}/person/${personId}/provider-ids`, {
      method: 'POST',
      body: JSON.stringify({ providerCode, externalId }),
    }),

  removeProviderId: (personId: number, providerIdId: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${PROFILE_BASE}/person/${personId}/provider-ids/${providerIdId}`, { method: 'DELETE' }),
};

// ── Sincronización ───────────────────────────────────────────────────────────

/** Qué le falta a la persona para sincronizar un proveedor. */
export type SyncMissing = 'ORCID' | 'PROVIDER_ID' | 'NO_ADAPTER' | 'NOT_CONFIGURED';

export interface SyncProviderStatus {
  code: string;
  name: string;
  idLabel: string | null;
  profileUrlTemplate: string | null;
  idPattern: string | null;
  hasAdapter: boolean;
  requiresProviderId: boolean;
  usesProfileOrcid: boolean;
  allowsMultipleIds: boolean;
  ids: ResearcherProviderIdDto[];
  ready: boolean;
  missing: SyncMissing[];
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncSummary: string | null;
}

export interface PublicationSyncReadiness {
  personId: number;
  hasOrcid: boolean;
  orcid: string | null;
  canEdit: boolean;
  providers: SyncProviderStatus[];
}

export type SyncItemStatus = 'NEW' | 'EXISTING' | 'COMPLETABLE' | 'LOCKED' | 'AMBIGUOUS' | 'ERROR';

export interface SyncCandidate {
  publicationId: number;
  title: string;
  doi: string | null;
  publicationDate: string | null;
  approvalStatus: string;
}

export interface PublicationSyncItem {
  externalId: string;
  title: string;
  journalName: string | null;
  doi: string | null;
  publicationDate: string | null;
  typeLabel: string | null;
  affiliations: string[];
  recordUrl: string | null;
  status: SyncItemStatus;
  matchedPublicationId: number | null;
  candidates: SyncCandidate[];
  message: string | null;
}

export interface PublicationSyncPreview {
  previewToken: string;
  personId: number;
  providerCode: string;
  available: boolean;
  isPartial: boolean;
  message: string | null;
  totalFound: number;
  newCount: number;
  existingCount: number;
  completableCount: number;
  lockedCount: number;
  ambiguousCount: number;
  errorCount: number;
  lastSyncedAt: string | null;
  items: PublicationSyncItem[];
  /** Publicaciones del proveedor que no se importan por su tipo (libros, cartas, datos…). */
  skippedByType: number;
}

export type SyncResolutionAction = 'LINK' | 'IMPORT' | 'SKIP';

export interface SyncResolution {
  externalId: string;
  action: SyncResolutionAction;
  publicationId?: number | null;
}

export interface PublicationSyncResult {
  created: number;
  completed: number;
  skipped: number;
  locked: number;
  ambiguous: number;
  isPartial: boolean;
}

const SYNC_BASE = '/api/v1/rh/cv/publications-sync';

export const PublicationSyncAPI = {
  readiness: (personId: number): Promise<ApiResponse<PublicationSyncReadiness>> =>
    apiFetch<PublicationSyncReadiness>(`${SYNC_BASE}/person/${personId}/readiness`),

  /** Consulta al proveedor y compara con lo registrado; no guarda nada. */
  preview: (personId: number, providerCode: string): Promise<ApiResponse<PublicationSyncPreview>> =>
    apiFetch<PublicationSyncPreview>(`${SYNC_BASE}/person/${personId}/preview`, {
      method: 'POST',
      body: JSON.stringify({ providerCode }),
    }),

  confirm: (
    personId: number,
    previewToken: string,
    providerCode: string,
    resolutions: SyncResolution[],
  ): Promise<ApiResponse<PublicationSyncResult>> =>
    apiFetch<PublicationSyncResult>(`${SYNC_BASE}/person/${personId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ previewToken, providerCode, resolutions }),
    }),
};

// ── Revisión (Dirección de Investigación) ────────────────────────────────────

export type PublicationApprovalStatus = 'SIN_REVISION' | 'APROBADA' | 'RECHAZADA';

export interface PublicationReviewFilter {
  /** SIN_REVISION (por defecto), APROBADA, RECHAZADA o ALL. */
  status?: PublicationApprovalStatus | 'ALL';
  syncedOnly?: boolean;
  providerCode?: string;
  search?: string;
  year?: number | null;
  syncedFrom?: string;
  syncedTo?: string;
}

export interface PublicationReviewItem {
  publicationId: number;
  personId: number;
  personName: string;
  idCard: string;
  title: string;
  journalName: string | null;
  doi: string | null;
  link: string | null;
  publicationDate: string | null;
  sourceProviderTypeId: number;
  providerCode: string;
  providerName: string;
  externalId: string | null;
  approvalStatus: PublicationApprovalStatus;
  lastSyncedAt: string | null;
  approvedAt: string | null;
  reviewNotes: string | null;
}

export interface PublicationReviewSummary {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  peopleWithPending: number;
}

export interface PublicationReviewResult {
  processed: number;
  failed: { id: number; reason: string }[];
}

const REVIEW_BASE = '/api/v1/rh/cv/publications/review';

function toReviewQuery(filter: PublicationReviewFilter, page: number, pageSize: number): string {
  const q = new URLSearchParams();
  q.set('page', String(page));
  q.set('pageSize', String(pageSize));
  q.set('status', filter.status ?? 'SIN_REVISION');
  q.set('syncedOnly', String(filter.syncedOnly ?? true));
  if (filter.providerCode) q.set('providerCode', filter.providerCode);
  if (filter.search?.trim()) q.set('search', filter.search.trim());
  if (filter.year) q.set('year', String(filter.year));
  if (filter.syncedFrom) q.set('syncedFrom', filter.syncedFrom);
  if (filter.syncedTo) q.set('syncedTo', filter.syncedTo);
  return q.toString();
}

const post = (action: string, ids: number[], notes?: string): Promise<ApiResponse<PublicationReviewResult>> =>
  apiFetch<PublicationReviewResult>(`${REVIEW_BASE}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ ids, notes: notes ?? null }),
  });

export const PublicationReviewAPI = {
  list: (
    filter: PublicationReviewFilter,
    page: number,
    pageSize: number,
  ): Promise<ApiResponse<PagedResult<PublicationReviewItem>>> =>
    apiFetch<PagedResult<PublicationReviewItem>>(`${REVIEW_BASE}?${toReviewQuery(filter, page, pageSize)}`),

  summary: (): Promise<ApiResponse<PublicationReviewSummary>> =>
    apiFetch<PublicationReviewSummary>(`${REVIEW_BASE}/summary`),

  approve: (ids: number[]) => post('approve', ids),
  reject: (ids: number[], notes: string) => post('reject', ids, notes),
  reopen: (ids: number[], notes: string) => post('reopen', ids, notes),
  restore: (ids: number[]) => post('restore', ids),
};
