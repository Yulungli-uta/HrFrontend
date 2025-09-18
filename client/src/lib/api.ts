// src/lib/api.ts
import type {
  Persona, InsertPersona, Contrato, InsertContrato,
  Marcacion, InsertMarcacion, Permiso, InsertPermiso,
  Vacacion, InsertVacacion, Publicacion, InsertPublicacion
} from "@shared/schema";

import { tokenService } from '@/services/auth';

// =============================================================================
// Configuración centralizada
// =============================================================================

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE || "http://localhost:5000",
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  TIMEOUT: 15000, // 15 segundos
  CREDENTIALS: "include" as RequestCredentials
};

// =============================================================================
// Tipos y estructuras de datos
// =============================================================================

/**
 * Representa una respuesta estándar de la API
 * @template T Tipo de datos esperado en la respuesta
 */
export type ApiResponse<T> = 
  | { status: 'success'; data: T; }
  | { status: 'error'; error: ApiError; };

/**
 * Representa un error de la API
 */
export interface ApiError {
  code: number;
  message: string;
  details?: any;
}

// =============================================================================
// Interfaces para las nuevas APIs de autenticación
// =============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ValidateTokenRequest {
  token: string;
  clientId?: string;
}

export interface AppAuthRequest {
  clientId?: string;
  clientSecret?: string;
}

export interface LegacyAuthRequest {
  clientId?: string;
  clientSecret?: string;
  userEmail?: string;
  password?: string;
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

export interface AzureAuthUrlResponse {
  url: string;
}

export interface StatsResponse {
  totalUsers: number;
  activeSessions: number;
  failedAttempts: number;
  // ... otras estadísticas según la respuesta real
}

// =============================================================================
// Función principal para llamadas API
// =============================================================================

/**
 * Realiza una llamada a la API con manejo avanzado de errores y timeout
 * @param path Ruta del endpoint
 * @param init Opciones adicionales de la solicitud
 * @returns Promise con la respuesta tipada
 */
export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  
  // Obtener token de autenticación
  const accessToken = tokenService.getAccessToken();
  const headers = { 
    ...API_CONFIG.DEFAULT_HEADERS, 
    ...init.headers,
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
  };

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
      credentials: API_CONFIG.CREDENTIALS,
      headers,
      ...init,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Manejo de respuestas exitosas
    if (response.ok) {
      // Respuestas sin contenido (204)
      if (response.status === 204) {
        return { status: 'success', data: undefined as unknown as T };
      }
      
      // Intenta parsear la respuesta como JSON
      try {
        const data = await response.json();
        return { status: 'success', data };
      } catch (jsonError) {
        // Si falla el parseo JSON, devuelve el texto
        const text = await response.text();
        return { 
          status: 'success', 
          data: text as unknown as T 
        };
      }
    }
    
    // Manejo de errores HTTP (4xx, 5xx)
    let errorDetails: any;
    try {
      errorDetails = await response.json();
    } catch {
      try {
        errorDetails = await response.text();
      } catch {
        errorDetails = response.statusText;
      }
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
    
    // Manejo de errores de net o timeout
    return {
      status: 'error',
      error: {
        code: 0,
        message: error.name === 'AbortError' 
          ? 'Request timed out' 
          : `Network error: ${error.message || 'Unknown error'}`
      }
    };
  }
}

// =============================================================================
// Fábrica de servicios CRUD
// =============================================================================

/**
 * Crea un servicio CRUD completo para un recurso específico
 * @template Resource Tipo del recurso principal
 * @template CreateDTO Tipo para operaciones de creación
 * @template UpdateDTO Tipo para operaciones de actualización (por defecto Partial<Resource>)
 * @param endpoint Ruta base del recurso
 * @returns Objeto con métodos CRUD tipados
 */
export function createApiService<Resource, CreateDTO, UpdateDTO = Partial<Resource>>(
  endpoint: string
) {
  return {
    /**
     * Obtiene todos los recursos
     * @returns Lista de recursos
     */
    list: (): Promise<ApiResponse<Resource[]>> => 
      apiFetch<Resource[]>(endpoint),
    
    /**
     * Obtiene un recurso por su ID
     * @param id Identificador del recurso
     * @returns Recurso solicitado
     */
    get: (id: number | string): Promise<ApiResponse<Resource>> => 
      apiFetch<Resource>(`${endpoint}/${id}`),
    
    /**
     * Crea un nuevo recurso
     * @param data Datos para la creación
     * @returns Recurso creado
     */
    create: (data: CreateDTO): Promise<ApiResponse<Resource>> => 
      apiFetch<Resource>(endpoint, {
        method: "POST",
        body: JSON.stringify(data)
      }),
    
    /**
     * Actualiza un recurso existente
     * @param id Identificador del recurso
     * @param data Datos para la actualización
     * @returns Recurso actualizado
     */
    update: (id: number | string, data: UpdateDTO): Promise<ApiResponse<Resource>> => 
      apiFetch<Resource>(`${endpoint}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    
    /**
     * Elimina un recurso
     * @param id Identificador del recurso
     * @returns Respuesta vacía
     */
    remove: (id: number | string): Promise<ApiResponse<void>> => 
      apiFetch<void>(`${endpoint}/${id}`, { 
        method: "DELETE" 
      })
  };
}

// =============================================================================
// Servicios de Autenticación (Nuevos)
// =============================================================================

export const AuthAPI = {
  /**
   * Login tradicional con email y password
   * @param credentials Credenciales de login
   * @returns Respuesta con tokens de autenticación
   */
  login: (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  /**
   * Refresh token
   * @param refreshRequest Solicitud de refresh token
   * @returns Nueva respuesta con tokens
   */
  refresh: (refreshRequest: RefreshRequest): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(refreshRequest)
    }),

  /**
   * Obtiene información del usuario actual
   * @returns Información del usuario autenticado
   */
  getCurrentUser: (): Promise<ApiResponse<UserInfo>> =>
    apiFetch<UserInfo>('/api/auth/me'),

  /**
   * Valida un token
   * @param validateRequest Solicitud de validación de token
   * @returns Resultado de la validación
   */
  validateToken: (validateRequest: ValidateTokenRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/auth/validate-token', {
      method: 'POST',
      body: JSON.stringify(validateRequest)
    }),

  /**
   * Obtiene URL de autenticación con Azure
   * @param clientId ID del cliente (opcional)
   * @returns URL de autenticación
   */
  getAzureAuthUrl: (clientId?: string): Promise<ApiResponse<AzureAuthUrlResponse>> => {
    console.log("valor del cliendId: " + clientId);
    const queryParams = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
    return apiFetch<AzureAuthUrlResponse>(`/api/auth/azure/url${queryParams}`);
  },

  /**
   * Callback de autenticación con Azure
   * @param code Código de autorización
   * @param state Estado de la solicitud
   * @returns Resultado de la autenticación
   */
  azureCallback: (code: string, state: string): Promise<ApiResponse<LoginResponse>> => {
    const queryParams = `?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    return apiFetch<LoginResponse>(`/api/auth/azure/callback${queryParams}`);
  }
};

export const AppAuthAPI = {
  /**
   * Obtiene token de aplicación
   * @param authRequest Solicitud de autenticación de aplicación
   * @returns Token de aplicación
   */
  getToken: (authRequest: AppAuthRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/app-auth/token', {
      method: 'POST',
      body: JSON.stringify(authRequest)
    }),

  /**
   * Login legacy para aplicaciones
   * @param authRequest Solicitud de autenticación legacy
   * @returns Resultado de la autenticación
   */
  legacyLogin: (authRequest: LegacyAuthRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/app-auth/legacy-login', {
      method: 'POST',
      body: JSON.stringify(authRequest)
    }),

  /**
   * Valida token de aplicación
   * @param validateRequest Solicitud de validación de token
   * @returns Resultado de la validación
   */
  validateToken: (validateRequest: ValidateTokenRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/app-auth/validate-token', {
      method: 'POST',
      body: JSON.stringify(validateRequest)
    }),

  /**
   * Obtiene estadísticas de autenticación
   * @param clientId ID del cliente
   * @returns Estadísticas de autenticación
   */
  getStats: (clientId: string): Promise<ApiResponse<StatsResponse>> =>
    apiFetch<StatsResponse>(`/api/app-auth/stats/${clientId}`)
};

// =============================================================================
// Servicios específicos con tipos definidos
// =============================================================================

// Personas API
export const PersonasAPI = createApiService<Persona, InsertPersona>("/api/v1/rh/people");

// Contratos API
export const ContratosAPI = createApiService<Contrato, InsertContrato>("/api/v1/rh/contracts");

// Marcaciones API
export const MarcacionesAPI = createApiService<Marcacion, InsertMarcacion>("/api/v1/rh/attendance/punches");

// Permisos API
export const PermisosAPI = createApiService<Permiso, InsertPermiso>("/api/v1/rh/permissions");

// Vacaciones API
export const VacacionesAPI = createApiService<Vacacion, InsertVacacion>("/api/v1/rh/vacations");

// Publicaciones API
export const PublicacionesAPI = createApiService<Publicacion, InsertPublicacion>("/api/v1/rh/cv/publications");

// =============================================================================
// Servicios especializados
// =============================================================================

// Health Check API
export const HealthAPI = {
  /**
   * Verifica el estado del servicio
   * @returns Estado del servicio
   */
  check: (): Promise<ApiResponse<{ status: string }>> => 
    apiFetch<{ status: string }>("/health")
};

// Tipos de Referencia API
export const TiposReferenciaAPI = {
  ...createApiService<any, any>("/api/v1/rh/ref/types"),
  
  /**
   * Obtiene tipos por categoría
   * @param category Categoría de tipos
   * @returns Lista de tipos en la categoría
   */
  byCategory: (category: string): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>(`/api/v1/rh/ref/types/category/${category}`)
};

// Servicios especializados para AttendancePunches
export const MarcacionesEspecializadasAPI = {
  /**
   * Obtiene la última marcación de un empleado
   * @param employeeId ID del empleado
   * @returns Última marcación
   */
  getLastPunch: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/attendance/punches/last-punch/${employeeId}`),

  /**
   * Obtiene las marcaciones del día actual para un empleado
   * @param employeeId ID del empleado
   * @returns Marcaciones del día actual
   */
  getTodayPunches: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/attendance/punches/today/${employeeId}`),

  /**
   * Obtiene las marcaciones de un empleado en un rango de fechas
   * @param employeeId ID del empleado
   * @param startDate Fecha de inicio
   * @param endDate Fecha de fin
   * @returns Marcaciones en el rango de fechas
   */
  getPunchesByEmployeeAndDateRange: (
    employeeId: number, 
    startDate: string, 
    endDate: string
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(
      `/api/v1/rh/attendance/punches/employee/${employeeId}/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    ),

  /**
   * Obtiene las marcaciones en un rango de fechas
   * @param startDate Fecha de inicio
   * @param endDate Fecha de fin
   * @returns Marcaciones en el rango de fechas
   */
  getPunchesByDateRange: (
    startDate: string, 
    endDate: string
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(
      `/api/v1/rh/attendance/punches/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    )
};

// Servicios especializados para Jobs
export const CargosEspecializadosAPI = {
  /**
   * Obtiene todos los trabajos activos
   * @returns Lista de trabajos activos
   */
  getActiveJobs: (): Promise<ApiResponse<any>> =>
    apiFetch<any>("/api/v1/rh/jobs/active"),

  /**
   * Busca trabajos por título
   * @param title Título a buscar
   * @returns Trabajos que coinciden con la búsqueda
   */
  searchJobs: (title: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/jobs/search?title=${encodeURIComponent(title)}`)
};

// Configuración Horas Extras API
export const ConfigHorasExtrasAPI = {
  ...createApiService<any, any>("/api/v1/rh/overtime/config"),
  
  // Métodos adicionales específicos para este servicio
};

// Vistas de Empleados (VwEmployees)
export const VistaEmpleadosAPI = {
  ...createApiService<any, any>("/api/v1/rh/vw/EmployeeComplete"),
  
  /**
   * Obtiene empleados por departamento
   * @param department Departamento a filtrar
   * @returns Lista de empleados del departamento
   */
  byDepartment: (department: string): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeComplete/department/${department}`)
};

// =============================================================================
// Servicios para Time API (Nuevos - Faltantes)
// =============================================================================

export const TimeAPI = {
  /**
   * Obtiene la hora actual del servidor en la zona horaria local
   * @returns Respuesta con la hora del servidor
   */
  getServerTime: (): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>("/api/v1/rh/time"),

  /**
   * Obtiene la hora actual del servidor en UTC
   * @returns Respuesta con la hora del servidor en UTC
   */
  getServerTimeUtc: (): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>("/api/v1/rh/time/utc"),

  /**
   * Obtiene la hora actual del servidor para una zona horaria específica
   * @param timeZoneId Zona horaria (ej. "America/New_York")
   * @returns Respuesta con la hora del servidor en la zona horaria especificada
   */
  getTimeByTimeZone: (timeZoneId: string): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>(`/api/v1/rh/time/timezone/${timeZoneId}`),

  /**
   * Health check del servicio de tiempo
   * @returns Respuesta de health check
   */
  health: (): Promise<ApiResponse<any>> =>
    apiFetch<any>("/api/v1/rh/time/health")
};

// =============================================================================
// Servicios para VwEmployeeDetails (Vista de Detalles de Empleados)
// =============================================================================

export const VistaDetallesEmpleadosAPI = {
  ...createApiService<any, any>("/api/v1/rh/vw/EmployeeDetails"),
  
  /**
   * Obtiene un empleado por email
   * @param email Email del empleado
   * @returns Detalles del empleado
   */
  byEmail: (email: string): Promise<ApiResponse<any>> => 
    apiFetch<any>(`/api/v1/rh/vw/EmployeeDetails/email/${email}`),
  
  /**
   * Obtiene empleados por departamento
   * @param departmentName Nombre del departamento
   * @returns Lista de empleados del departamento
   */
  byDepartment: (departmentName: string): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/department/${departmentName}`),
  
  /**
   * Obtiene empleados por facultad
   * @param facultyName Nombre de la facultad
   * @returns Lista de empleados de la facultad
   */
  byFaculty: (facultyName: string): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/faculty/${facultyName}`),
  
  /**
   * Obtiene empleados por tipo
   * @param employeeType Tipo de empleado (número)
   * @returns Lista de empleados del tipo especificado
   */
  byType: (employeeType: number): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/type/${employeeType}`),
  
  /**
   * Obtiene los tipos de empleados disponibles
   * @returns Lista de tipos de empleados
   */
  getAvailableTypes: (): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>("/api/v1/rh/vw/EmployeeDetails/available/types"),
  
  /**
   * Obtiene los departamentos disponibles
   * @returns Lista de departamentos
   */
  getAvailableDepartments: (): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>("/api/v1/rh/vw/EmployeeDetails/available/departments"),
  
  /**
   * Obtiene las facultades disponibles
   * @returns Lista de facultades
   */
  getAvailableFaculties: (): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>("/api/v1/rh/vw/EmployeeDetails/available/faculties")
};

// Interface para la respuesta de tiempo
export interface TimeResponse {
  dateTime: string;
  timestamp: number;
  timeZone?: string;
  formattedTime?: string;
  isUtc: boolean;
  serverName?: string;
}

// Endpoint raíz del sistema
export const SistemaAPI = {
  /**
   * Obtiene información del sistema
   * @returns Información del sistema
   */
  info: (): Promise<ApiResponse<any>> => 
    apiFetch<any>("/api/v1/rh/"),
  
  /**
   * Verifica el estado de salud del sistema
   * @returns Estado de salud
   */
  health: (): Promise<ApiResponse<any>> => 
    apiFetch<any>("/api/v1/rh/health")
};

// =============================================================================
// Servicios CRUD con tipos genéricos
// =============================================================================

export const DireccionesAPI = createApiService<any, any>("/api/v1/rh/cv/addresses");
export const CalculosAsistenciaAPI = createApiService<any, any>("/api/v1/rh/attendance/calculations");
export const AuditoriaAPI = createApiService<any, any>("/api/v1/rh/audit");
export const CuentasBancariasAPI = createApiService<any, any>("/api/v1/rh/cv/bank-accounts");
export const LibrosAPI = createApiService<any, any>("/api/v1/rh/cv/books");
export const CantonesAPI = createApiService<any, any>("/api/v1/rh/geo/cantons");
export const EnfermedadesCatastroficasAPI = createApiService<any, any>("/api/v1/rh/cv/catastrophic-illnesses");
export const PaisesAPI = createApiService<any, any>("/api/v1/rh/geo/countries");
export const DepartamentosAPI = createApiService<any, any>("/api/v1/rh/departments");
export const NivelesEducativosAPI = createApiService<any, any>("/api/v1/rh/cv/education-levels");
export const ContactosEmergenciaAPI = createApiService<any, any>("/api/v1/rh/cv/emergency-contacts");
export const HorariosEmpleadosAPI = createApiService<any, any>("/api/v1/rh/employee-schedules");
export const EmpleadosAPI = createApiService<any, any>("/api/v1/rh/employees");
export const FacultadesAPI = createApiService<any, any>("/api/v1/rh/faculties");
export const CargasFamiliaresAPI = createApiService<any, any>("/api/v1/rh/cv/family-burden");
export const InstitucionesAPI = createApiService<any, any>("/api/v1/rh/cv/institutions");
export const HorasExtrasAPI = createApiService<any, any>("/api/v1/rh/overtime");
export const NominaAPI = createApiService<any, any>("/api/v1/rh/payroll");
export const LineasNominaAPI = createApiService<any, any>("/api/v1/rh/payroll-lines");
export const TiposPermisosAPI = createApiService<any, any>("/api/v1/rh/permission-types");
export const MovimientosPersonalAPI = createApiService<any, any>("/api/v1/rh/personnel-movements");
export const ProvinciasAPI = createApiService<any, any>("/api/v1/rh/geo/provinces");
export const JustificacionesMarcacionesAPI = createApiService<any, any>("/api/v1/rh/attendance/punch-justifications");
export const HistorialSalarialAPI = createApiService<any, any>("/api/v1/rh/salary-history");
export const HorariosAPI = createApiService<any, any>("/api/v1/rh/schedules");
export const SubrogacionesAPI = createApiService<any, any>("/api/v1/rh/subrogations");
export const RegistrosRecuperacionTiempoAPI = createApiService<any, any>("/api/v1/rh/time-recovery/logs");
export const PlanesRecuperacionTiempoAPI = createApiService<any, any>("/api/v1/rh/time-recovery/plans");
export const CapacitacionesAPI = createApiService<any, any>("/api/v1/rh/cv/trainings");
export const ExperienciasLaboralesAPI = createApiService<any, any>("/api/v1/rh/cv/work-experiences");
export const CargosAPI = createApiService<any, any>("/api/v1/rh/jobs");

// =============================================================================
// API utilitaria para llamadas directas
// =============================================================================

/**
 * Utilidad para realizar llamadas API directamente sin usar los servicios CRUD
 */
export const api = {
  /**
   * Realiza una solicitud GET
   * @param path Ruta del endpoint
   * @returns Respuesta API
   */
  get: <T>(path: string): Promise<ApiResponse<T>> => 
    apiFetch<T>(path),
  
  /**
   * Realiza una solicitud POST
   * @param path Ruta del endpoint
   * @param data Datos a enviar
   * @returns Respuesta API
   */
  post: <T>(path: string, data: any): Promise<ApiResponse<T>> => 
    apiFetch<T>(path, { 
      method: "POST", 
      body: JSON.stringify(data) 
    }),
  
  /**
   * Realiza una solicitud PUT
   * @param path Ruta del endpoint
   * @param data Datos a enviar
   * @returns Respuesta API
   */
  put: <T>(path: string, data: any): Promise<ApiResponse<T>> => 
    apiFetch<T>(path, { 
      method: "PUT", 
      body: JSON.stringify(data) 
    }),
  
  /**
   * Realiza una solicitud PATCH
   * @param path Ruta del endpoint
   * @param data Datos a enviar
   * @returns Respuesta API
   */
  patch: <T>(path: string, data: any): Promise<ApiResponse<T>> => 
    apiFetch<T>(path, { 
      method: "PATCH", 
      body: JSON.stringify(data) 
    }),
  
  /**
   * Realiza una solicitud DELETE
   * @param path Ruta del endpoint
   * @returns Respuesta API
   */
  delete: <T = void>(path: string): Promise<ApiResponse<T>> => 
    apiFetch<T>(path, { 
      method: "DELETE" 
    })
};

// =============================================================================
// Utilidades adicionales
// =============================================================================

/**
 * Maneja errores de API de manera consistente
 * @param error Respuesta de error de la API
 * @param defaultMessage Mensaje por defecto si no hay detalles
 * @returns Mensaje de error para mostrar al usuario
 */
export function handleApiError(
  error: ApiError, 
  defaultMessage = "Ocurrió un error inesperado"
): string {
  if (error.details?.message) {
    return error.details.message;
  }
  
  if (error.details?.error) {
    return error.details.error;
  }
  
  if (typeof error.details === 'string') {
    return error.details;
  }
  
  return defaultMessage;
}

/**
 * Interceptor para añadir token de autenticación a las solicitudes
 * @param token Token de autenticación
 */
export function setAuthToken(token: string): void {
  API_CONFIG.DEFAULT_HEADERS = {
    ...API_CONFIG.DEFAULT_HEADERS,
    "Authorization": `Bearer ${token}`
  };
}