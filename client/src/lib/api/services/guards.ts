/**
 * APIs del Módulo de Guardias Rotativos
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedRequest, PagedResult } from '../core/pagination';
import type {
  RefTypeDto,
  GuardServiceLocationDto,
  GuardServiceLocationTreeDto,
  CreateGuardServiceLocationDto,
  UpdateGuardServiceLocationDto,
  GuardRotationGroupDto,
  GuardRotationGroupWithSubgroupsDto,
  GuardRotationGroupEmployeeDto,
  CreateGuardRotationGroupDto,
  UpdateGuardRotationGroupDto,
  AssignEmployeeToRotationGroupDto,
  RemoveEmployeeFromRotationGroupDto,
  GuardGroupRotationPatternDto,
  AssignPatternToGroupDto,
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
  GuardLocationRotationPeriodDto,
  CreateGuardLocationRotationPeriodDto,
  UpdateGuardLocationRotationPeriodDto,
  GuardLocationRotationAssignmentDto,
  CreateGuardLocationRotationAssignmentDto,
  UpdateGuardLocationRotationAssignmentDto,
  GuardEmployeeSpecialRuleDto,
  CreateGuardEmployeeSpecialRuleDto,
  UpdateGuardEmployeeSpecialRuleDto,
  GuardVacationPlanDto,
  CreateGuardVacationPlanDto,
  UpdateGuardVacationPlanDto,
  ApproveGuardVacationPlanDto,
  RejectGuardVacationPlanDto,
  GuardVacationRequestDto,
  CreateChangeDatesRequestDto,
  CreateAccumulateRequestDto,
  ApproveGuardVacationRequestDto,
  RejectGuardVacationRequestDto,
  SubmitToDirectionDto,
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

  getPatterns: (groupId: number): Promise<ApiResponse<GuardGroupRotationPatternDto[]>> =>
    apiFetch<GuardGroupRotationPatternDto[]>(`${BASE}/guard-rotation-groups/${groupId}/patterns`),

  assignPattern: (groupId: number, dto: AssignPatternToGroupDto): Promise<ApiResponse<GuardGroupRotationPatternDto>> =>
    apiFetch<GuardGroupRotationPatternDto>(`${BASE}/guard-rotation-groups/${groupId}/patterns`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  removePattern: (groupId: number, groupPatternId: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/guard-rotation-groups/${groupId}/patterns/${groupPatternId}`, {
      method: 'DELETE',
    }),

  getGeneralGroups: (): Promise<ApiResponse<GuardRotationGroupDto[]>> =>
    apiFetch<GuardRotationGroupDto[]>(`${BASE}/guard-rotation-groups/general`),

  getGeneralGroupsWithSubgroups: (): Promise<ApiResponse<GuardRotationGroupWithSubgroupsDto[]>> =>
    apiFetch<GuardRotationGroupWithSubgroupsDto[]>(`${BASE}/guard-rotation-groups/general/with-subgroups`),

  getSubgroups: (groupId: number): Promise<ApiResponse<GuardRotationGroupDto[]>> =>
    apiFetch<GuardRotationGroupDto[]>(`${BASE}/guard-rotation-groups/${groupId}/subgroups`),
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

  readinessCheck: (targetDate: string): Promise<ApiResponse<import('@/types/guards').GuardReadinessCheckDto>> =>
    apiFetch(`${BASE}/guard-shift-planning/readiness-check?targetDate=${targetDate}`),
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

  getAllPaged: (params: PagedRequest & { status?: string }): Promise<ApiResponse<PagedResult<GuardShiftChangeDto>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.status) qs.set('status', params.status);
    return apiFetch<PagedResult<GuardShiftChangeDto>>(`${BASE}/guard-shift-changes/all/paged?${qs}`);
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

// =============================================================================
// Rotación de Ubicaciones
// =============================================================================

export const GuardLocationRotationAPI = {
  getPeriods: (): Promise<ApiResponse<GuardLocationRotationPeriodDto[]>> =>
    apiFetch<GuardLocationRotationPeriodDto[]>(`${BASE}/guard-location-rotation/periods`),

  getPeriodsPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<GuardLocationRotationPeriodDto>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    return apiFetch<PagedResult<GuardLocationRotationPeriodDto>>(`${BASE}/guard-location-rotation/periods/paged?${qs}`);
  },

  getPeriodById: (id: number): Promise<ApiResponse<GuardLocationRotationPeriodDto>> =>
    apiFetch<GuardLocationRotationPeriodDto>(`${BASE}/guard-location-rotation/periods/${id}`),

  createPeriod: (dto: CreateGuardLocationRotationPeriodDto): Promise<ApiResponse<GuardLocationRotationPeriodDto>> =>
    apiFetch<GuardLocationRotationPeriodDto>(`${BASE}/guard-location-rotation/periods`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updatePeriod: (id: number, dto: UpdateGuardLocationRotationPeriodDto): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/guard-location-rotation/periods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),

  getAssignmentsByPeriod: (periodId: number): Promise<ApiResponse<GuardLocationRotationAssignmentDto[]>> =>
    apiFetch<GuardLocationRotationAssignmentDto[]>(`${BASE}/guard-location-rotation/periods/${periodId}/assignments`),

  getAssignmentsByEmployee: (employeeId: number): Promise<ApiResponse<GuardLocationRotationAssignmentDto[]>> =>
    apiFetch<GuardLocationRotationAssignmentDto[]>(`${BASE}/guard-location-rotation/assignments/by-employee/${employeeId}`),

  createAssignment: (dto: CreateGuardLocationRotationAssignmentDto): Promise<ApiResponse<GuardLocationRotationAssignmentDto>> =>
    apiFetch<GuardLocationRotationAssignmentDto>(`${BASE}/guard-location-rotation/assignments`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updateAssignment: (id: number, dto: UpdateGuardLocationRotationAssignmentDto): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/guard-location-rotation/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),

  deleteAssignment: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/guard-location-rotation/assignments/${id}`, { method: 'DELETE' }),
};

// =============================================================================
// Reglas Especiales de Guardias
// =============================================================================

export const GuardEmployeeSpecialRulesAPI = {
  getByEmployee: (employeeId: number): Promise<ApiResponse<GuardEmployeeSpecialRuleDto[]>> =>
    apiFetch<GuardEmployeeSpecialRuleDto[]>(`${BASE}/guard-employee-special-rules/by-employee/${employeeId}`),

  listPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<GuardEmployeeSpecialRuleDto>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.search?.trim()) qs.set('search', params.search.trim());
    return apiFetch<PagedResult<GuardEmployeeSpecialRuleDto>>(`${BASE}/guard-employee-special-rules/paged?${qs}`);
  },

  getById: (id: number): Promise<ApiResponse<GuardEmployeeSpecialRuleDto>> =>
    apiFetch<GuardEmployeeSpecialRuleDto>(`${BASE}/guard-employee-special-rules/${id}`),

  create: (dto: CreateGuardEmployeeSpecialRuleDto): Promise<ApiResponse<GuardEmployeeSpecialRuleDto>> =>
    apiFetch<GuardEmployeeSpecialRuleDto>(`${BASE}/guard-employee-special-rules`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: number, dto: UpdateGuardEmployeeSpecialRuleDto): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/guard-employee-special-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
};

// =============================================================================
// Planes de Vacaciones de Guardias
// =============================================================================

export const GuardVacationPlansAPI = {
  getByEmployee: (employeeId: number, year?: number): Promise<ApiResponse<GuardVacationPlanDto[]>> => {
    const qs = year ? `?year=${year}` : '';
    return apiFetch<GuardVacationPlanDto[]>(`${BASE}/guard-vacation-plans/by-employee/${employeeId}${qs}`);
  },

  listPaged: (params: PagedRequest, filters?: { year?: number; status?: string; employeeId?: number; startDate?: string; endDate?: string }): Promise<ApiResponse<PagedResult<GuardVacationPlanDto>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (filters?.year)       qs.set('year',       String(filters.year));
    if (filters?.status)     qs.set('status',     filters.status);
    if (filters?.employeeId) qs.set('employeeId', String(filters.employeeId));
    if (filters?.startDate)  qs.set('startDate',  filters.startDate);
    if (filters?.endDate)    qs.set('endDate',     filters.endDate);
    return apiFetch<PagedResult<GuardVacationPlanDto>>(`${BASE}/guard-vacation-plans/paged?${qs}`);
  },

  getById: (id: number): Promise<ApiResponse<GuardVacationPlanDto>> =>
    apiFetch<GuardVacationPlanDto>(`${BASE}/guard-vacation-plans/${id}`),

  create: (dto: CreateGuardVacationPlanDto): Promise<ApiResponse<GuardVacationPlanDto>> =>
    apiFetch<GuardVacationPlanDto>(`${BASE}/guard-vacation-plans`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: number, dto: UpdateGuardVacationPlanDto): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/guard-vacation-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),

  submitToDirection: (id: number, dto: SubmitToDirectionDto): Promise<ApiResponse<GuardVacationPlanDto>> =>
    apiFetch<GuardVacationPlanDto>(`${BASE}/guard-vacation-plans/${id}/submit-to-direction`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  approve: (id: number, dto: ApproveGuardVacationPlanDto): Promise<ApiResponse<GuardVacationPlanDto>> =>
    apiFetch<GuardVacationPlanDto>(`${BASE}/guard-vacation-plans/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  reject: (id: number, dto: RejectGuardVacationPlanDto): Promise<ApiResponse<GuardVacationPlanDto>> =>
    apiFetch<GuardVacationPlanDto>(`${BASE}/guard-vacation-plans/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};

// =============================================================================
// Solicitudes de Vacaciones de Guardias
// =============================================================================

export const GuardVacationRequestsAPI = {
  getByEmployee: (employeeId: number): Promise<ApiResponse<GuardVacationRequestDto[]>> =>
    apiFetch<GuardVacationRequestDto[]>(`${BASE}/guard-vacation-requests/by-employee/${employeeId}`),

  listPaged: (params: PagedRequest, filters?: { status?: string; employeeId?: number; startDate?: string; endDate?: string }): Promise<ApiResponse<PagedResult<GuardVacationRequestDto>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (filters?.status)     qs.set('status',     filters.status);
    if (filters?.employeeId) qs.set('employeeId', String(filters.employeeId));
    if (filters?.startDate)  qs.set('startDate',  filters.startDate);
    if (filters?.endDate)    qs.set('endDate',     filters.endDate);
    return apiFetch<PagedResult<GuardVacationRequestDto>>(`${BASE}/guard-vacation-requests/paged?${qs}`);
  },

  getById: (id: number): Promise<ApiResponse<GuardVacationRequestDto>> =>
    apiFetch<GuardVacationRequestDto>(`${BASE}/guard-vacation-requests/${id}`),

  createChangeDates: (dto: CreateChangeDatesRequestDto): Promise<ApiResponse<GuardVacationRequestDto>> =>
    apiFetch<GuardVacationRequestDto>(`${BASE}/guard-vacation-requests/change-dates`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  createAccumulate: (dto: CreateAccumulateRequestDto): Promise<ApiResponse<GuardVacationRequestDto>> =>
    apiFetch<GuardVacationRequestDto>(`${BASE}/guard-vacation-requests/accumulate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  submitToDirection: (id: number, dto: SubmitToDirectionDto): Promise<ApiResponse<GuardVacationRequestDto>> =>
    apiFetch<GuardVacationRequestDto>(`${BASE}/guard-vacation-requests/${id}/submit-to-direction`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  approve: (id: number, dto: ApproveGuardVacationRequestDto): Promise<ApiResponse<GuardVacationRequestDto>> =>
    apiFetch<GuardVacationRequestDto>(`${BASE}/guard-vacation-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  reject: (id: number, dto: RejectGuardVacationRequestDto): Promise<ApiResponse<GuardVacationRequestDto>> =>
    apiFetch<GuardVacationRequestDto>(`${BASE}/guard-vacation-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};
