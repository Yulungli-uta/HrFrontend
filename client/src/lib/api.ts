// src/lib/api.ts
// ============================================================================
// API Client unificado con soporte multi-base (RH, AUTH, FILES)
// - Manejo de tokens (Bearer) y credenciales
// - apiFetch con timeout, manejo de errores y soporte para FormData
// - Servicios tipados y utilidades CRUD genéricas
// - Separación de bases por servicio (puertos distintos)
// ============================================================================

/* ---------------------------------------------------------------------------
 * Importación de tipos del dominio RH (personas, contratos, etc.)
 * -------------------------------------------------------------------------*/
import type {
  Persona, InsertPersona, Contrato, InsertContrato,
  Marcacion, InsertMarcacion, Permiso, InsertPermiso,
  Vacacion, InsertVacacion, Publicacion, InsertPublicacion
} from "@shared/schema";

/* ---------------------------------------------------------------------------
 * Servicio de autenticación (frontend) para obtener el Access Token
 * Debe exponer: tokenService.getAccessToken(): string | null
 * -------------------------------------------------------------------------*/
import { tokenService } from '@/services/auth';

/* ---------------------------------------------------------------------------
 * Configuración base por defecto (fallback)
 * - BASE_URL: si no se especifican bases por servicio, se usa esta
 * - DEFAULT_HEADERS: encabezados comunes (no añadir Content-Type para FormData)
 * - TIMEOUT: milisegundos antes de abortar la solicitud
 * - CREDENTIALS: modo de cookies
 * -------------------------------------------------------------------------*/
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE || "http://localhost:5000",
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  TIMEOUT: 15000, // 15 segundos
  CREDENTIALS: "include" as RequestCredentials
} as const;

/* ---------------------------------------------------------------------------
 * Bases por servicio (puertos/hosts diferentes)
 * Define en tu .env (ajusta a tu infraestructura):
 *   VITE_RH_API_BASE=http://localhost:5000
 *   VITE_AUTH_API_BASE=http://localhost:5010
 *   VITE_FILES_API_BASE=http://localhost:5000
 * Si no defines alguna, se usa API_CONFIG.BASE_URL como fallback.
 * -------------------------------------------------------------------------*/
const BASES = {
  RH:    import.meta.env.VITE_RH_API_BASE    || API_CONFIG.BASE_URL,
  AUTH:  import.meta.env.VITE_AUTH_API_BASE  || API_CONFIG.BASE_URL,
  FILES: import.meta.env.VITE_FILES_API_BASE || API_CONFIG.BASE_URL,
} as const;

/* ---------------------------------------------------------------------------
 * Tipos y estructuras de datos transversales
 * -------------------------------------------------------------------------*/

/** Respuesta estándar de la API */
export type ApiResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error';   error: ApiError };

/** Error estándar */
export interface ApiError {
  code: number;
  message: string;
  details?: any;
}

/* ---------------------------------------------------------------------------
 * Interfaces comunes para autenticación / estadísticas / tiempo
 * -------------------------------------------------------------------------*/
export interface LoginRequest { email: string; password: string; }
export interface RefreshRequest { refreshToken: string; }
export interface ValidateTokenRequest { token: string; clientId?: string; }
export interface AppAuthRequest { clientId?: string; clientSecret?: string; }
export interface LegacyAuthRequest {
  clientId?: string; clientSecret?: string;
  userEmail?: string; password?: string;
  includePermissions?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  userType: string;
  roles: string[];
  permissions: string[];
}

export interface AzureAuthUrlResponse { url: string; }

export interface StatsResponse {
  totalUsers: number;
  activeSessions: number;
  failedAttempts: number;
}

/** Respuesta servicio de tiempo */
export interface TimeResponse {
  dateTime: string;
  timestamp: number;
  timeZone?: string;
  formattedTime?: string;
  isUtc: boolean;
  serverName?: string;
}

/* ---------------------------------------------------------------------------
 * Interfaces RH específicas (feriados, planificaciones, justificaciones)
 * -------------------------------------------------------------------------*/
// Holidays
export interface HolidayCreateDTO {
  name: string;
  holidayDate: string;
  isActive: boolean;
  description?: string;
}
export interface HolidayResponseDTO {
  holidayID: number;
  name: string;
  holidayDate: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

// Time Planning
export interface TimePlanningCreateDTO {
  planType: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  overtimeType?: string;
  factor?: number;
  owedMinutes?: number;
  createdBy: number;
  requiresApproval: boolean;
  employees?: TimePlanningEmployeeCreateDTO[];
}
export interface TimePlanningEmployeeCreateDTO {
  planID?: number;
  employeeID: number;
  assignedHours?: number;
  assignedMinutes?: number;
}
export interface TimePlanningEmployeeUpdateDTO {
  planEmployeeID: number;
  actualHours?: number;
  actualMinutes?: number;
  employeeStatusTypeID?: number;
  paymentAmount?: number;
  isEligible?: boolean;
  eligibilityReason?: string;
}
export interface TimePlanningExecutionCreateDTO {
  planEmployeeID: number;
  workDate: string;
  startTime: string;
  endTime: string;
  comments?: string;
  verifiedBy?: number;
}
export interface TimePlanningExecutionUpdateDTO {
  executionID: number;
  startTime?: string;
  endTime?: string;
  comments?: string;
  verifiedBy?: number;
  verifiedAt?: string;
}

// Punch Justifications
export interface PunchJustificationsCreateDto {
  punchJustID?: number;
  employeeID: number;
  bossEmployeeID: number;
  justificationTypeID: number;
  startDateTime?: string;
  endDateTime?: string;
  justificationDate?: string;
  reason?: string;
  hoursRequested?: number;
  approved: boolean;
  approvedAt?: string;
  createdAt?: string;
  createdBy: number;
  comments?: string;
  status?: string;
}
export interface PunchJustificationsUpdateDto {
  punchJustID: number;
  approved: boolean;
  approvedAt?: string;
  comments?: string;
  status: string;
}

/* ===========================================================================
 * apiFetch: función principal de llamadas HTTP
 * - Detecta URL absoluta (no la prefija)
 * - Añade Authorization si hay token
 * - Timeout con AbortController
 * - Quita Content-Type si body es FormData (para boundary correcto)
 * - Devuelve ApiResponse<T> tipado
 * ==========================================================================*/
export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  // Merge de headers, añadiendo Authorization si existe token
  const accessToken = tokenService.getAccessToken();
  const mergedHeaders = new Headers({
    ...API_CONFIG.DEFAULT_HEADERS,
    ...(init.headers as Record<string, string> | undefined),
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
  });

  // Si el body es FormData, quitar Content-Type (el navegador pondrá boundary)
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (isFormData) mergedHeaders.delete("Content-Type");

  // Soporte de URL absoluta vs relativa (prefija BASE_URL sólo si es relativa)
  const isAbsolute = /^https?:\/\//i.test(path);
  const finalUrl = isAbsolute ? path : `${API_CONFIG.BASE_URL}${path}`;

  try {
    const response = await fetch(finalUrl, {
      credentials: API_CONFIG.CREDENTIALS,
      headers: mergedHeaders,
      ...init,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 2xx
    if (response.ok) {
      if (response.status === 204) {
        return { status: 'success', data: undefined as unknown as T };
      }
      // Intentar JSON -> Texto -> undefined
      try {
        const data = await response.json();
        return { status: 'success', data };
      } catch {
        try {
          const text = await response.text();
          return { status: 'success', data: text as unknown as T };
        } catch {
          return { status: 'success', data: undefined as unknown as T };
        }
      }
    }

    // Errores HTTP (4xx/5xx)
    let errorDetails: any;
    try { errorDetails = await response.json(); }
    catch {
      try { errorDetails = await response.text(); }
      catch { errorDetails = response.statusText; }
    }

    return {
      status: 'error',
      error: {
        code: response.status,
        message: `HTTP Error ${response.status}: ${response.statusText}`,
        details: errorDetails
      }
    };

  } catch (error: any) {
    clearTimeout(timeoutId);
    return {
      status: 'error',
      error: {
        code: 0,
        message: error?.name === 'AbortError'
          ? 'Request timed out'
          : `Network error: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

/* ===========================================================================
 * Fábrica CRUD genérica
 * - Usa endpoints absolutos (por eso pasamos ${BASES.X}/ruta)
 * - Devuelve list/get/create/update/remove
 * ==========================================================================*/
export function createApiService<Resource, CreateDTO, UpdateDTO = Partial<Resource>>(
  endpoint: string
) {
  return {
    list:   (): Promise<ApiResponse<Resource[]>> =>
      apiFetch<Resource[]>(endpoint),

    get:    (id: number | string): Promise<ApiResponse<Resource>> =>
      apiFetch<Resource>(`${endpoint}/${id}`),

    create: (data: CreateDTO): Promise<ApiResponse<Resource>> =>
      apiFetch<Resource>(endpoint, {
        method: "POST",
        body: JSON.stringify(data)
      }),

    update: (id: number | string, data: UpdateDTO): Promise<ApiResponse<Resource>> =>
      apiFetch<Resource>(`${endpoint}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    remove: (id: number | string): Promise<ApiResponse<void>> =>
      apiFetch<void>(`${endpoint}/${id}`, { method: "DELETE" })
  };
}

/* ===========================================================================
 * Servicios de Autenticación (AUTH BASE) - Core
 * ==========================================================================*/
export const AuthAPI = {
  /** Login tradicional (AUTH_BASE) */
  login: (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>(`${BASES.AUTH}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  /** Refresh token (AUTH_BASE) */
  refresh: (refreshRequest: RefreshRequest): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>(`${BASES.AUTH}/api/auth/refresh`, {
      method: 'POST',
      body: JSON.stringify(refreshRequest)
    }),

  /** Usuario actual (AUTH_BASE) */
  getCurrentUser: (): Promise<ApiResponse<UserInfo>> =>
    apiFetch<UserInfo>(`${BASES.AUTH}/api/auth/me`),

  /** Validar token (AUTH_BASE) */
  validateToken: (validateRequest: ValidateTokenRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.AUTH}/api/auth/validate-token`, {
      method: 'POST',
      body: JSON.stringify(validateRequest)
    }),

  /** URL de Azure (AUTH_BASE) */
  getAzureAuthUrl: (clientId?: string): Promise<ApiResponse<AzureAuthUrlResponse>> => {
    const queryParams = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
    return apiFetch<AzureAuthUrlResponse>(`${BASES.AUTH}/api/auth/azure/url${queryParams}`);
  },

  /** Callback Azure (AUTH_BASE) */
  azureCallback: (code: string, state: string): Promise<ApiResponse<LoginResponse>> => {
    const q = `?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    return apiFetch<LoginResponse>(`${BASES.AUTH}/api/auth/azure/callback${q}`);
  }
};

/* ===========================================================================
 * Autenticación de Aplicaciones (AUTH BASE)
 * ==========================================================================*/
export const AppAuthAPI = {
  getToken: (authRequest: AppAuthRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.AUTH}/api/app-auth/token`, {
      method: 'POST',
      body: JSON.stringify(authRequest)
    }),

  legacyLogin: (authRequest: LegacyAuthRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.AUTH}/api/app-auth/legacy-login`, {
      method: 'POST',
      body: JSON.stringify(authRequest)
    }),

  validateToken: (validateRequest: ValidateTokenRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.AUTH}/api/app-auth/validate-token`, {
      method: 'POST',
      body: JSON.stringify(validateRequest)
    }),

  getStats: (clientId: string): Promise<ApiResponse<StatsResponse>> =>
    apiFetch<StatsResponse>(`${BASES.AUTH}/api/app-auth/stats/${clientId}`)
};

/* ===========================================================================
 * Servicios de Administración AUTH (AUTH BASE)
 * - Usuarios, Roles, UserRoles, MenuItems, RoleMenuItems, Password
 * ==========================================================================*/
import type {
  User, Role, UserRole, MenuItem, RoleMenuItem,
  CreateUserDto, UpdateUserDto,
  CreateRoleDto, UpdateRoleDto,
  CreateUserRoleDto, UpdateUserRoleDto,
  CreateMenuItemDto, UpdateMenuItemDto,
  CreateRoleMenuItemDto, UpdateRoleMenuItemDto,
  ChangePasswordDto, ChangePasswordResponse
} from '@/types/auth';

export const AuthUsersAPI = {
  list: (page = 1, size = 100): Promise<ApiResponse<User[]>> =>
    apiFetch<User[]>(`${BASES.AUTH}/api/users?page=${page}&size=${size}`),

  get: (id: string): Promise<ApiResponse<User>> =>
    apiFetch<User>(`${BASES.AUTH}/api/users/${id}`),

  create: (data: CreateUserDto): Promise<ApiResponse<User>> =>
    apiFetch<User>(`${BASES.AUTH}/api/users`, { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: UpdateUserDto): Promise<ApiResponse<User>> =>
    apiFetch<User>(`${BASES.AUTH}/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: string): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASES.AUTH}/api/users/${id}`, { method: 'DELETE' })
};

export const RolesAPI = {
  list: (page = 1, size = 100): Promise<ApiResponse<Role[]>> =>
    apiFetch<Role[]>(`${BASES.AUTH}/api/roles?page=${page}&size=${size}`),

  get: (id: number): Promise<ApiResponse<Role>> =>
    apiFetch<Role>(`${BASES.AUTH}/api/roles/${id}`),

  create: (data: CreateRoleDto): Promise<ApiResponse<Role>> =>
    apiFetch<Role>(`${BASES.AUTH}/api/roles`, { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: UpdateRoleDto): Promise<ApiResponse<Role>> =>
    apiFetch<Role>(`${BASES.AUTH}/api/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASES.AUTH}/api/roles/${id}`, { method: 'DELETE' })
};

export const UserRolesAPI = {
  list: (page = 1, size = 100): Promise<ApiResponse<UserRole[]>> =>
    apiFetch<UserRole[]>(`${BASES.AUTH}/api/user-roles?page=${page}&size=${size}`),

  get: (userId: string, roleId: number, assignedAt: string): Promise<ApiResponse<UserRole>> =>
    apiFetch<UserRole>(`${BASES.AUTH}/api/user-roles/${userId}/${roleId}/${assignedAt}`),

  create: (data: CreateUserRoleDto): Promise<ApiResponse<UserRole>> =>
    apiFetch<UserRole>(`${BASES.AUTH}/api/user-roles`, { method: 'POST', body: JSON.stringify(data) }),

  remove: (userId: string, roleId: number, assignedAt: string): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASES.AUTH}/api/user-roles/${userId}/${roleId}/${assignedAt}`, { method: 'DELETE' })
};

export const MenuItemsAPI = {
  list: (page = 1, size = 100): Promise<ApiResponse<MenuItem[]>> =>
    apiFetch<MenuItem[]>(`${BASES.AUTH}/api/menu-items?page=${page}&size=${size}`),

  get: (id: number): Promise<ApiResponse<MenuItem>> =>
    apiFetch<MenuItem>(`${BASES.AUTH}/api/menu-items/${id}`),

  create: (data: CreateMenuItemDto): Promise<ApiResponse<MenuItem>> =>
    apiFetch<MenuItem>(`${BASES.AUTH}/api/menu-items`, { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: UpdateMenuItemDto): Promise<ApiResponse<MenuItem>> =>
    apiFetch<MenuItem>(`${BASES.AUTH}/api/menu-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASES.AUTH}/api/menu-items/${id}`, { method: 'DELETE' })
};

export const RoleMenuItemsAPI = {
  list: (page = 1, size = 100): Promise<ApiResponse<RoleMenuItem[]>> =>
    apiFetch<RoleMenuItem[]>(`${BASES.AUTH}/api/role-menu-items?page=${page}&size=${size}`),

  get: (roleId: number, menuItemId: number): Promise<ApiResponse<RoleMenuItem>> =>
    apiFetch<RoleMenuItem>(`${BASES.AUTH}/api/role-menu-items/${roleId}/${menuItemId}`),

  create: (data: CreateRoleMenuItemDto): Promise<ApiResponse<RoleMenuItem>> =>
    apiFetch<RoleMenuItem>(`${BASES.AUTH}/api/role-menu-items`, { method: 'POST', body: JSON.stringify(data) }),

  remove: (roleId: number, menuItemId: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASES.AUTH}/api/role-menu-items/${roleId}/${menuItemId}`, { method: 'DELETE' })
};

export const PasswordAPI = {
  change: (data: ChangePasswordDto): Promise<ApiResponse<ChangePasswordResponse>> =>
    apiFetch<ChangePasswordResponse>(`${BASES.AUTH}/api/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

/* ===========================================================================
 * Servicios RH (RH BASE) — todos con BASES.RH explícito
 * ==========================================================================*/

// Personas
export const PersonasAPI = createApiService<Persona, InsertPersona>(`${BASES.RH}/api/v1/rh/people`);

// Contratos (extendido)
export const ContratosAPI = {
  ...createApiService<Contrato, InsertContrato>(`${BASES.RH}/api/v1/rh/contracts`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/contracts/employee/${employeeId}`),
  getActive: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/contracts/active`),
  getByType: (contractType: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/contracts/type/${contractType}`)
};

// Marcaciones (CRUD)
export const MarcacionesAPI = createApiService<Marcacion, InsertMarcacion>(`${BASES.RH}/api/v1/rh/attendance/punches`);

// Permisos (extendido)
export const PermisosAPI = {
  ...createApiService<Permiso, InsertPermiso>(`${BASES.RH}/api/v1/rh/permissions`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/permissions/employee/${employeeId}`)
};

// Vacaciones (extendido)
export const VacacionesAPI = {
  ...createApiService<Vacacion, InsertVacacion>(`${BASES.RH}/api/v1/rh/vacations`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/vacations/employee/${employeeId}`)
};

// Publicaciones
export const PublicacionesAPI = createApiService<Publicacion, InsertPublicacion>(`${BASES.RH}/api/v1/rh/cv/publications`);

// Health Check RH
export const HealthAPI = {
  check: (): Promise<ApiResponse<{ status: string }>> =>
    apiFetch<{ status: string }>(`${BASES.RH}/health`)
};

// Tipos de Referencia
export const TiposReferenciaAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/ref/types`),
  byCategory: (category: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/ref/types/category/${category}`)
};

// Marcaciones especializadas
export const MarcacionesEspecializadasAPI = {
  getLastPunch: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/attendance/punches/last-punch/${employeeId}`),
  getTodayPunches: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/attendance/punches/today/${employeeId}`),
  getPunchesByEmployeeAndDateRange:
    (employeeId: number, startDate: string, endDate: string): Promise<ApiResponse<any>> =>
      apiFetch<any>(`${BASES.RH}/api/v1/rh/attendance/punches/employee/${employeeId}/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
  getPunchesByDateRange:
    (startDate: string, endDate: string): Promise<ApiResponse<any>> =>
      apiFetch<any>(`${BASES.RH}/api/v1/rh/attendance/punches/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`)
};

// Cargos (búsquedas)
export const CargosEspecializadosAPI = {
  getActiveJobs: (): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/jobs/active`),
  searchJobs: (title: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/jobs/search?title=${encodeURIComponent(title)}`)
};

// Config. Horas Extras
export const ConfigHorasExtrasAPI = createApiService<any, any>(`${BASES.RH}/api/v1/rh/overtime/config`);

// Vista empleados (completa)
export const VistaEmpleadosAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/vw/EmployeeComplete`),
  byDepartment: (department: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/vw/EmployeeComplete/department/${department}`)
};

// Time API
export const TimeAPI = {
  getServerTime: (): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>(`${BASES.RH}/api/v1/rh/time`),
  getServerTimeUtc: (): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>(`${BASES.RH}/api/v1/rh/time/utc`),
  getTimeByTimeZone: (tz: string): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>(`${BASES.RH}/api/v1/rh/time/timezone/${tz}`),
  health: (): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/time/health`)
};

// Vista Detalles Empleados
export const VistaDetallesEmpleadosAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/vw/EmployeeDetails`),
  byEmail: (email: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/vw/EmployeeDetails/email/${email}`),
  byDepartment: (departmentName: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/vw/EmployeeDetails/department/${departmentName}`),
  byFaculty: (facultyName: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/vw/EmployeeDetails/faculty/${facultyName}`),
  byType: (employeeType: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/vw/EmployeeDetails/type/${employeeType}`),
  getAvailableTypes: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/vw/EmployeeDetails/available/types`),
  getAvailableDepartments: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/vw/EmployeeDetails/available/departments`),
  getAvailableFaculties: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/vw/EmployeeDetails/available/faculties`)
};

// Time Planning (planes)
export const TimePlanningAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/planning/timePlannings`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/planning/timePlannings/employee/${employeeId}`),
  getByStatus: (statusTypeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/planning/timePlannings/status/${statusTypeId}`)
};

// Time Planning (empleados)
export const TimePlanningEmployeesAPI = {
  getByPlan: (planId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/planning/employees/by-plan/${planId}`),

  // Alternativo (misma ruta, se mantiene por compatibilidad)
  getByPlanPath: (planId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/planning/employees/by-plan/${planId}`),

  addEmployee: (_planId: number, employeeData: any): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/planning/employees`, {
      method: 'POST',
      body: JSON.stringify(employeeData) // employeeData incluye planID
    }),

  getById: (id: number, planId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/planning/employees/${id}?planId=${planId}`),

  update: (id: number, planId: number, employeeData: any): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/planning/employees/${id}?planId=${planId}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData)
    }),

  delete: (id: number, planId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/planning/employees/${id}?planId=${planId}`, {
      method: 'DELETE'
    })
};

// Time Planning (ejecuciones)
export const TimePlanningExecutionsAPI = {
  getByPlanEmployee: (planEmployeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/planning/${planEmployeeId}/executions`),

  registerWorkTime: (planEmployeeId: number, executionData: TimePlanningExecutionCreateDTO): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/planning/${planEmployeeId}/executions`, {
      method: 'POST',
      body: JSON.stringify(executionData)
    }),

  getById: (planEmployeeId: number, id: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/planning/${planEmployeeId}/executions/${id}`),

  update: (planEmployeeId: number, id: number, executionData: TimePlanningExecutionUpdateDTO): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/planning/${planEmployeeId}/executions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(executionData)
    }),

  delete: (planEmployeeId: number, id: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/planning/${planEmployeeId}/executions/${id}`, {
      method: 'DELETE'
    })
};

// Holidays
export const HolidaysAPI = {
  ...createApiService<HolidayResponseDTO, HolidayCreateDTO>(`${BASES.RH}/api/v1/rh/holiday`),
  getByYear: (year: number): Promise<ApiResponse<HolidayResponseDTO[]>> =>
    apiFetch<HolidayResponseDTO[]>(`${BASES.RH}/api/v1/rh/holiday/year/${year}`),
  getActive: (): Promise<ApiResponse<HolidayResponseDTO[]>> =>
    apiFetch<HolidayResponseDTO[]>(`${BASES.RH}/api/v1/rh/holiday/active`),
  isHoliday: (date: string): Promise<ApiResponse<boolean>> =>
    apiFetch<boolean>(`${BASES.RH}/api/v1/rh/holiday/check/${date}`)
};

// Justificaciones de marcaciones
export const JustificacionesMarcacionesAPI = {
  ...createApiService<any, PunchJustificationsCreateDto, PunchJustificationsUpdateDto>(`${BASES.RH}/api/v1/rh/attendance/punch-justifications`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/attendance/punch-justifications/employee/${employeeId}`),
  getByBoss: (bossEmployeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/attendance/punch-justifications/boss/${bossEmployeeId}`),
  getByStatus: (status: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/attendance/punch-justifications/status/${status}`)
};

// Sistema RH
export const SistemaAPI = {
  info: (): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/`),
  health: (): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/health`)
};

/* ---------------------------------------------------------------------------
 * CRUD genéricos RH (ajusta/añade según tus endpoints reales)
 * -------------------------------------------------------------------------*/
export const DireccionesAPI                 = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/addresses`);
export const CalculosAsistenciaAPI          = createApiService<any, any>(`${BASES.RH}/api/v1/rh/attendance/calculations`);
export const AuditoriaAPI                   = createApiService<any, any>(`${BASES.RH}/api/v1/rh/audit`);
export const CuentasBancariasAPI            = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/bank-accounts`);
export const LibrosAPI                      = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/books`);
export const CantonesAPI                    = createApiService<any, any>(`${BASES.RH}/api/v1/rh/geo/cantons`);
export const EnfermedadesCatastroficasAPI   = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/catastrophic-illnesses`);
export const PaisesAPI                      = createApiService<any, any>(`${BASES.RH}/api/v1/rh/geo/countries`);

export const DepartamentosAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/departments`),
  getActive: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/departments/active`),
  getByFaculty: (facultyId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/departments/faculty/${facultyId}`)
};

export const NivelesEducativosAPI           = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/education-levels`);
export const ContactosEmergenciaAPI         = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/emergency-contacts`);

export const HorariosEmpleadosAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/employee-schedules`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/employee-schedules/employee/${employeeId}`),
  getActiveByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/employee-schedules/employee/${employeeId}/active`)
};

export const EmpleadosAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/employees`),
  getActive: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/employees/active`),
  getByDepartment: (departmentId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/employees/department/${departmentId}`),
  getByType: (employeeType: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/employees/type/${employeeType}`)
};

export const FacultadesAPI                  = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/faculties`),
  getActive: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/faculties/active`)
};
export const CargasFamiliaresAPI            = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/family-burden`);
export const InstitucionesAPI               = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/institutions`);

export const HorasExtrasAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/overtime`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/overtime/employee/${employeeId}`),
  getByStatus: (status: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/overtime/status/${status}`),
  getPendingApproval: (approverId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/overtime/pending/${approverId}`)
};

export const NominaAPI                      = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/payroll`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/payroll/employee/${employeeId}`),
  getByPeriod: (period: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/payroll/period/${period}`)
};
export const LineasNominaAPI                = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/payroll-lines`),
  getByPayroll: (payrollId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/payroll-lines/payroll/${payrollId}`)
};

export const TiposPermisosAPI               = createApiService<any, any>(`${BASES.RH}/api/v1/rh/permission-types`);

export const MovimientosPersonalAPI         = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/personnel-movements`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/personnel-movements/employee/${employeeId}`),
  getByType: (movementType: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/personnel-movements/type/${movementType}`),
  getActive: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/personnel-movements/active`)
};

export const ProvinciasAPI                  = createApiService<any, any>(`${BASES.RH}/api/v1/rh/geo/provinces`);

export const HistorialSalarialAPI           = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/salary-history`),
  getByContract: (contractId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/salary-history/contract/${contractId}`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/salary-history/employee/${employeeId}`)
};

export const HorariosAPI                    = createApiService<any, any>(`${BASES.RH}/api/v1/rh/schedules`);

export const SubrogacionesAPI               = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/subrogations`),
  getBySubrogatingEmployee: (subrogatingEmployeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/subrogations/subrogating/${subrogatingEmployeeId}`),
  getBySubrogatedEmployee: (subrogatedEmployeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/subrogations/subrogated/${subrogatedEmployeeId}`),
  getActive: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/subrogations/active`)
};

export const RegistrosRecuperacionTiempoAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/time-recovery/logs`),
  getByPlan: (recoveryPlanId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/time-recovery/logs/plan/${recoveryPlanId}`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/time-recovery/logs/employee/${employeeId}`)
};

export const PlanesRecuperacionTiempoAPI    = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/time-recovery/plans`),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/time-recovery/plans/employee/${employeeId}`),
  getActive: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`${BASES.RH}/api/v1/rh/time-recovery/plans/active`)
};

export const CapacitacionesAPI              = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/trainings`);
export const ExperienciasLaboralesAPI       = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/work-experiences`);
export const CargosAPI                      = createApiService<any, any>(`${BASES.RH}/api/v1/rh/jobs`);

/* ---------------------------------------------------------------------------
 * Rutas corregidas RH (clasificadores)
 * -------------------------------------------------------------------------*/
export const ActivityAPI           = createApiService<any, any>(`${BASES.RH}/api/v1/rh/activity`);
export const AdditionalActivityAPI = createApiService<any, any>(`${BASES.RH}/api/v1/rh/additional-activity`);
export const ContractTypeAPI       = createApiService<any, any>(`${BASES.RH}/api/v1/rh/contract-type`);
export const DegreeAPI             = createApiService<any, any>(`${BASES.RH}/api/v1/rh/degree`);
export const JobActivityAPI        = createApiService<any, any>(`${BASES.RH}/api/v1/rh/job-activity`);
export const OccupationalGroupAPI  = createApiService<any, any>(`${BASES.RH}/api/v1/rh/occupational-group`);

/* ---------------------------------------------------------------------------
 * Nuevas APIs del Swagger RH (directorio/archivos/parámetros)
 * -------------------------------------------------------------------------*/
export const DirectoryParametersAPI = {
  ...createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/directory-parameters`),
  getByCode: (code: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.RH}/api/v1/rh/cv/directory-parameters/by-code/${code}`)
};

export const ParametersAPI = createApiService<any, any>(`${BASES.RH}/api/v1/rh/cv/parameters`);

/** Gestión de Archivos (FILES BASE) */
export const FileManagementAPI = {
  /** Subir archivo (multipart/form-data) */
  uploadFile: (formData: FormData): Promise<ApiResponse<any>> =>
    apiFetch<any>(`${BASES.FILES}/api/v1/rh/files/upload`, {
      method: "POST",
      body: formData,
      headers: {
        // Importante: NO fijar Content-Type (apiFetch lo elimina si detecta FormData)
      }
    }),

  /** Descargar archivo (retorna Blob) */
  downloadFile: async (directoryCode: string, filePath: string): Promise<ApiResponse<Blob>> => {
    const url = `${BASES.FILES}/api/v1/rh/files/download/${encodeURIComponent(directoryCode)}?filePath=${encodeURIComponent(filePath)}`;
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "*/*",
          ...(tokenService.getAccessToken()
            ? { "Authorization": `Bearer ${tokenService.getAccessToken()}` }
            : {})
        },
        credentials: API_CONFIG.CREDENTIALS
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        return { status: "error", error: { code: resp.status, message: text || `HTTP Error ${resp.status}`, details: text } };
    }

      const blob = await resp.blob();
      return { status: "success", data: blob };
    } catch (e: any) {
      return { status: "error", error: { code: 0, message: e?.message || "Network error" } };
    }
  },

  /** Verificar existencia de archivo */
  fileExists: (directoryCode: string, filePath: string): Promise<ApiResponse<boolean>> =>
    apiFetch<boolean>(`${BASES.FILES}/api/v1/rh/files/exists/${encodeURIComponent(directoryCode)}?filePath=${encodeURIComponent(filePath)}`)
};

// Alias por conveniencia (mismo objeto que VistaDetallesEmpleadosAPI)
export const EmployeeDetailsAPI = { ...VistaDetallesEmpleadosAPI };

/* ===========================================================================
 * API utilitaria simple (GET/POST/PUT/PATCH/DELETE) — multi-base vía URL absoluta
 * ==========================================================================*/
export const api = {
  get:   <T>(path: string): Promise<ApiResponse<T>> => apiFetch<T>(path),
  post:  <T>(path: string, data: any): Promise<ApiResponse<T>> =>
    apiFetch<T>(path, { method: "POST",  body: JSON.stringify(data) }),
  put:   <T>(path: string, data: any): Promise<ApiResponse<T>> =>
    apiFetch<T>(path, { method: "PUT",   body: JSON.stringify(data) }),
  patch: <T>(path: string, data: any): Promise<ApiResponse<T>> =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete:<T = void>(path: string): Promise<ApiResponse<T>> =>
    apiFetch<T>(path, { method: "DELETE" })
};

/* ===========================================================================
 * Utilidades adicionales
 * ==========================================================================*/
/** Formatea un error de API para UI */
export function handleApiError(error: ApiError, defaultMessage = "Ocurrió un error inesperado"): string {
  if (error.details?.message) return error.details.message;
  if (error.details?.error)   return error.details.error;
  if (typeof error.details === 'string') return error.details;
  return defaultMessage;
}

/** Interceptor global para fijar Authorization en DEFAULT_HEADERS (opcional) */
export function setAuthToken(token: string): void {
  (API_CONFIG as any).DEFAULT_HEADERS = {
    ...API_CONFIG.DEFAULT_HEADERS,
    "Authorization": `Bearer ${token}`
  };
}

/* ===========================================================================
 * Exportación por defecto para compatibilidad (índice agregador)
 * ==========================================================================*/
export default {
  // base
  apiFetch, createApiService,

  // auth core
  AuthAPI, AppAuthAPI,

  // auth admin
  AuthUsersAPI, RolesAPI, UserRolesAPI, MenuItemsAPI, RoleMenuItemsAPI, PasswordAPI,

  // RH core
  PersonasAPI, ContratosAPI, MarcacionesAPI, PermisosAPI, VacacionesAPI, PublicacionesAPI,

  // RH especiales
  HealthAPI, TiposReferenciaAPI, MarcacionesEspecializadasAPI, CargosEspecializadosAPI,
  ConfigHorasExtrasAPI, VistaEmpleadosAPI,

  // tiempo y vistas
  TimeAPI, VistaDetallesEmpleadosAPI,

  // planning
  TimePlanningAPI, TimePlanningEmployeesAPI, TimePlanningExecutionsAPI,

  // holidays / justificaciones
  HolidaysAPI, JustificacionesMarcacionesAPI,

  // sistema
  SistemaAPI,

  // genéricos RH
  DireccionesAPI, CalculosAsistenciaAPI, AuditoriaAPI, CuentasBancariasAPI, LibrosAPI,
  CantonesAPI, EnfermedadesCatastroficasAPI, PaisesAPI, DepartamentosAPI, NivelesEducativosAPI,
  ContactosEmergenciaAPI, HorariosEmpleadosAPI, EmpleadosAPI, FacultadesAPI, CargasFamiliaresAPI,
  InstitucionesAPI, HorasExtrasAPI, NominaAPI, LineasNominaAPI, TiposPermisosAPI,
  MovimientosPersonalAPI, ProvinciasAPI, HistorialSalarialAPI, HorariosAPI, SubrogacionesAPI,
  RegistrosRecuperacionTiempoAPI, PlanesRecuperacionTiempoAPI, CapacitacionesAPI,
  ExperienciasLaboralesAPI, CargosAPI,

  // rutas corregidas
  ActivityAPI, AdditionalActivityAPI, ContractTypeAPI, DegreeAPI, JobActivityAPI, OccupationalGroupAPI,

  // swagger nuevos
  DirectoryParametersAPI, ParametersAPI, FileManagementAPI, EmployeeDetailsAPI,

  // utils
  api, handleApiError, setAuthToken
};
