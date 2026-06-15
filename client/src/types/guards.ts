// Tipos del Módulo de Guardias Rotativos

// ─── Ref Types ────────────────────────────────────────────────────────────────

export interface RefTypeDto {
  typeId: number;
  category: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

// ─── Ubicaciones ──────────────────────────────────────────────────────────────

export interface GuardServiceLocationDto {
  locationId: number;
  parentLocationId: number | null;
  rootLocationId: number | null;
  locationTypeId: number;
  locationTypeName: string | null;
  locationCode: string | null;
  locationName: string;
  description: string | null;
  locationPath: string | null;
  level: number;
  requiresCoverage: boolean;
  isAssignable: boolean;
  isActive: boolean;
  children: GuardServiceLocationDto[] | null;
}

export interface GuardServiceLocationTreeDto {
  locationId: number;
  locationName: string;
  locationCode: string | null;
  level: number;
  isAssignable: boolean;
  requiresCoverage: boolean;
  isActive: boolean;
  children: GuardServiceLocationTreeDto[];
}

export interface CreateGuardServiceLocationDto {
  parentLocationId?: number;
  rootLocationId?: number;
  locationTypeId: number;
  locationCode?: string;
  locationName: string;
  description?: string;
  requiresCoverage: boolean;
  isAssignable: boolean;
}

export interface UpdateGuardServiceLocationDto {
  locationTypeId: number;
  locationCode?: string;
  locationName: string;
  description?: string;
  requiresCoverage: boolean;
  isAssignable: boolean;
  isActive: boolean;
}

// ─── Grupos de Rotación ───────────────────────────────────────────────────────

export interface GuardRotationGroupDto {
  groupId: number;
  groupCode: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  employeeCount: number;
  parentGroupId: number | null;
  parentGroupName: string | null;
  groupLevelTypeName: string | null;
  colorCode: string | null;
  subgroupCount: number;
}

export interface GuardRotationGroupWithSubgroupsDto {
  groupId: number;
  groupCode: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  colorCode: string | null;
  groupLevelTypeName: string | null;
  employeeCount: number;
  subgroupCount: number;
  subgroups: GuardRotationGroupDto[];
}

export interface GuardRotationGroupEmployeeDto {
  groupEmployeeId: number;
  groupId: number;
  groupName: string;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface CreateGuardRotationGroupDto {
  groupCode?: string;
  name: string;
  description?: string;
  parentGroupId?: number;
  groupLevelTypeId?: number;
  colorCode?: string;
}

export interface UpdateGuardRotationGroupDto {
  groupCode?: string;
  name: string;
  description?: string;
  isActive: boolean;
  parentGroupId?: number;
  groupLevelTypeId?: number;
  colorCode?: string;
}

export interface AssignEmployeeToRotationGroupDto {
  employeeId: number;
  validFrom: string;
  validTo?: string;
  notes?: string;
}

export interface RemoveEmployeeFromRotationGroupDto {
  groupEmployeeId: number;
  validTo: string;
}

// ─── Patrón asignado a grupo ──────────────────────────────────────────────────

export interface GuardGroupRotationPatternDto {
  groupPatternId: number;
  groupId: number;
  patternId: number;
  patternName: string | null;
  patternCode: string | null;
  startCycleDate: string;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface AssignPatternToGroupDto {
  patternId: number;
  startCycleDate: string;
  validFrom: string;
  validTo?: string;
  notes?: string;
}

// ─── Resumen por Ubicación ────────────────────────────────────────────────────

export interface LocationSummaryDto {
  locationKey: string;
  locationName: string;
  totalGroups: number;
  totalActiveGroups: number;
  totalEmployees: number;
  totalPatterns: number;
}

export interface LocationGroupDetailDto {
  groupId: number;
  groupCode: string | null;
  groupName: string;
  description: string | null;
  isActive: boolean;
  patternId: number | null;
  patternCode: string | null;
  patternName: string | null;
  patternSequence: string | null;
  patternReadable: string | null;
  assignedEmployees: number;
}

// ─── Patrones de Rotación ─────────────────────────────────────────────────────

export interface RotationPatternDetailDto {
  patternDetailId: number;
  patternId: number;
  dayOrder: number;
  scheduleId: number | null;
  scheduleDescription: string | null;
  scheduleCode: string | null;
  isRestDay: boolean;
  notes: string | null;
}

export interface RotationPatternDto {
  patternId: number;
  patternCode: string | null;
  name: string;
  description: string | null;
  cycleDays: number;
  patternTypeId: number;
  patternTypeName: string | null;
  isActive: boolean;
  details: RotationPatternDetailDto[];
}

export interface CreateRotationPatternDetailDto {
  dayOrder: number;
  scheduleId?: number;
  isRestDay: boolean;
  notes?: string;
}

export interface CreateRotationPatternDto {
  name: string;
  patternCode?: string;
  description?: string;
  cycleDays: number;
  patternTypeId: number;
  details: CreateRotationPatternDetailDto[];
}

export interface UpdateRotationPatternDto {
  name: string;
  patternCode?: string;
  description?: string;
  isActive: boolean;
}

export interface UpsertRotationPatternDetailsDto {
  details: CreateRotationPatternDetailDto[];
}

// ─── Requisitos de Cobertura ──────────────────────────────────────────────────

export interface GuardShiftCoverageRequirementDto {
  requirementId: number;
  locationId: number;
  locationName: string;
  scheduleId: number;
  scheduleDescription: string;
  dayOfWeek: number;
  dayOfWeekName: string;
  requiredGuards: number;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface CreateCoverageRequirementDto {
  locationId: number;
  scheduleId: number;
  dayOfWeek: number;
  requiredGuards: number;
  validFrom: string;
  validTo?: string;
  notes?: string;
}

export interface UpdateCoverageRequirementDto {
  dayOfWeek: number;
  requiredGuards: number;
  validFrom: string;
  validTo?: string;
  isActive: boolean;
  notes?: string;
}

// ─── Planificación de Turnos ──────────────────────────────────────────────────

export interface GuardShiftPlanningDto {
  planningId: number;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string | null;
  groupId: number | null;
  groupName: string | null;
  locationId: number;
  locationName: string;
  locationCode: string | null;
  workDate: string;
  scheduleId: number;
  scheduleDescription: string;
  scheduleCode: string | null;
  planningSource: string;
  status: string;
  isAutoGenerated: boolean;
  isActiveForAssignment: boolean;
  notes: string | null;
  hasActiveReplacement: boolean;
  activeReplacementEmployeeId: number | null;
  activeReplacementEmployeeName: string | null;
}

export interface GuardShiftCalendarItemDto {
  workDate: string;
  planningId: number;
  employeeId: number;
  employeeFullName: string;
  locationId: number;
  locationName: string;
  scheduleId: number;
  scheduleDescription: string;
  scheduleCode: string | null;
  status: string;
  hasReplacement: boolean;
  hasPermissionConflict: boolean;
  hasVacationConflict: boolean;
  hasValidationWarning: boolean;
}

export interface GuardShiftCalendarFilterDto {
  startDate?: string;
  endDate?: string;
  groupId?: number;
  locationId?: number;
  employeeId?: number;
  status?: string;
}

export interface CreateGuardShiftPlanningDto {
  employeeId: number;
  groupId?: number;
  locationId: number;
  workDate: string;
  scheduleId: number;
  planningSourceTypeId: number;
  statusTypeId: number;
  notes?: string;
}

export interface GenerateGuardShiftPlanningRequestDto {
  groupId: number;
  locationId: number;
  startDate: string;
  endDate: string;
  overwriteExisting: boolean;
}

export interface GuardShiftPlanningResultDto {
  generated: number;
  skipped: number;
  errors: number;
  messages: string[];
}

export interface ValidateGuardAssignmentRequestDto {
  employeeId: number;
  locationId: number;
  workDate: string;
  scheduleId: number;
  planningId?: number;
  allowDoubleShiftOverride: boolean;
}

export interface ValidateGuardAssignmentResultDto {
  canAssign: boolean;
  hasBlockingErrors: boolean;
  hasWarnings: boolean;
  validations: GuardAssignmentValidationDto[];
}

export interface GuardDashboardDto {
  todayShiftsCount: number;
  uncoveredPostsCount: number;
  pendingReplacementsCount: number;
  employeesWithPermissionOrVacationCount: number;
  doubleShiftAlertsCount: number;
  todayShifts: GuardShiftCalendarItemDto[];
  pendingReplacements: GuardShiftChangeDto[];
}

// ─── Cambios de Turno ─────────────────────────────────────────────────────────

export interface GuardShiftChangeDto {
  shiftChangeId: number;
  planningId: number;
  workDate: string;
  originalEmployeeId: number;
  originalEmployeeFullName: string;
  replacementEmployeeId: number | null;
  replacementEmployeeFullName: string | null;
  originalScheduleId: number;
  originalScheduleDescription: string;
  newScheduleId: number | null;
  newScheduleDescription: string | null;
  changeType: string;
  status: string;
  isActiveForAttendance: boolean;
  reason: string;
  requestedAt: string;
  requestedBy: number | null;
  requestedByName: string | null;
  approvedBy: number | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
}

export interface CreateGuardShiftReplacementDto {
  planningId: number;
  replacementEmployeeId: number;
  changeTypeId: number;
  reason: string;
  newScheduleId?: number;
}

export interface ApproveGuardShiftChangeDto {
  notes?: string;
}

export interface RejectGuardShiftChangeDto {
  rejectionReason: string;
}

// ─── Disponibilidad de Empleados ──────────────────────────────────────────────

export interface EmployeeAvailabilityBlockDto {
  blockId: number;
  employeeId: number;
  employeeFullName: string;
  sourceType: string;
  sourceTable: string | null;
  sourceId: string | null;
  startDateTime: string;
  endDateTime: string;
  status: string;
  reason: string | null;
}

export interface CreateManualAvailabilityBlockDto {
  employeeId: number;
  sourceTypeId: number;
  startDateTime: string;
  endDateTime: string;
  reason?: string;
}

export interface EmployeeAvailabilityFilterDto {
  employeeId?: number;
  startDate?: string;
  endDate?: string;
  sourceType?: string;
  status?: string;
}

export interface SyncAvailabilityBlocksResultDto {
  created: number;
  updated: number;
  cancelled: number;
  messages: string[];
}

// ─── Validaciones ─────────────────────────────────────────────────────────────

export interface GuardAssignmentValidationDto {
  validationId: number;
  employeeId: number;
  employeeFullName: string;
  planningId: number | null;
  shiftChangeId: number | null;
  validationType: string;
  result: string;
  severity: string;
  validationDate: string;
  message: string;
  details: string | null;
}

// ─── Generación Preview / Confirm ────────────────────────────────────────────

export interface GeneratePreviewRequestDto {
  startDate: string;
  endDate: string;
  locationId?: number;
  groupId?: number;
  employeeId?: number;
  mode: 'ALL_GROUPS' | 'BY_LOCATION' | 'BY_GROUP' | 'BY_EMPLOYEE';
  includeRestDays: boolean;
  regenerateMode: 'SKIP_EXISTING' | 'CANCEL_AND_RECREATE';
}

export interface GeneratePreviewItemDto {
  employeeId: number;
  employeeFullName: string;
  groupId: number;
  groupName: string;
  locationId: number | null;
  locationName: string | null;
  workDate: string;
  scheduleId: number;
  scheduleCode: string | null;
  scheduleName: string;
  cycleDay: number;
  willSkip: boolean;
  hasConflict: boolean;
  conflictType: string | null;
  conflictMessage: string | null;
  isValid: boolean;
  isRestDay: boolean;
}

export interface GeneratePreviewResponseDto {
  totalToGenerate: number;
  restDaysCalculated: number;
  willSkip: number;
  conflicts: number;
  permissionConflicts: number;
  vacationConflicts: number;
  doubleShiftConflicts: number;
  overlapConflicts: number;
  missingLocation: number;
  items: GeneratePreviewItemDto[];
}

// ─── Schedule Board ───────────────────────────────────────────────────────────

export interface ScheduleBoardFilterDto {
  startDate: string;
  endDate: string;
  locationId?: number;
  groupId?: number;
  employeeId?: number;
  scheduleCode?: string;
  status?: string;
  viewMode?: 'BY_LOCATION' | 'BY_GUARD' | 'BY_GROUP';
}

export interface ScheduleBoardCellEmployeeDto {
  employeeId: number;
  fullName: string;
  isReplacement: boolean;
  planningId: number;
  groupId?: number | null;
  groupName?: string | null;
  groupColorCode?: string | null;
}

export interface ScheduleBoardCellDto {
  date: string;
  planningId: number | null;
  employees: ScheduleBoardCellEmployeeDto[];
  status: string;
  hasConflict: boolean;
  hasReplacement: boolean;
  hasPermission: boolean;
  hasVacation: boolean;
}

export interface ScheduleBoardRowDto {
  rowKey: string;
  locationId: number;
  locationName: string;
  locationCode: string | null;
  parentLocationId: number | null;
  parentLocationName: string | null;
  scheduleCode: string;
  scheduleName: string;
  cells: ScheduleBoardCellDto[];
}

export interface ScheduleBoardResponseDto {
  dates: string[];
  rows: ScheduleBoardRowDto[];
}

// ─── Detalle de planificación ─────────────────────────────────────────────────

export interface GuardShiftPlanningDetailDto {
  planningId: number;
  workDate: string;
  locationId: number;
  locationName: string;
  locationCode: string | null;
  groupId: number | null;
  groupName: string | null;
  patternId: number | null;
  patternCode: string | null;
  patternSequence: string | null;
  cycleDay: number | null;
  scheduleId: number;
  scheduleCode: string | null;
  scheduleName: string;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string | null;
  status: string;
  isAutoGenerated: boolean;
  notes: string | null;
  hasActiveReplacement: boolean;
  activeReplacementEmployeeId: number | null;
  activeReplacementEmployeeName: string | null;
  validations: GuardAssignmentValidationDto[];
  changes: GuardShiftChangeDto[];
}

// ─── Rotación de Ubicaciones ──────────────────────────────────────────────────

export interface GuardLocationRotationPeriodDto {
  locationRotationPeriodId: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  notes: string | null;
  assignmentCount: number;
}

export interface CreateGuardLocationRotationPeriodDto {
  name: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface UpdateGuardLocationRotationPeriodDto {
  name: string;
  startDate: string;
  endDate: string;
  notes?: string;
  isActive: boolean;
}

export interface GuardLocationRotationAssignmentDto {
  locationRotationAssignmentId: number;
  locationRotationPeriodId: number;
  periodName: string;
  groupId: number | null;
  groupName: string | null;
  groupCode: string | null;
  employeeId: number | null;
  employeeFullName: string | null;
  employeeIdCard: string | null;
  locationId: number;
  locationName: string;
  locationCode: string | null;
  priorityTypeId: number | null;
  priorityTypeName: string | null;
  isFixedLocation: boolean;
  isFixedSchedule: boolean;
  notes: string | null;
  isActive: boolean;
}

export interface CreateGuardLocationRotationAssignmentDto {
  locationRotationPeriodId: number;
  groupId?: number;
  employeeId?: number;
  locationId: number;
  priorityTypeId?: number;
  isFixedLocation: boolean;
  isFixedSchedule: boolean;
  notes?: string;
}

export interface UpdateGuardLocationRotationAssignmentDto {
  locationId: number;
  priorityTypeId?: number;
  isFixedLocation: boolean;
  isFixedSchedule: boolean;
  notes?: string;
  isActive: boolean;
}

// ─── Reglas Especiales de Guardias ────────────────────────────────────────────

export interface GuardEmployeeSpecialRuleDto {
  specialRuleId: number;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string | null;
  fixedLocationId: number | null;
  fixedLocationName: string | null;
  fixedLocationCode: string | null;
  fixedScheduleId: number | null;
  fixedScheduleDescription: string | null;
  fixedScheduleCode: string | null;
  noNightShift: boolean;
  onlyWeekDays: boolean;
  weekendPriority: boolean;
  nightPriority: boolean;
  reason: string | null;
  validFrom: string;
  validTo: string | null;
  requiresApproval: boolean;
  isActive: boolean;
}

export interface CreateGuardEmployeeSpecialRuleDto {
  employeeId: number;
  fixedLocationId?: number;
  fixedScheduleId?: number;
  noNightShift: boolean;
  onlyWeekDays: boolean;
  weekendPriority: boolean;
  nightPriority: boolean;
  reason?: string;
  validFrom: string;
  validTo?: string;
  requiresApproval: boolean;
}

export interface UpdateGuardEmployeeSpecialRuleDto {
  fixedLocationId?: number;
  fixedScheduleId?: number;
  noNightShift: boolean;
  onlyWeekDays: boolean;
  weekendPriority: boolean;
  nightPriority: boolean;
  reason?: string;
  validFrom: string;
  validTo?: string;
  requiresApproval: boolean;
  isActive: boolean;
}

// ─── Vacaciones de Guardias ───────────────────────────────────────────────────

export interface GuardVacationPlanDto {
  guardVacationPlanId: number;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string | null;
  vacationYear: number;
  plannedStartDate: string;
  plannedEndDate: string;
  statusTypeId: number;
  statusName: string;
  directionApprovedBy: number | null;
  directionApproverName: string | null;
  directionApprovedAt: string | null;
  submittedToDirectionBy: number | null;
  submittedByName: string | null;
  submittedToDirectionAt: string | null;
  notes: string | null;
}

export interface CreateGuardVacationPlanDto {
  employeeId: number;
  vacationYear: number;
  plannedStartDate: string;
  plannedEndDate: string;
  notes?: string;
}

export interface UpdateGuardVacationPlanDto {
  plannedStartDate: string;
  plannedEndDate: string;
  notes?: string;
}

export interface ApproveGuardVacationPlanDto {
  notes?: string;
}

export interface RejectGuardVacationPlanDto {
  reason: string;
}

export interface GuardVacationRequestDto {
  guardVacationRequestId: number;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string | null;
  guardVacationPlanId: number | null;
  vacationId: number | null;
  requestType: string;
  originalStartDate: string;
  originalEndDate: string;
  requestedStartDate: string | null;
  requestedEndDate: string | null;
  sourceYear: number;
  targetYear: number | null;
  reason: string;
  status: string;
  requestedBy: number | null;
  requestedByName: string | null;
  requestedAt: string;
  directionApprovedBy: number | null;
  directionApproverName: string | null;
  directionApprovedAt: string | null;
  submittedToDirectionBy: number | null;
  submittedByName: string | null;
  submittedToDirectionAt: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
}

export interface SubmitToDirectionDto {
  notes?: string;
}

export interface CreateChangeDatesRequestDto {
  employeeId: number;
  guardVacationPlanId?: number;
  originalStartDate: string;
  originalEndDate: string;
  requestedStartDate: string;
  requestedEndDate: string;
  sourceYear: number;
  reason: string;
}

export interface CreateAccumulateRequestDto {
  employeeId: number;
  guardVacationPlanId?: number;
  originalStartDate: string;
  originalEndDate: string;
  sourceYear: number;
  targetYear: number;
  reason: string;
}

export interface ApproveGuardVacationRequestDto {
  notes?: string;
}

export interface RejectGuardVacationRequestDto {
  reason: string;
}

// ─── Readiness Check ──────────────────────────────────────────────────────────

export interface GuardReadinessItemDto {
  key: string;
  label: string;
  passed: boolean;
  detail: string | null;
}

export interface GuardReadinessCheckDto {
  isReady: boolean;
  items: GuardReadinessItemDto[];
}
