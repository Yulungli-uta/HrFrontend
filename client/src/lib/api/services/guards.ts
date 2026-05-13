/**
 * APIs del Módulo de Guardias Rotativos
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedRequest, PagedResult } from '../core/pagination';
import type {
  GuardServiceLocationDto,
  GuardServiceLocationTreeDto,
  CreateGuardServiceLocationDto,
  UpdateGuardServiceLocationDto,
  GuardRotationGroupDto,
  GuardRotationGroupEmployeeDto,
  CreateGuardRotationGroupDto,
  UpdateGuardRotationGroupDto,
  AssignEmployeeToRotationGroupDto,
  RemoveEmployeeFromRotationGroupDto,
  LocationSummaryDto,
  LocationGroupDetailDto,
  RotationPatternDto,
  CreateRotationPatternDto,
  UpdateRotationPatternDto,
  UpsertRotationPatternDetailsDto,
  GuardShiftCoverageRequirementDto,
  CreateCoverageRequirementDto,
  UpdateCoverageRequirementDto,
  GuardShiftPlanningDto,
  GuardShiftCalendarItemDto,
  GuardShiftCalendarFilterDto,
  CreateGuardShiftPlanningDto,
  GenerateGuardShiftPlanningRequestDto,
  GuardShiftPlanningResultDto,
  ValidateGuardAssignmentRequestDto,
  ValidateGuardAssignmentResultDto,
  GuardDashboardDto,
  GuardShiftChangeDto,
  CreateGuardShiftReplacementDto,
  ApproveGuardShiftChangeDto,
  RejectGuardShiftChangeDto,
  EmployeeAvailabilityBlockDto,
  CreateManualAvailabilityBlockDto,
  EmployeeAvailabilityFilterDto,
  SyncAvailabilityBlocksResultDto,
  GuardAssignmentValidationDto,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  ScheduleBoardFilterDto,
  ScheduleBoardResponseDto,
  GuardShiftPlanningDetailDto,
} from '@/types/guards';

const BASE = '/api/v1/rh';

// =============================================================================
// Ubicaciones de Servicio
// =============================================================================

export const GuardServiceLocationsAPI = {
  getTree: (): Promise<ApiResponse<GuardServiceLocationTreeDto[]>> =>
    apiFetch<GuardServiceLocationTreeDto[]>(`${BASE}/guard-service-locations/tree`),

  getAssignable: (): Promise<ApiResponse<GuardServiceLocationDto[]>> =>
    apiFetch<GuardServiceLocationDto[]>(`${BASE}/guard-service-locations/assignable`),

  getById: (id: number): Promise<ApiResponse<GuardServiceLocationDto>> =>
    apiFetch<GuardServiceLocationDto>(`${BASE}/guard-service-locations/${id}`),

  create: (dto: CreateGuardServiceLocationDto): Promise<ApiResponse<GuardServiceLocationDto>> =>
    apiFetch<GuardServiceLocationDto>(`${BASE}/guard-service-locations`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: number, dto: UpdateGuardServiceLocationDto): Promise<ApiResponse<GuardServiceLocationDto>> =>
    apiFetch<GuardServiceLocationDto>(`${BASE}/guard-service-locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
};

// =============================================================================
// Grupos de Rotación
// =============================================================================

export const GuardRotationGroupsAPI = {
  getAll: (): Promise<ApiResponse<GuardRotationGroupDto[]>> =>
    apiFetch<GuardRotationGroupDto[]>(`${BASE}/guard-rotation-groups`),

  listPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<GuardRotationGroupDto>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.search?.trim()) qs.set('search', params.search.trim());
    return apiFetch<PagedResult<GuardRotationGroupDto>>(`${BASE}/guard-rotation-groups/paged?${qs}`);
  },

  getById: (id: number): Promise<ApiResponse<GuardRotationGroupDto>> =>
    apiFetch<GuardRotationGroupDto>(`${BASE}/guard-rotation-groups/${id}`),

  create: (dto: CreateGuardRotationGroupDto): Promise<ApiResponse<GuardRotationGroupDto>> =>
    apiFetch<GuardRotationGroupDto>(`${BASE}/guard-rotation-groups`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: number, dto: UpdateGuardRotationGroupDto): Promise<ApiResponse<GuardRotationGroupDto>> =>
    apiFetch<GuardRotationGroupDto>(`${BASE}/guard-rotation-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),

  getEmployees: (groupId: number): Promise<ApiResponse<GuardRotationGroupEmployeeDto[]>> =>
    apiFetch<GuardRotationGroupEmployeeDto[]>(`${BASE}/guard-rotation-groups/${groupId}/employees`),

  assignEmployee: (groupId: number, dto: AssignEmployeeToRotationGroupDto): Promise<ApiResponse<GuardRotationGroupEmployeeDto>> =>
    apiFetch<GuardRotationGroupEmployeeDto>(`${BASE}/guard-rotation-groups/${groupId}/employees`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  removeEmployee: (groupId: number, dto: RemoveEmployeeFromRotationGroupDto): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/guard-rotation-groups/${groupId}/employees`, {
      method: 'DELETE',
      body: JSON.stringify(dto),
    }),

  getLocationSummary: (): Promise<ApiResponse<LocationSummaryDto[]>> =>
    apiFetch<LocationSummaryDto[]>(`${BASE}/guard-rotation-groups/location-summary`),

  getByLocationKey: (locationKey: string): Promise<ApiResponse<LocationGroupDetailDto[]>> =>
    apiFetch<LocationGroupDetailDto[]>(`${BASE}/guard-rotation-groups/by-location/${encodeURIComponent(locationKey)}`),
};

// =============================================================================
// Patrones de Rotación
// =============================================================================

export const RotationPatternsAPI = {
  getAll: (): Promise<ApiResponse<RotationPatternDto[]>> =>
    apiFetch<RotationPatternDto[]>(`${BASE}/rotation-patterns`),

  listPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<RotationPatternDto>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.search?.trim()) qs.set('search', params.search.trim());
    return apiFetch<PagedResult<RotationPatternDto>>(`${BASE}/rotation-patterns/paged?${qs}`);
  },

  getById: (id: number): Promise<ApiResponse<RotationPatternDto>> =>
    apiFetch<RotationPatternDto>(`${BASE}/rotation-patterns/${id}`),

  create: (dto: CreateRotationPatternDto): Promise<ApiResponse<RotationPatternDto>> =>
    apiFetch<RotationPatternDto>(`${BASE}/rotation-patterns`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: number, dto: UpdateRotationPatternDto): Promise<ApiResponse<RotationPatternDto>> =>
    apiFetch<RotationPatternDto>(`${BASE}/rotation-patterns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),

  setDetails: (id: number, dto: UpsertRotationPatternDetailsDto): Promise<ApiResponse<RotationPatternDto>> =>
    apiFetch<RotationPatternDto>(`${BASE}/rotation-patterns/${id}/details`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};

// =============================================================================
// Requisitos de Cobertura
// =============================================================================

export const GuardCoverageRequirementsAPI = {
  getAll: (): Promise<ApiResponse<GuardShiftCoverageRequirementDto[]>> =>
    apiFetch<GuardShiftCoverageRequirementDto[]>(`${BASE}/guard-shift-coverage-requirements`),

  listPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<GuardShiftCoverageRequirementDto>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    return apiFetch<PagedResult<GuardShiftCoverageRequirementDto>>(`${BASE}/guard-shift-coverage-requirements/paged?${qs}`);
  },

  getById: (id: number): Promise<ApiResponse<GuardShiftCoverageRequirementDto>> =>
    apiFetch<GuardShiftCoverageRequirementDto>(`${BASE}/guard-shift-coverage-requirements/${id}`),

  create: (dto: CreateCoverageRequirementDto): Promise<ApiResponse<GuardShiftCoverageRequirementDto>> =>
    apiFetch<GuardShiftCoverageRequirementDto>(`${BASE}/guard-shift-coverage-requirements`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: number, dto: UpdateCoverageRequirementDto): Promise<ApiResponse<GuardShiftCoverageRequirementDto>> =>
    apiFetch<GuardShiftCoverageRequirementDto>(`${BASE}/guard-shift-coverage-requirements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
};

// =============================================================================
// Planificación de Turnos
// =============================================================================

export const GuardShiftPlanningAPI = {
  getDashboard: (): Promise<ApiResponse<GuardDashboardDto>> =>
    apiFetch<GuardDashboardDto>(`${BASE}/guard-shift-planning/dashboard`),

  getCalendar: (filter: GuardShiftCalendarFilterDto): Promise<ApiResponse<GuardShiftCalendarItemDto[]>> => {
    const params = new URLSearchParams();
    if (filter.startDate)  params.set('startDate',  filter.startDate);
    if (filter.endDate)    params.set('endDate',    filter.endDate);
    if (filter.groupId)    params.set('groupId',    String(filter.groupId));
    if (filter.locationId) params.set('locationId', String(filter.locationId));
    if (filter.employeeId) params.set('employeeId', String(filter.employeeId));
    if (filter.status)     params.set('status',     filter.status);
    const qs = params.toString();
    return apiFetch<GuardShiftCalendarItemDto[]>(`${BASE}/guard-shift-planning/calendar${qs ? `?${qs}` : ''}`);
  },

  getById: (id: number): Promise<ApiResponse<GuardShiftPlanningDto>> =>
    apiFetch<GuardShiftPlanningDto>(`${BASE}/guard-shift-planning/${id}`),

  create: (dto: CreateGuardShiftPlanningDto): Promise<ApiResponse<GuardShiftPlanningDto>> =>
    apiFetch<GuardShiftPlanningDto>(`${BASE}/guard-shift-planning`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  generate: (dto: GenerateGuardShiftPlanningRequestDto): Promise<ApiResponse<GuardShiftPlanningResultDto>> =>
    apiFetch<GuardShiftPlanningResultDto>(`${BASE}/guard-shift-planning/generate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  validate: (dto: ValidateGuardAssignmentRequestDto): Promise<ApiResponse<ValidateGuardAssignmentResultDto>> =>
    apiFetch<ValidateGuardAssignmentResultDto>(`${BASE}/guard-shift-planning/validate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  generatePreview: (dto: GeneratePreviewRequestDto): Promise<ApiResponse<GeneratePreviewResponseDto>> =>
    apiFetch<GeneratePreviewResponseDto>(`${BASE}/guard-shift-planning/generate-preview`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  generateConfirm: (dto: GeneratePreviewRequestDto): Promise<ApiResponse<GuardShiftPlanningResultDto>> =>
    apiFetch<GuardShiftPlanningResultDto>(`${BASE}/guard-shift-planning/generate-confirm`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  getScheduleBoard: (filter: ScheduleBoardFilterDto): Promise<ApiResponse<ScheduleBoardResponseDto>> => {
    const p = new URLSearchParams();
    p.set('startDate', filter.startDate);
    p.set('endDate', filter.endDate);
    if (filter.locationId)  p.set('locationId',  String(filter.locationId));
    if (filter.groupId)     p.set('groupId',     String(filter.groupId));
    if (filter.employeeId)  p.set('employeeId',  String(filter.employeeId));
    if (filter.scheduleCode) p.set('scheduleCode', filter.scheduleCode);
    if (filter.status)      p.set('status',      filter.status);
    if (filter.viewMode)    p.set('viewMode',    filter.viewMode);
    return apiFetch<ScheduleBoardResponseDto>(`${BASE}/guard-shift-planning/schedule-board?${p}`);
  },

  getPlanningDetail: (id: number): Promise<ApiResponse<GuardShiftPlanningDetailDto>> =>
    apiFetch<GuardShiftPlanningDetailDto>(`${BASE}/guard-shift-planning/${id}/detail`),
};

// =============================================================================
// Cambios de Turno
// =============================================================================

export const GuardShiftChangesAPI = {
  getPending: (): Promise<ApiResponse<GuardShiftChangeDto[]>> =>
    apiFetch<GuardShiftChangeDto[]>(`${BASE}/guard-shift-changes/pending`),

  getPendingPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<GuardShiftChangeDto>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    return apiFetch<PagedResult<GuardShiftChangeDto>>(`${BASE}/guard-shift-changes/pending/paged?${qs}`);
  },

  getByPlanning: (planningId: number): Promise<ApiResponse<GuardShiftChangeDto[]>> =>
    apiFetch<GuardShiftChangeDto[]>(`${BASE}/guard-shift-changes/by-planning/${planningId}`),

  createReplacement: (dto: CreateGuardShiftReplacementDto): Promise<ApiResponse<GuardShiftChangeDto>> =>
    apiFetch<GuardShiftChangeDto>(`${BASE}/guard-shift-changes/replacement`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  approve: (id: number, dto: ApproveGuardShiftChangeDto): Promise<ApiResponse<GuardShiftChangeDto>> =>
    apiFetch<GuardShiftChangeDto>(`${BASE}/guard-shift-changes/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  reject: (id: number, dto: RejectGuardShiftChangeDto): Promise<ApiResponse<GuardShiftChangeDto>> =>
    apiFetch<GuardShiftChangeDto>(`${BASE}/guard-shift-changes/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};

// =============================================================================
// Bloques de Disponibilidad
// =============================================================================

export const EmployeeAvailabilityAPI = {
  getBlocks: (filter: EmployeeAvailabilityFilterDto): Promise<ApiResponse<EmployeeAvailabilityBlockDto[]>> => {

    const params = new URLSearchParams();
    if (filter.employeeId) params.set('employeeId', String(filter.employeeId));
    if (filter.startDate)  params.set('startDate',  filter.startDate);
    if (filter.endDate)    params.set('endDate',    filter.endDate);
    if (filter.sourceType) params.set('sourceType', filter.sourceType);
    if (filter.status)     params.set('status',     filter.status);
    const qs = params.toString();
    return apiFetch<EmployeeAvailabilityBlockDto[]>(`${BASE}/employee-availability-blocks${qs ? `?${qs}` : ''}`);
  },

  getBlocksPaged: (filter: EmployeeAvailabilityFilterDto, page: number, pageSize: number): Promise<ApiResponse<PagedResult<EmployeeAvailabilityBlockDto>>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filter.employeeId) params.set('employeeId', String(filter.employeeId));
    if (filter.startDate)  params.set('startDate',  filter.startDate);
    if (filter.endDate)    params.set('endDate',    filter.endDate);
    if (filter.sourceType) params.set('sourceType', filter.sourceType);
    if (filter.status)     params.set('status',     filter.status);
    return apiFetch<PagedResult<EmployeeAvailabilityBlockDto>>(`${BASE}/employee-availability-blocks/paged?${params}`);
  },

  createManual: (dto: CreateManualAvailabilityBlockDto): Promise<ApiResponse<EmployeeAvailabilityBlockDto>> =>
    apiFetch<EmployeeAvailabilityBlockDto>(`${BASE}/employee-availability-blocks/manual`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  syncPermissions: (startDate: string, endDate: string): Promise<ApiResponse<SyncAvailabilityBlocksResultDto>> =>
    apiFetch<SyncAvailabilityBlocksResultDto>(
      `${BASE}/employee-availability-blocks/sync-permissions?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      { method: 'POST', body: '{}' }
    ),

  syncVacations: (startDate: string, endDate: string): Promise<ApiResponse<SyncAvailabilityBlocksResultDto>> =>
    apiFetch<SyncAvailabilityBlocksResultDto>(
      `${BASE}/employee-availability-blocks/sync-vacations?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      { method: 'POST', body: '{}' }
    ),
};

// =============================================================================
// Validaciones de Asignación
// =============================================================================

export const GuardAssignmentValidationsAPI = {
  getByPlanning: (planningId: number): Promise<ApiResponse<GuardAssignmentValidationDto[]>> =>
    apiFetch<GuardAssignmentValidationDto[]>(`${BASE}/guard-assignment-validations/by-planning/${planningId}`),

  getByPlanningPaged: (planningId: number, page: number, pageSize: number): Promise<ApiResponse<PagedResult<GuardAssignmentValidationDto>>> =>
    apiFetch<PagedResult<GuardAssignmentValidationDto>>(
      `${BASE}/guard-assignment-validations/by-planning/${planningId}/paged?page=${page}&pageSize=${pageSize}`
    ),

  getByEmployee: (employeeId: number, limit = 50): Promise<ApiResponse<GuardAssignmentValidationDto[]>> =>
    apiFetch<GuardAssignmentValidationDto[]>(`${BASE}/guard-assignment-validations/by-employee/${employeeId}?limit=${limit}`),
};
