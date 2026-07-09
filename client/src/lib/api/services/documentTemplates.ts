/**
 * Archivo: src/lib/api/services/documentTemplates.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - APIs del módulo de documentos generados por plantilla (base URL: api/v1/documents/).
 * - PersonnelActionsAPI   → acciones de personal que desencadenan documentos
 * - DocumentTemplatesAPI  → plantillas HTML con tokens {{CAMPO}}, versionamiento e importación
 * - GeneratedDocumentsAPI → documentos generados a partir de plantillas
 *
 * NOTA: Este archivo es distinto de documents.ts que gestiona archivos adjuntos (FileManagementAPI / DocumentsAPI).
 */

import { apiFetch } from '../core/fetch';
import { createApiService } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';
import type { PagedRequest, PagedResult } from '../core/pagination';

// =============================================================================
// DTOs — Acciones de Personal
// =============================================================================

export interface PersonnelActionDto {
  personnelActionId: number;
  employeeId: number;
  actionTypeId: number;
  actionTypeName?: string | null;
  status: string;
  requestedBy?: number | null;
  requestedAt: string;
  approvedBy?: number | null;
  approvedAt?: string | null;
  generatedDocumentId?: number | null;
  notes?: string | null;
}

export interface PersonnelActionCreateDto {
  employeeId: number;
  actionTypeId: number;
  notes?: string | null;
}

export interface PersonnelActionUpdateDto {
  actionTypeId?: number;
  notes?: string | null;
}

export interface PersonnelActionApproveDto {
  approved: boolean;
  comment?: string | null;
}

// =============================================================================
// DTOs — Plantillas Documentales (sincronizados con backend)
// =============================================================================

export type DocumentTemplateStatus = 'Draft' | 'Published' | 'Archived';
export type LayoutType = 'A4Portrait' | 'A4Landscape' | 'LetterPortrait' | 'LetterLandscape';
export type FieldSourceType = 'Employee' | 'Contract' | 'Movement' | 'System' | 'Manual';

export interface DocumentTemplateSummaryDto {
  templateId: number;
  templateCode: string;
  name: string;
  description?: string | null;
  templateType: string;
  version: string;
  layoutType: LayoutType;
  status: DocumentTemplateStatus;
  requiresSignature: boolean;
  requiresApproval: boolean;
  fieldCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** True si está vinculada a algún tipo de contrato o de acción de personal activo. */
  isInUse: boolean;
  /** Nombres de los tipos de contrato/acción de personal activos que usan esta plantilla. */
  usedBy: string[];
}

export interface DocumentTemplateFieldDto {
  fieldId: number;
  templateId: number;
  fieldName: string;
  label: string;
  sourceType: FieldSourceType;
  sourceProperty?: string | null;
  dataType: string;
  formatPattern?: string | null;
  defaultValue?: string | null;
  isRequired: boolean;
  isEditable: boolean;
  sortOrder: number;
  helpText?: string | null;
}

export interface DocumentTemplateDetailDto extends DocumentTemplateSummaryDto {
  htmlContent: string;
  cssStyles?: string | null;
  metaJson?: string | null;
  fields: DocumentTemplateFieldDto[];
  createdBy?: number | null;
  updatedBy?: number | null;
}

export interface CreateDocumentTemplateRequest {
  templateCode: string;
  name: string;
  description?: string | null;
  templateType: string;
  version: string;
  layoutType: LayoutType;
  htmlContent: string;
  cssStyles?: string | null;
  metaJson?: string | null;
  requiresSignature: boolean;
  requiresApproval: boolean;
  fields?: CreateDocumentTemplateFieldRequest[] | null;
}

export interface UpdateDocumentTemplateRequest {
  name: string;
  description?: string | null;
  version: string;
  layoutType: LayoutType;
  status: DocumentTemplateStatus;
  htmlContent: string;
  cssStyles?: string | null;
  metaJson?: string | null;
  requiresSignature: boolean;
  requiresApproval: boolean;
}

export interface CreateDocumentTemplateFieldRequest {
  fieldName: string;
  label: string;
  sourceType: FieldSourceType;
  sourceProperty?: string | null;
  dataType: string;
  formatPattern?: string | null;
  defaultValue?: string | null;
  isRequired: boolean;
  isEditable: boolean;
  sortOrder: number;
  helpText?: string | null;
}

export interface PreviewTemplateRequest {
  templateId: number;
  employeeId?: number | null;
  entityId?: number | null;
  manualOverrides?: Record<string, string> | null;
}

export interface UnresolvedFieldDto {
  fieldName: string;
  label: string;
  reason: string;
}

export interface PreviewTemplateResponse {
  htmlContent: string;
  unresolvedFields: UnresolvedFieldDto[];
}

export interface TemplateVersionSummaryDto {
  templateId: number;
  templateCode: string;
  version: string;
  status: DocumentTemplateStatus;
  name: string;
  createdAt?: string | null;
  createdBy?: number | null;
  updatedAt?: string | null;
  updatedBy?: number | null;
}

export interface CreateVersionResponse {
  newTemplateId: number;
  newVersion: string;
  templateCode: string;
}

export interface LegacyPlaceholderDto {
  placeholder: string;
  occurrences: number;
  context: string;
}

export interface ImportContractTextResponse {
  contractTypeId: number;
  contractTypeName: string;
  rawText: string;
  placeholders: LegacyPlaceholderDto[];
}

export interface TemplateContractTypeOptionDto {
  contractTypeId: number;
  name: string;
  isDefault: boolean;
}

export interface TemplateActionTypeOptionDto {
  personnelActionTypeId: number;
  name: string;
  isDefault: boolean;
}

export interface ExtractTokensRequest {
  htmlContent: string;
}

export interface ExtractTokensResponse {
  tokens: string[];
}

// =============================================================================
// DTOs — Documentos Generados
// =============================================================================

export interface GeneratedDocumentDto {
  generatedDocumentId: number;
  templateId: number;
  templateName?: string | null;
  personnelActionId?: number | null;
  employeeId?: number | null;
  status: string;
  generatedAt: string;
  approvedBy?: number | null;
  approvedAt?: string | null;
  filePath?: string | null;
}

export interface GeneratedDocumentCreateDto {
  templateId: number;
  personnelActionId?: number | null;
  employeeId?: number | null;
  fieldValues?: Record<string, string>;
}

export interface GeneratedDocumentApproveDto {
  approved: boolean;
  comment?: string | null;
}

// =============================================================================
// API de Acciones de Personal
// =============================================================================

export const PersonnelActionsAPI = {
  ...createApiService<PersonnelActionDto, PersonnelActionCreateDto, PersonnelActionUpdateDto>(
    '/api/v1/documents/personnel-actions'
  ),

  listPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<PersonnelActionDto>>> => {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.sortDirection ? { sortDirection: params.sortDirection } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    });
    return apiFetch<PagedResult<PersonnelActionDto>>(
      `/api/v1/documents/personnel-actions/paged?${qs.toString()}`
    );
  },

  byEmployee: (employeeId: number | string): Promise<ApiResponse<PersonnelActionDto[]>> =>
    apiFetch<PersonnelActionDto[]>(
      `/api/v1/documents/personnel-actions/employee/${employeeId}`
    ),

  approve: (
    id: number | string,
    payload: PersonnelActionApproveDto
  ): Promise<ApiResponse<PersonnelActionDto>> =>
    apiFetch<PersonnelActionDto>(`/api/v1/documents/personnel-actions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateDocument: (id: number | string): Promise<ApiResponse<GeneratedDocumentDto>> =>
    apiFetch<GeneratedDocumentDto>(
      `/api/v1/documents/personnel-actions/${id}/generate`,
      { method: 'POST' }
    ),
};

// =============================================================================
// API de Plantillas de Documentos
// =============================================================================

export const DocumentTemplatesAPI = {
  getAll: (params?: {
    templateType?: string;
    status?: DocumentTemplateStatus;
  }): Promise<ApiResponse<DocumentTemplateSummaryDto[]>> => {
    const qs = new URLSearchParams();
    if (params?.templateType) qs.set('templateType', params.templateType);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<DocumentTemplateSummaryDto[]>(`/api/v1/documents/templates${query}`);
  },

  getById: (id: number | string): Promise<ApiResponse<DocumentTemplateDetailDto>> =>
    apiFetch<DocumentTemplateDetailDto>(`/api/v1/documents/templates/${id}`),

  create: (data: CreateDocumentTemplateRequest): Promise<ApiResponse<{ id: number }>> =>
    apiFetch<{ id: number }>('/api/v1/documents/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: number | string,
    data: UpdateDocumentTemplateRequest
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/documents/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  setStatus: (
    id: number | string,
    status: DocumentTemplateStatus
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/documents/templates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  preview: (data: PreviewTemplateRequest): Promise<ApiResponse<PreviewTemplateResponse>> =>
    apiFetch<PreviewTemplateResponse>('/api/v1/documents/templates/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ── Versionamiento ──────────────────────────────────────────────────────────

  createVersion: (
    id: number | string,
    version: string
  ): Promise<ApiResponse<CreateVersionResponse>> =>
    apiFetch<CreateVersionResponse>(`/api/v1/documents/templates/${id}/version`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    }),

  getVersionsByCode: (code: string): Promise<ApiResponse<TemplateVersionSummaryDto[]>> =>
    apiFetch<TemplateVersionSummaryDto[]>(
      `/api/v1/documents/templates/code/${encodeURIComponent(code)}/versions`
    ),

  // ── Importación de ContractText ─────────────────────────────────────────────

  getContractTypesForTemplate: (
    templateId: number | string
  ): Promise<ApiResponse<TemplateContractTypeOptionDto[]>> =>
    apiFetch<TemplateContractTypeOptionDto[]>(
      `/api/v1/documents/templates/${templateId}/contract-types`
    ),

  getActionTypesForTemplate: (
    templateId: number | string
  ): Promise<ApiResponse<TemplateActionTypeOptionDto[]>> =>
    apiFetch<TemplateActionTypeOptionDto[]>(
      `/api/v1/documents/templates/${templateId}/action-types`
    ),

  importContractText: (
    contractTypeId: number | string
  ): Promise<ApiResponse<ImportContractTextResponse>> =>
    apiFetch<ImportContractTextResponse>(
      `/api/v1/documents/templates/contract-types/${contractTypeId}/import-text`
    ),

  // ── Utilidades ──────────────────────────────────────────────────────────────

  extractTokens: (htmlContent: string): Promise<ApiResponse<ExtractTokensResponse>> =>
    apiFetch<ExtractTokensResponse>('/api/v1/documents/templates/extract-tokens', {
      method: 'POST',
      body: JSON.stringify({ htmlContent }),
    }),

  // ── Campos ──────────────────────────────────────────────────────────────────

  getFields: (id: number | string): Promise<ApiResponse<DocumentTemplateFieldDto[]>> =>
    apiFetch<DocumentTemplateFieldDto[]>(`/api/v1/documents/templates/${id}/fields`),

  createField: (
    id: number | string,
    data: CreateDocumentTemplateFieldRequest
  ): Promise<ApiResponse<{ fieldId: number }>> =>
    apiFetch<{ fieldId: number }>(`/api/v1/documents/templates/${id}/fields`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateField: (
    id: number | string,
    fieldId: number | string,
    data: Partial<CreateDocumentTemplateFieldRequest>
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/documents/templates/${id}/fields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteField: (
    id: number | string,
    fieldId: number | string
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/documents/templates/${id}/fields/${fieldId}`, {
      method: 'DELETE',
    }),
};

// =============================================================================
// API de Documentos Generados
// =============================================================================

export const GeneratedDocumentsAPI = {
  ...createApiService<GeneratedDocumentDto, GeneratedDocumentCreateDto>(
    '/api/v1/documents/generated'
  ),

  listPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<GeneratedDocumentDto>>> => {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.sortDirection ? { sortDirection: params.sortDirection } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    });
    return apiFetch<PagedResult<GeneratedDocumentDto>>(
      `/api/v1/documents/generated/paged?${qs.toString()}`
    );
  },

  download: (id: number | string): Promise<ApiResponse<Blob>> =>
    apiFetch<Blob>(`/api/v1/documents/generated/${id}/download`, {
      method: 'GET',
      headers: { Accept: '*/*' },
    }),

  approve: (
    id: number | string,
    payload: GeneratedDocumentApproveDto
  ): Promise<ApiResponse<GeneratedDocumentDto>> =>
    apiFetch<GeneratedDocumentDto>(`/api/v1/documents/generated/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  setStatus: (
    id: number | string,
    status: string
  ): Promise<ApiResponse<GeneratedDocumentDto>> =>
    apiFetch<GeneratedDocumentDto>(`/api/v1/documents/generated/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
