/**
 * Archivo: src/lib/api/services/documentTemplates.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - APIs del módulo de documentos generados por plantilla (base URL: api/v1/documents/).
 * - PersonnelActionsAPI   → acciones de personal que desencadenan documentos
 * - DocumentTemplatesAPI  → plantillas Word/HTML con campos dinámicos
 * - GeneratedDocumentsAPI → documentos generados a partir de plantillas
 *
 * NOTA: Este archivo es distinto de documents.ts que gestiona archivos adjuntos (FileManagementAPI / DocumentsAPI).
 */

import { apiFetch } from '../core/fetch';
import { createApiService } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';
import type { PagedRequest, PagedResult } from '../core/pagination';

// =============================================================================
// DTOs
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

export interface DocumentTemplateDto {
  templateId: number;
  name: string;
  description?: string | null;
  actionTypeId?: number | null;
  actionTypeName?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface DocumentTemplateCreateDto {
  name: string;
  description?: string | null;
  actionTypeId?: number | null;
  content: string;
}

export interface DocumentTemplateUpdateDto {
  name?: string;
  description?: string | null;
  content?: string;
}

export interface DocumentTemplateFieldDto {
  fieldId: number;
  templateId: number;
  fieldName: string;
  displayName?: string | null;
  dataType: string;
  sourceExpression?: string | null;
  defaultValue?: string | null;
  required: boolean;
}

export interface DocumentTemplateFieldCreateDto {
  fieldName: string;
  displayName?: string | null;
  dataType: string;
  sourceExpression?: string | null;
  defaultValue?: string | null;
  required?: boolean;
}

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
  ...createApiService<DocumentTemplateDto, DocumentTemplateCreateDto, DocumentTemplateUpdateDto>(
    '/api/v1/documents/templates'
  ),

  setStatus: (
    id: number | string,
    status: string
  ): Promise<ApiResponse<DocumentTemplateDto>> =>
    apiFetch<DocumentTemplateDto>(`/api/v1/documents/templates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  preview: (id: number | string): Promise<ApiResponse<Blob>> =>
    apiFetch<Blob>(`/api/v1/documents/templates/${id}/preview`, {
      method: 'GET',
      headers: { Accept: '*/*' },
    }),

  // ── Campos de la plantilla ──────────────────────────────────────────────────

  getFields: (id: number | string): Promise<ApiResponse<DocumentTemplateFieldDto[]>> =>
    apiFetch<DocumentTemplateFieldDto[]>(`/api/v1/documents/templates/${id}/fields`),

  createField: (
    id: number | string,
    data: DocumentTemplateFieldCreateDto
  ): Promise<ApiResponse<DocumentTemplateFieldDto>> =>
    apiFetch<DocumentTemplateFieldDto>(`/api/v1/documents/templates/${id}/fields`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateField: (
    id: number | string,
    fieldId: number | string,
    data: Partial<DocumentTemplateFieldCreateDto>
  ): Promise<ApiResponse<DocumentTemplateFieldDto>> =>
    apiFetch<DocumentTemplateFieldDto>(
      `/api/v1/documents/templates/${id}/fields/${fieldId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),

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
