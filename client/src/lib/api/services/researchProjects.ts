/**
 * Archivo: src/lib/api/services/researchProjects.ts
 *
 * Proyectos de investigación: gestión (rol R_PROYECTOS) y consulta de la participación de una
 * persona (pestaña de la hoja de vida). Las resoluciones son PDF cargados en el sistema; la URL
 * de cada documento la genera el backend y se abre con la sesión del usuario.
 */
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedResult } from '../core/pagination';
import { fetchMultipart } from './documents';
import { API_CONFIG } from '../core/config';

export interface ResearchDuration {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  text: string;
}

export interface ResearchResolution {
  number: string;
  documentUrl: string | null;
  fileName: string | null;
}

export interface ResearchExtension {
  resolutionNumber: string;
  endDate: string;
  duration: ResearchDuration;
  documentUrl: string | null;
  fileName: string | null;
}

export interface ResearchParticipation {
  id: number;
  code: string;
  isExternal: boolean;
  personId: number | null;
  fullName: string;
  identification: string | null;
  institution: string | null;
  roleTypeId: number;
  roleCode: string;
  roleName: string;
  startDate: string;
  endDate: string;
  duration: ResearchDuration;
}

export interface ResearchProject {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  executionTime: ResearchDuration;
  approvalResolution: ResearchResolution;
  hasExtension: boolean;
  extension: ResearchExtension | null;
  completionResolution: ResearchResolution;
  participations: ResearchParticipation[];
}

export interface ResearchProjectListItem {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  hasExtension: boolean;
  participantsCount: number;
}

export interface ResearchPersonLookup {
  personId: number;
  idCard: string;
  fullName: string;
}

/** Participación tal como se envía al guardar (id solo al editar una existente). */
export interface ResearchParticipationInput {
  id?: number;
  isExternal: boolean;
  personId?: number | null;
  externalFullName?: string;
  externalIdentification?: string;
  roleTypeId: number;
  startDate: string;
  endDate: string;
}

export interface ResearchProjectInput {
  name: string;
  startDate: string;
  endDate: string;
  approvalResolutionNumber: string;
  hasExtension: boolean;
  extensionResolutionNumber?: string;
  extensionEndDate?: string;
  completionResolutionNumber: string;
  participations: ResearchParticipationInput[];
}

export interface ResearchProjectFiles {
  approvalFile?: File | null;
  extensionFile?: File | null;
  completionFile?: File | null;
}

const BASE = '/api/v1/rh/research-projects';

/**
 * fetchMultipart solo lee `message` del cuerpo del error, pero el backend responde ProblemDetails con el mensaje
 * real en `detail` (p. ej. "No puede haber dos Coordinadores Principales al mismo tiempo"): se lo sube a `message`.
 */
function surfaceProblemDetail<T>(resp: ApiResponse<T>): ApiResponse<T> {
  if (resp.status === 'error') {
    const detail = (resp.error.details as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return { status: 'error', error: { ...resp.error, message: detail } };
    }
  }
  return resp;
}

function buildForm(data: ResearchProjectInput, files: ResearchProjectFiles): FormData {
  const form = new FormData();
  form.append('data', JSON.stringify(data));
  if (files.approvalFile) form.append('approvalFile', files.approvalFile);
  if (files.extensionFile) form.append('extensionFile', files.extensionFile);
  if (files.completionFile) form.append('completionFile', files.completionFile);
  return form;
}

export const ResearchProjectsAPI = {
  /** Listado paginado. `from`/`to` ("yyyy-MM-dd"): proyectos cuyo período se cruza con ese rango. */
  search: (params: { search?: string; from?: string; to?: string; page: number; pageSize: number }): Promise<ApiResponse<PagedResult<ResearchProjectListItem>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.search?.trim()) qs.set('search', params.search.trim());
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    return apiFetch<PagedResult<ResearchProjectListItem>>(`${BASE}?${qs.toString()}`);
  },

  getById: (id: number): Promise<ApiResponse<ResearchProject>> => apiFetch<ResearchProject>(`${BASE}/${id}`),

  create: async (data: ResearchProjectInput, files: ResearchProjectFiles): Promise<ApiResponse<ResearchProject>> =>
    surfaceProblemDetail(await fetchMultipart<ResearchProject>(`${API_CONFIG.RH_BASE_URL}${BASE}`, buildForm(data, files), 'POST')),

  update: async (id: number, data: ResearchProjectInput, files: ResearchProjectFiles): Promise<ApiResponse<ResearchProject>> =>
    surfaceProblemDetail(await fetchMultipart<ResearchProject>(`${API_CONFIG.RH_BASE_URL}${BASE}/${id}`, buildForm(data, files), 'PUT')),

  remove: (id: number): Promise<ApiResponse<void>> => apiFetch<void>(`${BASE}/${id}`, { method: 'DELETE' }),

  searchPeople: (term: string): Promise<ApiResponse<ResearchPersonLookup[]>> =>
    apiFetch<ResearchPersonLookup[]>(`${BASE}/people-search?term=${encodeURIComponent(term)}`),

  /** Proyectos donde participa la persona (solo sus participaciones) — pestaña de la hoja de vida. */
  getByPerson: (personId: number): Promise<ApiResponse<ResearchProject[]>> =>
    apiFetch<ResearchProject[]>(`/api/v1/rh/cv/research-participations/person/${personId}`),

  /** Descarga el PDF de una resolución con la sesión del usuario (la URL viene del backend). */
  downloadDocument: (documentUrl: string): Promise<ApiResponse<Blob>> => {
    let path = documentUrl;
    try {
      path = new URL(documentUrl, window.location.origin).pathname;
    } catch {
      /* URL relativa: se usa tal cual */
    }
    return apiFetch<Blob>(path, { method: 'GET', headers: { Accept: '*/*' } });
  },
};
