/**
 * Punto de entrada centralizado para todas las APIs del sistema.
 *
 * ESTRUCTURA REFACTORIZADA:
 *   src/lib/api/
 *   ├── index.ts              ← este archivo (barrel)
 *   ├── core/
 *   │   ├── config.ts         ← API_CONFIG, resolveBaseUrl
 *   │   ├── fetch.ts          ← apiFetch, ApiResponse, ApiError
 *   │   ├── logger.ts         ← ApiLogger (singleton)
 *   │   └── pagination.ts     ← PagedRequest, PagedResult, createApiService/createCrudService
 *   ├── services/
 *   │   ├── auth.ts           ← AuthAPI, AppAuthAPI, usuarios/roles/menús
 *   │   ├── employees.ts      ← PersonasAPI (PersonDto), EmpleadosAPI, Vistas, CV básico
 *   │   ├── attendance.ts     ← MarcacionesAPI, PermisosAPI, VacacionesAPI, etc.
 *   │   ├── contracts.ts      ← ContratosAPI, ContractsRHAPI, ContractTypeAPI
 *   │   ├── cv.ts             ← PublicacionesAPI, CapacitacionesAPI, etc.
 *   │   ├── planning.ts       ← TimePlanningsAPI, ScheduleChangePlansAPI
 *   │   ├── payroll.ts        ← NominaAPI, PayrollDiscountsAPI, etc.
 *   │   ├── files.ts          ← FileManagementAPI, DocumentsAPI
 *   │   ├── geo.ts            ← PaisesAPI, ProvinciasAPI, CantonesAPI
 *   │   └── system.ts         ← HealthAPI, SistemaAPI, AuditoriaAPI
 *   └── utils/
 *       ├── error-handling.ts ← handleApiError, parseApiError, unwrapApiResponse
 *       └── auth-token.ts     ← setAuthToken, getAuthToken, buildAuthHeader
 *
 * USO:
 *   import { PersonasAPI, PersonDto, setAuthToken } from '@/lib/api';
 */

// =============================================================================
// Core: cliente HTTP, tipos y configuración
// =============================================================================

export { apiFetch } from './core/fetch';
export type { ApiResponse, ApiError } from './core/fetch';

export { API_CONFIG, resolveBaseUrl } from './core/config';

export {
  createApiService,
  createCrudService, // alias de compatibilidad
} from './core/pagination';
export type { PagedRequest, PagedResult } from './core/pagination';

// =============================================================================
// Utils: manejo de errores y autenticación
// =============================================================================

export {
  handleApiError,
  parseApiError,
  unwrapApiResponse,
} from './utils/error-handling';

export {
  setAuthToken,
  getAuthToken,
  buildAuthHeader,
} from './utils/auth-token';

// =============================================================================
// Autenticación y gestión de usuarios/roles/menús
// =============================================================================

export {
  AuthAPI,
  AppAuthAPI,
  AuthUsersAPI,
  RolesAPI,
  UserRolesAPI,
  MenuItemsAPI,
  RoleMenuItemsAPI,
  PasswordAPI,
} from './services/auth';

export type {
  LoginRequest,
  RefreshRequest,
  ValidateTokenRequest,
  AppAuthRequest,
  LegacyAuthRequest,
  LoginResponse,
  UserInfo,
  AzureAuthUrlResponse,
} from './services/auth';

// =============================================================================
// Recursos humanos: Personas, Empleados, Departamentos, Vistas
// CORRECCIÓN: PersonDto es el tipo real del backend (incluye personId, identType)
// =============================================================================

export {
  PersonasAPI,
  EmpleadosAPI,
  DepartamentosAPI,
  FacultadesAPI,
  VistaEmpleadosAPI,
  VistaDetallesEmpleadosAPI,
  DireccionesAPI,
  ContactosEmergenciaAPI,
  CargasFamiliaresAPI,
  CuentasBancariasAPI,
  LibrosAPI,
  EnfermedadesCatastroficasAPI,
} from './services/employees';

export type {
  PersonDto,
  PersonCreateDto,
  ContractTypeStatDto,
  EmployeeCompleteStatsDto,
} from './services/employees';

// =============================================================================
// Asistencia, marcaciones, permisos y vacaciones
// =============================================================================

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

// =============================================================================
// Contratos, nómina y actividades
// =============================================================================

export {
  ContratosAPI,
  ContractsRHAPI,
  ContractTypeAPI,
  ContractRequestAPI,
  HistorialSalarialAPI,
  NominaAPI,
  LineasNominaAPI,
  MovimientosPersonalAPI,
  FinancialCertificationAPI,
  ActivityAPI,
  AdditionalActivityAPI,
  DegreeAPI,
  JobActivityAPI,
  OccupationalGroupAPI,
} from './services/payroll';

// =============================================================================
// Hoja de vida, justificaciones, publicaciones y parámetros
// =============================================================================

export {
  JustificationsAPI,
  AreaConocimientoAPI,
  PublicacionesAPI,
  NivelesEducativosAPI,
  CapacitacionesAPI,
  ExperienciasLaboralesAPI,
  DirectoryParametersAPI,
  ParametersAPI,
} from './services/cv';

export type { AttendanceCalculationRequestDto as CvAttendanceRequestDto } from './services/cv';

// =============================================================================
// Planificación de tiempo y cambios de horario
// =============================================================================

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

// =============================================================================
// Cálculos de asistencia, nómina y recuperación
// =============================================================================

export {
  AttendanceCalculationAPI,
  OvertimePriceAPI,
  PayrollDiscountsAPI,
  PayrollSubsidiesAPI,
  RecoveryAPI,
} from './services/calculations';

export type {
  AttendanceCalculationRequestDto,
  PayrollPeriodRequestDto,
} from './services/calculations';

// =============================================================================
// Vistas SQL de asistencia y horarios
// =============================================================================

export {
  VwAttendanceDayAPI,
  VwPunchDayAPI,
  VwLeaveWindowsAPI,
  VwEmployeeScheduleAtDateAPI,
} from './services/views';

// =============================================================================
// Gestión de archivos y documentos
// =============================================================================

export { FileManagementAPI, DocumentsAPI } from './services/files';

export type {
  FileUploadResponseDto,
  FileDeleteResponseDto,
} from './services/files';

// =============================================================================
// Feriados
// =============================================================================

export { HolidaysAPI } from './services/holidays';
export type { HolidayResponseDTO } from './services/holidays';

// =============================================================================
// Catálogos y datos de referencia
// =============================================================================

export {
  TiposReferenciaAPI,
  CargosAPI,
  CargosEspecializadosAPI,
  InstitucionesAPI,
  PaisesAPI,
  ProvinciasAPI,
  CantonesAPI,
} from './services/geo';

export type { RefType } from './services/geo';

// =============================================================================
// Sistema, salud y auditoría
// =============================================================================

export { HealthAPI, SistemaAPI, AuditoriaAPI } from './services/system';

export type { StatsResponse } from './services/system';

// =============================================================================
// Reportes
// =============================================================================

export { reportService, downloadBlob, ReportError } from './services/reports';

// =============================================================================
// Gestión de UserEmployees (vinculación usuario-empleado)
// =============================================================================
export { UserEmployeesAPI } from './services/auth';
export type { CreateUserEmployeeDto, UpdateUserEmployeeDto } from './services/auth';

// =============================================================================
// Autoridades de Departamento
// =============================================================================
export { DepartmentAuthoritiesAPI } from './services/departmentAuthorities';
export type {
  DepartmentAuthorityDto,
  DepartmentAuthorityCreateDto,
  DepartmentAuthorityUpdateDto,
  DepartmentAuthorityDenominationDto,
  DepartmentAuthorityPagedRequest,
} from './services/departmentAuthorities';
