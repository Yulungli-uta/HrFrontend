/**
 * Punto de entrada centralizado para todas las APIs del sistema.
 *
 * ESTRUCTURA ORGANIZADA POR REVISION FUNCIONAL
 *   src/lib/api/
 *   ├── index.ts                  ← barrel principal
 *   ├── core/                     ← cliente HTTP, configuracion y paginacion
 *   ├── utils/                    ← helpers de errores y token
 *   └── services/
 *       ├── security.ts           ← autenticacion, usuarios, roles, permisos, sesiones
 *       ├── people.ts             ← persona, empleado, departamentos, facultades, vistas
 *       ├── cv.ts                 ← hoja de vida, curriculum, expediente e instituciones
 *       ├── contracts.ts          ← contratos y relaciones contractuales
 *       ├── attendance.ts         ← asistencia, permisos, vacaciones, horarios y recuperacion
 *       ├── planning.ts           ← planificaciones y cambios de horario
 *       ├── payroll.ts            ← nomina y lineas de nomina
 *       ├── calculations.ts       ← calculos de asistencia, descuentos, subsidios y recovery
 *       ├── catalogs.ts           ← tipos de referencia y geografia maestra
 *       ├── documents.ts          ← archivos y documentos
 *       ├── holidays.ts           ← feriados
 *       ├── views.ts              ← vistas SQL expuestas como API
 *       ├── reports.ts            ← generacion/descarga de reportes
 *       ├── system.ts             ← salud, sistema y auditoria
 *       └── departmentAuthorities.ts ← autoridades de departamento
 */

export { apiFetch } from './core/fetch';
export type { ApiResponse, ApiError } from './core/fetch';
export { API_CONFIG, resolveBaseUrl } from './core/config';
export { createApiService, createCrudService } from './core/pagination';
export type { PagedRequest, PagedResult } from './core/pagination';

export { handleApiError, parseApiError, unwrapApiResponse } from './utils/error-handling';
export { setAuthToken, getAuthToken, buildAuthHeader } from './utils/auth-token';

// Seguridad
export * from './services/security';

// Personas y estructura organizacional
export {
  PersonasAPI,
  EmpleadosAPI,
  DepartamentosAPI,
  FacultadesAPI,
  VistaEmpleadosAPI,
  VistaDetallesEmpleadosAPI,
} from './services/people';
export type {
  PersonDto,
  PersonCreateDto,
  ContractTypeStatDto,
  EmployeeCompleteStatsDto,
} from './services/people';

// Hoja de vida / curriculum
export * from './services/cv';
export type { AttendanceCalculationRequestDto as CvAttendanceRequestDto } from './services/cv';

// Asistencia
export { 
  MarcacionesAPI,
  MarcacionesEspecializadasAPI,
  JustificacionesMarcacionesAPI,
  CalculosAsistenciaAPI,
  PermisosAPI,
  TiposPermisosAPI,
  VacacionesAPI,
  HorariosAPI,
  HorariosEmpleadosAPI,
  HorasExtrasAPI,
  ConfigHorasExtrasAPI,
  SubrogacionesAPI,
  PlanesRecuperacionTiempoAPI,
  RegistrosRecuperacionTiempoAPI,
  TimeBalanceAPI,
  TimeAPI,
} from './services/attendance';
export type { TimeResponse } from './services/attendance';

// Contratos y relaciones contractuales
export * from './services/contracts';
export type { PersonnelActionTypeDto } from './services/contracts';

// Planificacion
export {
  TimePlanningsAPI,
  TimePlanningEmployeesAPI,
  TimePlanningExecutionsAPI,
  ScheduleChangePlansAPI,
} from './services/planning';
export type {
  TimePlanningCreateDTO,
  TimePlanningEmployeeCreateDTO,
  TimePlanningEmployeeUpdateDTO,
  TimePlanningExecutionCreateDTO,
  TimePlanningExecutionUpdateDTO,
} from './services/planning';

// Nomina
export { NominaAPI, LineasNominaAPI } from './services/payroll';

// Calculos
export {
  AttendanceCalculationAPI,
  OvertimePriceAPI,
  PayrollDiscountsAPI,
  PayrollSubsidiesAPI,
  RecoveryAPI,
} from './services/calculations';
export type { AttendanceCalculationRequestDto, PayrollPeriodRequestDto } from './services/calculations';

// Vistas
export {
  VwAttendanceDayAPI,
  VwPunchDayAPI,
  VwLeaveWindowsAPI,
  VwEmployeeScheduleAtDateAPI,
  VwDepartmentWithTypeAPI,
  VwJobWithDegreeAndGroupAPI,
  VwJobActivityAPI,
  VwAuthorityAPI,
} from './services/views';
export type {
  VwDepartmentWithType,
  VwJobWithDegreeAndGroup,
  VwJobActivity,
  VwAuthority,
} from './services/views';

// Documentos
export { FileManagementAPI, DocumentsAPI } from './services/documents';
export type { FileUploadResponseDto, FileDeleteResponseDto } from './services/documents';

// Feriados
export { HolidaysAPI } from './services/holidays';
export type { HolidayResponseDTO } from './services/holidays';

// Catalogos y geografia maestra
export { TiposReferenciaAPI, PaisesAPI, ProvinciasAPI, CantonesAPI, AcademicLadderAPI } from './services/catalogs';
export type { RefType, AcademicLadderDto, AcademicLadderCreateDto, AcademicLadderUpdateDto } from './services/catalogs';

// Sistema y reportes
export { HealthAPI, SistemaAPI, AuditoriaAPI } from './services/system';
export type { StatsResponse } from './services/system';
export { reportService, downloadBlob, ReportError } from './services/reports';

// Autoridades de departamento
export { DepartmentAuthoritiesAPI } from './services/departmentAuthorities';

// Aprovisionamiento de Empleados (AD Local → Entra → O365)
export { ProvisioningAPI, LicensesAPI, PROVISIONING_STATUS_ID } from './services/provisioning';
export type {
  UserProvisioningDto,
  CompletePendingResult,
  PasswordResetResult,
  SubscribedSkuDto,
  ProvisioningStatus,
} from './services/provisioning';

// Guardias Rotativos
export {
  GuardServiceLocationsAPI,
  GuardRotationGroupsAPI,
  RotationPatternsAPI,
  GuardCoverageRequirementsAPI,
  GuardShiftPlanningAPI,
  GuardShiftChangesAPI,
  EmployeeAvailabilityAPI,
  GuardAssignmentValidationsAPI,
} from './services/guards';
export type {
  GuardServiceLocationDto,
  GuardServiceLocationTreeDto,
  GuardRotationGroupDto,
  GuardRotationGroupEmployeeDto,
  RotationPatternDto,
  GuardShiftCoverageRequirementDto,
  GuardShiftPlanningDto,
  GuardShiftCalendarItemDto,
  GuardDashboardDto,
  GuardShiftChangeDto,
  EmployeeAvailabilityBlockDto,
  GuardAssignmentValidationDto,
} from '@/types/guards';

// Plantillas de documentos y documentos generados
export {
  PersonnelActionsAPI,
  DocumentTemplatesAPI,
  GeneratedDocumentsAPI,
} from './services/documentTemplates';
export type {
  PersonnelActionDto,
  PersonnelActionCreateDto,
  PersonnelActionUpdateDto,
  PersonnelActionApproveDto,
  DocumentTemplateDto,
  DocumentTemplateCreateDto,
  DocumentTemplateUpdateDto,
  DocumentTemplateFieldDto,
  DocumentTemplateFieldCreateDto,
  GeneratedDocumentDto,
  GeneratedDocumentCreateDto,
  GeneratedDocumentApproveDto,
} from './services/documentTemplates';
export type {
  DepartmentAuthorityDto,
  DepartmentAuthorityCreateDto,
  DepartmentAuthorityUpdateDto,
  DepartmentAuthorityDenominationDto,
  DepartmentAuthorityPagedRequest,
} from './services/departmentAuthorities';

// Jobs programados (ejecución manual)
export { ScheduledJobsAPI } from './services/jobs';
export type { ContractExpirationResult, StudentEnrollmentSyncResult } from './services/jobs';

// Aprovisionamiento académico (estudiantes)
export { StudentProvisioningAPI } from './services/academic/studentProvisioning';
