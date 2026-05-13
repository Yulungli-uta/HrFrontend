// Tipos del Módulo de Guardias Rotativos

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
}

export interface UpdateGuardRotationGroupDto {
  groupCode?: string;
  name: string;
  description?: string;
  isActive: boolean;
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

export interface CreateRotationPatternDto {
  name: string;
  patternCode?: string;
  description?: string;
  cycleDays: number;
  patternTypeId: number;
}

export interface UpdateRotationPatternDto {
  name: string;
  patternCode?: string;
  description?: string;
  isActive: boolean;
}

export interface UpsertRotationPatternDetailsDto {
  details: {
    dayOrder: number;
    scheduleId?: number;
    isRestDay: boolean;
    notes?: string;
  }[];
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
  locationId: number;
  locationName: string;
  scheduleId: number;
  scheduleDescription: string;
  workDate: string;
  groupId: number | null;
  groupName: string | null;
  source: string;
  status: string;
  isActiveForAssignment: boolean;
  notes: string | null;
}

export interface GuardShiftCalendarItemDto {
  planningId: number;
  employeeId: number;
  employeeFullName: string;
  locationId: number;
  locationName: string;
  scheduleId: number;
  scheduleDescription: string;
  workDate: string;
  status: string;
  isReplacement: boolean;
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
  locationId: number;
  scheduleId: number;
  workDate: string;
  groupId?: number;
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
  excludePlanningId?: number;
  isReplacement: boolean;
}

export interface ValidateGuardAssignmentResultDto {
  isValid: boolean;
  hasBlockingErrors: boolean;
  validations: GuardAssignmentValidationDto[];
}

export interface GuardDashboardDto {
  totalActiveGuards: number;
  totalGroups: number;
  planningsToday: number;
  pendingChanges: number;
  coverageToday: number;
}

// ─── Cambios de Turno ─────────────────────────────────────────────────────────

export interface GuardShiftChangeDto {
  shiftChangeId: number;
  planningId: number;
  workDate: string;
  originalEmployeeId: number;
  originalEmployeeName: string;
  replacementEmployeeId: number | null;
  replacementEmployeeName: string | null;
  originalScheduleId: number;
  originalScheduleDescription: string;
  newScheduleId: number | null;
  newScheduleDescription: string | null;
  changeType: string;
  status: string;
  isActiveForAttendance: boolean;
  reason: string | null;
  requestedAt: string | null;
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
  newScheduleId?: number;
  changeTypeId: number;
  reason?: string;
}

export interface ApproveGuardShiftChangeDto {
  approvalNotes?: string;
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

export interface GuardAssignmentValidationDto {
  validationId: number;
  planningId: number | null;
  employeeId: number;
  validationType: string;
  result: string;
  severity: string;
  message: string;
  validatedAt: string;
}
