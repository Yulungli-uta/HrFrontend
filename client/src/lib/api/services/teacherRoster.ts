/**
 * Archivo: src/lib/api/services/teacherRoster.ts
 *
 * Listado y conteos de docentes titulares (página "Personal Docente").
 * El RMU solo viaja si el usuario tiene SALARY_HISTORY.READ; el servidor lo verifica,
 * por eso estos campos pueden venir en null aunque el docente tenga sueldo.
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedResult } from '../core/pagination';

export type TeacherRosterStatus = 'ACTIVE' | 'INACTIVE' | 'ALL';

export interface TeacherRosterFilter {
  search?: string;
  categoryTypeId?: number | null;
  levelTypeId?: number | null;
  dedicationTypeId?: number | null;
  departmentId?: number | null;
  status?: TeacherRosterStatus;
  pendingScaleAction?: boolean | null;
  ladderMismatch?: boolean | null;
}

export interface TeacherRosterItemDto {
  teacherStructureId: number;
  employeeId: number;
  fullName: string;
  idCard: string | null;
  employeeIsActive: boolean;
  departmentId: number | null;
  departmentName: string | null;
  facultyName: string | null;
  ladderId: number | null;
  ladderName: string | null;
  categoryTypeId: number | null;
  categoryName: string | null;
  levelTypeId: number | null;
  levelName: string | null;
  dedicationTypeId: number;
  dedicationName: string | null;
  weeklyClassHours: number | null;
  /** yyyy-MM-dd */
  structureStartDate: string;
  /** yyyy-MM-dd */
  appointmentDate: string | null;
  appointmentKind: string | null;
  appointmentActionNumber: string | null;
  rmu: number | null;
  rmuSource: string | null;
  rmuInForce: boolean | null;
  rmuNeedsReview: boolean | null;
  pendingScaleActionNumber: string | null;
  pendingScaleActionType: string | null;
  pendingScaleActionDate: string | null;
  ladderMismatch: boolean;
}

export interface TeacherRosterCountDto {
  typeId: number | null;
  name: string | null;
  parentTypeId: number | null;
  total: number;
}

export interface TeacherRosterMatrixCellDto {
  categoryTypeId: number | null;
  categoryName: string | null;
  dedicationTypeId: number;
  dedicationName: string | null;
  total: number;
}

export interface TeacherRosterSummaryDto {
  total: number;
  activeCount: number;
  inactiveCount: number;
  byCategory: TeacherRosterCountDto[];
  byCategoryLevel: TeacherRosterCountDto[];
  byDedication: TeacherRosterCountDto[];
  categoryByDedication: TeacherRosterMatrixCellDto[];
  pendingScaleActionCount: number;
  ladderMismatchCount: number;
  activeWithScaleActionWithoutStructure: number;
}

const BASE = '/api/v1/rh/teacher-roster';

function toQuery(filter: TeacherRosterFilter, extra: Record<string, string> = {}): string {
  const qs = new URLSearchParams(extra);
  if (filter.search?.trim()) qs.set('search', filter.search.trim());
  if (filter.categoryTypeId != null) qs.set('categoryTypeId', String(filter.categoryTypeId));
  if (filter.levelTypeId != null) qs.set('levelTypeId', String(filter.levelTypeId));
  if (filter.dedicationTypeId != null) qs.set('dedicationTypeId', String(filter.dedicationTypeId));
  if (filter.departmentId != null) qs.set('departmentId', String(filter.departmentId));
  if (filter.status) qs.set('status', filter.status);
  if (filter.pendingScaleAction != null) qs.set('pendingScaleAction', String(filter.pendingScaleAction));
  if (filter.ladderMismatch != null) qs.set('ladderMismatch', String(filter.ladderMismatch));
  return qs.toString();
}

export const TeacherRosterAPI = {
  list: (
    filter: TeacherRosterFilter,
    page: number,
    pageSize: number,
  ): Promise<ApiResponse<PagedResult<TeacherRosterItemDto>>> =>
    apiFetch<PagedResult<TeacherRosterItemDto>>(
      `${BASE}?${toQuery(filter, { page: String(page), pageSize: String(pageSize) })}`,
    ),

  summary: (filter: TeacherRosterFilter): Promise<ApiResponse<TeacherRosterSummaryDto>> =>
    apiFetch<TeacherRosterSummaryDto>(`${BASE}/summary?${toQuery(filter)}`),
};

// =============================================================================
// Docentes no titulares (contrato ocasional) — pestaña "No titulares"
// =============================================================================

/** ACTIVE = contrato vigente, EXPIRED = vencido (empleado activo), ALL = ambos. */
export type NonTitularRosterStatus = 'ACTIVE' | 'EXPIRED' | 'ALL';

export interface NonTitularRosterFilter {
  search?: string;
  dedicationTypeId?: number | null;
  contractTypeId?: number | null;
  departmentId?: number | null;
  status?: NonTitularRosterStatus;
}

export interface NonTitularRosterItemDto {
  employeeId: number;
  fullName: string;
  idCard: string | null;
  employeeIsActive: boolean;
  departmentId: number | null;
  departmentName: string | null;
  facultyName: string | null;
  jobName: string | null;
  dedicationTypeId: number | null;
  dedicationName: string | null;
  contractedHours: number | null;
  contractTypeId: number | null;
  contractTypeName: string | null;
  contractCode: string | null;
  /** yyyy-MM-dd */
  contractStartDate: string;
  contractEndDate: string | null;
  contractState: 'VIGENTE' | 'VENCIDO';
  rmu: number | null;
  rmuSource: string | null;
  rmuInForce: boolean | null;
  rmuNeedsReview: boolean | null;
}

export interface NonTitularRosterSummaryDto {
  total: number;
  vigenteCount: number;
  vencidoCount: number;
  byDedication: TeacherRosterCountDto[];
  byContractType: TeacherRosterCountDto[];
}

function toNonTitularQuery(filter: NonTitularRosterFilter, extra: Record<string, string> = {}): string {
  const qs = new URLSearchParams(extra);
  if (filter.search?.trim()) qs.set('search', filter.search.trim());
  if (filter.dedicationTypeId != null) qs.set('dedicationTypeId', String(filter.dedicationTypeId));
  if (filter.contractTypeId != null) qs.set('contractTypeId', String(filter.contractTypeId));
  if (filter.departmentId != null) qs.set('departmentId', String(filter.departmentId));
  if (filter.status) qs.set('status', filter.status);
  return qs.toString();
}

export const NonTitularRosterAPI = {
  list: (
    filter: NonTitularRosterFilter,
    page: number,
    pageSize: number,
  ): Promise<ApiResponse<PagedResult<NonTitularRosterItemDto>>> =>
    apiFetch<PagedResult<NonTitularRosterItemDto>>(
      `${BASE}/non-titular?${toNonTitularQuery(filter, { page: String(page), pageSize: String(pageSize) })}`,
    ),

  summary: (filter: NonTitularRosterFilter): Promise<ApiResponse<NonTitularRosterSummaryDto>> =>
    apiFetch<NonTitularRosterSummaryDto>(`${BASE}/non-titular/summary?${toNonTitularQuery(filter)}`),
};

// =============================================================================
// Estructura docente (cambio de escalafón / dedicación)
// =============================================================================

export interface TeacherStructureApplyChangeDto {
  newLadderId: number;
  newDedicationTypeId: number;
  weeklyClassHours: number | null;
  /** yyyy-MM-dd; no puede ser futura ni anterior al inicio de la estructura vigente. */
  effectiveDate: string;
  departmentId: number | null;
  /** Motivo o documento que respalda el cambio (5 a 500 caracteres). */
  reason: string;
}

export interface TeacherStructureDto {
  teacherStructureId: number;
  employeeId: number;
  employeeFullName: string;
  ladderId: number | null;
  ladderName: string | null;
  dedicationTypeId: number;
  dedicationName: string;
  weeklyClassHours: number | null;
  departmentId: number | null;
  departmentName: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

const STRUCTURES = '/api/v1/rh/teacher-structures';

export const TeacherStructuresAPI = {
  /** Historial completo (vigente y cerradas) de un empleado, la más reciente primero. */
  byEmployee: (employeeId: number): Promise<ApiResponse<TeacherStructureDto[]>> =>
    apiFetch<TeacherStructureDto[]>(`${STRUCTURES}/by-employee/${employeeId}`),

  /** Cierra la estructura vigente y crea una nueva con el escalón/dedicación indicados. */
  applyChange: (id: number, dto: TeacherStructureApplyChangeDto): Promise<ApiResponse<TeacherStructureDto>> =>
    apiFetch<TeacherStructureDto>(`${STRUCTURES}/${id}/apply-change`, { method: 'POST', body: JSON.stringify(dto) }),
};
