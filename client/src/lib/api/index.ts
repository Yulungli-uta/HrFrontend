/**
 * Punto de entrada centralizado para todas las APIs
 * Exporta todos los servicios de forma organizada
 */

// =============================================================================
// Cliente HTTP base
// =============================================================================

export { apiFetch, createCrudService, API_CONFIG } from './client';
export type { ApiResponse, ApiError } from './client';

// =============================================================================
// APIs de Autenticación y Gestión de Usuarios
// =============================================================================

export {
  AuthAPI,
  AppAuthAPI,
  AuthUsersAPI,
  RolesAPI,
  UserRolesAPI,
  MenuItemsAPI,
  RoleMenuItemsAPI,
  PasswordAPI
} from './auth';

export type {
  LoginRequest,
  RefreshRequest,
  ValidateTokenRequest,
  AppAuthRequest,
  LegacyAuthRequest,
  LoginResponse,
  UserInfo,
  AzureAuthUrlResponse
} from './auth';

// =============================================================================
// APIs de Recursos Humanos Básicos
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
  EnfermedadesCatastroficasAPI
} from './hr-basic';

// =============================================================================
// APIs de Contratos y Nómina
// =============================================================================

export {
  ContratosAPI,
  HistorialSalarialAPI,
  NominaAPI,
  LineasNominaAPI,
  MovimientosPersonalAPI
} from './hr-payroll';

// =============================================================================
// APIs de Asistencia y Tiempo
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
  TimeAPI
} from './hr-attendance';

export type { TimeResponse } from './hr-attendance';

// =============================================================================
// APIs de Catálogos y Referencias
// =============================================================================

export {
  TiposReferenciaAPI,
  CargosAPI,
  CargosEspecializadosAPI,
  InstitucionesAPI,
  NivelesEducativosAPI,
  CapacitacionesAPI,
  ExperienciasLaboralesAPI,
  PaisesAPI,
  ProvinciasAPI,
  CantonesAPI
} from './catalogs';

// =============================================================================
// APIs de Sistema y Auditoría
// =============================================================================

export {
  HealthAPI,
  SistemaAPI,
  AuditoriaAPI,
  PublicacionesAPI
} from './system';

export type { StatsResponse } from './system';
