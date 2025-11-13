// src/lib/api.ts
import type {
  Person, InsertPerson,
  Contract, InsertContract,
  AttendancePunch, InsertAttendancePunch,
  Permission, InsertPermission,
  Vacation, InsertVacation,
  Publication, InsertPublication
} from '@shared/schema';
import { tokenService } from '@/services/auth';
// ✅ Necesario para el retry 401
import { authService } from '@/services/auth';

export interface HolidayResponseDTO {
  holidayID: number;
  name: string;
  holidayDate: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

// --------------------------------------------------------------------------
// 🆕 NUEVAS INTERFACES PARA DTOs FALTANTES
// --------------------------------------------------------------------------

export interface AttendanceCalculationRequestDto {
  fromDate: string;
  toDate: string;
  employeeId?: number;
}

export interface PayrollPeriodRequestDto {
  period: string; // Formato YYYY-MM
}

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
  planStatusTypeID: number;
  createdBy: number;
  requiresApproval: boolean;
  employees?: TimePlanningEmployeeCreateDTO[];
}

export interface TimePlanningEmployeeCreateDTO {
  planID: number;
  employeeID: number;
  employeeStatusTypeID?: number;
  assignedHours?: number;
  assignedMinutes?: number;
  actualHours?: number;
  actualMinutes?: number;
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

export interface FileUploadResponseDto {
  success: boolean;
  message?: string;
  fullPath?: string;
  relativePath?: string;
  fileName?: string;
  fileSize: number;
  year: number;
}

export interface FileDeleteResponseDto {
  success: boolean;
  message?: string;
  filePath?: string;
}

// --------------------------------------------------------------------------
// CONFIGURACIÓN CENTRALIZADA (EXISTENTE)
// --------------------------------------------------------------------------

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE || "http://localhost:5000",
  AUTH_BASE_URL: import.meta.env.VITE_AUTH_API_BASE || "http://localhost:5010",
  FILES_BASE_URL: import.meta.env.VITE_FILES_API_BASE || "http://localhost:5000",
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  TIMEOUT: 15000, // 15 segundos
  CREDENTIALS: "include" as RequestCredentials
};

// --------------------------------------------------------------------------
// TIPOS Y ESTRUCTURAS (EXISTENTES)
// --------------------------------------------------------------------------

export type ApiResponse<T> =
  | { status: 'success'; data: T; }
  | { status: 'error'; error: ApiError; };

export interface ApiError {
  code: number;
  message: string;
  details?: any;
}

// --------------------------------------------------------------------------
// Helpers: selección de host, body FormData, apiFetch con token y refresh
// --------------------------------------------------------------------------

function resolveBaseUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p.startsWith('/api/v1/rh/files')) return API_CONFIG.FILES_BASE_URL;
  if (p.startsWith('/api/auth') || p.startsWith('/api/app-auth')) return API_CONFIG.AUTH_BASE_URL;
  return API_CONFIG.BASE_URL;
}

function isFormDataBody(body: any): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

// --------------------------------------------------------------------------
// FUNCIÓN PRINCIPAL API FETCH (CORREGIDA: baseUrl + debug + retry import)
// --------------------------------------------------------------------------

export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {},
  _retry = false
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  const DEBUG_API = import.meta.env.VITE_API_DEBUG === 'true';
  const baseUrl = resolveBaseUrl(path);
  const accessToken = tokenService.getAccessToken();

  const headers: Record<string, string> = {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...(init.headers as Record<string, string> | undefined)
  };

  // Si es FormData, no forzar JSON ni boundary
  if (isFormDataBody(init.body)) {
    delete headers['Content-Type'];
  }

  // Agregar Authorization si hay token
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (DEBUG_API) {
    const method = (init.method || "GET").toUpperCase();
    console.groupCollapsed(`🌐 API REQUEST → ${method} ${path}`);
    console.log("Authorization:", accessToken ? `Bearer ${accessToken.substring(0, 10)}...` : "(sin token)");
    console.log("Headers:", headers);
    if (init.body) {
      if (isFormDataBody(init.body)) {
        console.log("Body: FormData");
      } else {
        try {
          const parsed = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
          console.log("Body:", parsed);
        } catch {
          console.log("Body (raw):", init.body);
        }
      }
    }
    console.groupEnd();
  }

  try {
    // ✅ Usar baseUrl resuelto (antes se usaba BASE_URL fijo)
    const response = await fetch(`${baseUrl}${path}`, {
      credentials: API_CONFIG.CREDENTIALS,
      headers,
      ...init,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (DEBUG_API) {
      console.groupCollapsed(`⬅️ API RESPONSE ${response.status} ${path}`);
      console.log("Status:", response.status, response.statusText);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));
      console.groupEnd();
    }

    // Reintento (una vez) en 401 con refreshToken
    if (response.status === 401 && !_retry) {
      try {
        const rt = tokenService.getRefreshToken();
        if (rt) {
          const newTokens = await authService.refreshToken(rt);
          tokenService.setTokens(newTokens);
          return apiFetch<T>(path, init, true);
        }
      } catch {
        // sigue como error normal
      }
    }

    if (response.ok) {
      if (response.status === 204) {
        return { status: "success", data: undefined as unknown as T };
      }
      // Si no es JSON devolvemos blob/texto
      const ct = response.headers.get('content-type') || '';
      if (ct && !ct.includes('application/json')) {
        const blob = await response.blob();
        // @ts-expect-error: T puede ser Blob
        return { status: "success", data: blob as T };
      }
      try {
        const data = await response.json();
        if (DEBUG_API) console.log("✅ Data:", data);
        return { status: "success", data };
      } catch {
        const text = await response.text();
        if (DEBUG_API) console.log("📝 Text:", text);
        return { status: "success", data: text as unknown as T };
      }
    }

    let errorDetails: any;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = await response.text();
    }

    if (DEBUG_API) {
      console.groupCollapsed(`❌ API ERROR ${response.status} ${path}`);
      console.log(errorDetails);
      console.groupEnd();
    }

    return {
      status: "error",
      error: {
        code: response.status,
        message: `HTTP Error ${response.status}: ${response.statusText}`,
        details: errorDetails
      }
    };

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (DEBUG_API) console.error("🚨 Network/Timeout Error:", error);
    return {
      status: "error",
      error: {
        code: 0,
        message: error.name === "AbortError" ? "Request timed out" : `Network error: ${error.message || "Unknown error"}`
      }
    };
  }
}

// --------------------------------------------------------------------------
// FÁBRICA DE SERVICIOS CRUD (EXISTENTE - SIN CAMBIOS)
// --------------------------------------------------------------------------

export function createApiService<Resource, CreateDTO, UpdateDTO = Partial<Resource>>(
  endpoint: string
) {
  return {
    list: (): Promise<ApiResponse<Resource[]>> =>
      apiFetch<Resource[]>(endpoint),

    get: (id: number | string): Promise<ApiResponse<Resource>> =>
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
      apiFetch<void>(`${endpoint}/${id}`, {
        method: "DELETE"
      })
  };
}

// --------------------------------------------------------------------------
// 🆕 SERVICIOS FALTANTES - CÁLCULOS Y PROCESOS
// --------------------------------------------------------------------------

/**
 * 🆕 Servicio para cálculos de asistencia
 */
export const AttendanceCalculationAPI = {
  /**
   * Ejecuta el cálculo masivo de asistencia para un rango de fechas
   */
  calculateRange: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/attendance/calculate-range', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  /**
   * Calcula los minutos nocturnos trabajados para un rango de fechas
   */
  calculateNightMinutes: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/attendance/calc-night-minutes', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

/**
 * 🆕 Servicio para justificaciones
 */
export const JustificationsAPI = {
  ...createApiService<any, any>("/api/v1/rh/cv/justifications"),
  /**
   * Aplica justificaciones aprobadas para anular atrasos o ausencias
   */
  applyJustifications: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/justifications/apply', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/justifications/employeeid/${employeeId}`),

  getByBossId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/justifications/bossId/${employeeId}`)
};

/**
 * 🆕 Servicio para cálculo de precio de horas extra
 */
export const OvertimePriceAPI = {
  /**
   * Calcula el precio de las horas extra para un período específico
   */
  calculateOvertimePrice: (data: PayrollPeriodRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/overtime/price', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

/**
 * 🆕 Servicio para cálculo de descuentos de nómina
 */
export const PayrollDiscountsAPI = {
  /**
   * Calcula los descuentos por atrasos y ausencias para un período de nómina
   */
  calculateDiscounts: (data: PayrollPeriodRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/payroll/discounts', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

/**
 * 🆕 Servicio para cálculo de subsidios de nómina
 */
export const PayrollSubsidiesAPI = {
  /**
   * Calcula los subsidios y recargos (nocturnos/feriados) para un período de nómina
   */
  calculateSubsidies: (data: PayrollPeriodRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/payroll/subsidies', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

/**
 * 🆕 Servicio para recuperación de tiempo
 */
export const RecoveryAPI = {
  /**
   * Consolida recuperaciones de tiempo para restar deuda de minutos adeudados
   */
  applyRecovery: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/recovery/apply', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

// --------------------------------------------------------------------------
// 🆕 SISTEMA COMPLETO DE PLANIFICACIÓN DE TIEMPO
// --------------------------------------------------------------------------

/**
 * 🆕 Servicio para empleados en planificación de tiempo
 */
export const TimePlanningEmployeesAPI = {
  /**
   * Lista todos los empleados de una planificación
   */
  getByPlan: (planId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees/by-plan/${planId}`),

  /**
   * Obtiene un empleado de planificación por ID
   */
  getById: (planId: number, id: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees/${planId}/${id}`),

  /**
   * Actualiza un empleado en la planificación
   */
  update: (planId: number, id: number, data: TimePlanningEmployeeUpdateDTO): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees/${planId}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  /**
   * Elimina un empleado de la planificación
   */
  remove: (planId: number, id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/rh/planning/employees/${planId}/${id}`, {
      method: 'DELETE'
    }),

  /**
   * Agrega un empleado a la planificación
   */
  addEmployee: (planId: number, data: TimePlanningEmployeeCreateDTO): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees?planId=${planId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

/**
 * 🆕 Servicio para ejecuciones de planificación de tiempo
 */
export const TimePlanningExecutionsAPI = {
  /**
   * Lista todas las ejecuciones de un empleado en planificación
   */
  getByPlanEmployee: (planEmployeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/${planEmployeeId}/executions`),

  /**
   * Registra tiempo de trabajo
   */
  registerWorkTime: (planEmployeeId: number, data: TimePlanningExecutionCreateDTO): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/${planEmployeeId}/executions`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  /**
   * Obtiene una ejecución por ID
   */
  getById: (planEmployeeId: number, id: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/${planEmployeeId}/executions/${id}`),

  /**
   * Actualiza una ejecución
   */
  update: (planEmployeeId: number, id: number, data: TimePlanningExecutionUpdateDTO): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/${planEmployeeId}/executions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  /**
   * Elimina una ejecución
   */
  remove: (planEmployeeId: number, id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/rh/planning/${planEmployeeId}/executions/${id}`, {
      method: 'DELETE'
    })
};

/**
 * 🆕 Servicio para planificaciones de tiempo
 */
export const TimePlanningsAPI = {
  ...createApiService<any, TimePlanningCreateDTO>("/api/v1/rh/planning/timePlannings"),

  /**
   * Obtiene planificaciones por empleado
   */
  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/timePlannings/employee/${employeeId}`),

  /**
   * Obtiene planificaciones por estado
   */
  getByStatus: (statusTypeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/timePlannings/status/${statusTypeId}`)
};

// --------------------------------------------------------------------------
// 🆕 VISTAS Y REPORTES FALTANTES
// --------------------------------------------------------------------------

/**
 * 🆕 Servicio para vista de días de asistencia
 */
export const VwAttendanceDayAPI = {
  /**
   * Lista todos los días de asistencia esperados vs trabajados
   */
  getAll: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/vw-attendance-day'),

  /**
   * Obtiene asistencia por ID de empleado
   */
  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-attendance-day/by-employee/${employeeId}`),

  /**
   * Obtiene asistencia por rango de fechas
   */
  getByDateRange: (fromDate: string, toDate: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-attendance-day/by-date-range?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`)
};

/**
 * 🆕 Servicio para vista de horarios de empleados por fecha
 */
export const VwEmployeeScheduleAtDateAPI = {
  /**
   * Lista todos los horarios de empleados por fecha
   */
  getAll: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/vw-employee-schedule-at-date'),

  /**
   * Obtiene horarios por ID de empleado
   */
  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-employee-schedule-at-date/by-employee/${employeeId}`),

  /**
   * Obtiene horarios por fecha específica
   */
  getByDate: (date: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-employee-schedule-at-date/by-date?date=${encodeURIComponent(date)}`)
};

/**
 * 🆕 Servicio para vista de ventanas de ausencias
 */
export const VwLeaveWindowsAPI = {
  /**
   * Lista todas las ventanas de ausencias justificadas
   */
  getAll: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/vw-leave-windows'),

  /**
   * Obtiene ausencias por ID de empleado
   */
  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-leave-windows/by-employee/${employeeId}`),

  /**
   * Obtiene ausencias por tipo
   */
  getByLeaveType: (leaveType: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-leave-windows/by-type/${leaveType}`)
};

/**
 * 🆕 Servicio para vista de picadas diarias
 */
export const VwPunchDayAPI = {
  /**
   * Lista todas las picadas diarias
   */
  getAll: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/vw-punch-day'),

  /**
   * Obtiene picadas por ID de empleado
   */
  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-punch-day/by-employee/${employeeId}`),

  /**
   * Obtiene picadas por rango de fechas
   */
  getByDateRange: (fromDate: string, toDate: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/vw-punch-day/by-date-range?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`)
};

// --------------------------------------------------------------------------
// SERVICIOS DE AUTENTICACIÓN (EXISTENTES - SIN CAMBIOS DE INTERFAZ)
// --------------------------------------------------------------------------

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
}

export const AuthAPI = {
  login: (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  refresh: (refreshRequest: RefreshRequest): Promise<ApiResponse<LoginResponse>> =>
    apiFetch<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(refreshRequest)
    }),

  getCurrentUser: (): Promise<ApiResponse<UserInfo>> =>
    apiFetch<UserInfo>('/api/auth/me'),

  validateToken: (validateRequest: ValidateTokenRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/auth/validate-token', {
      method: 'POST',
      body: JSON.stringify(validateRequest)
    }),

  getAzureAuthUrl: (clientId?: string): Promise<ApiResponse<AzureAuthUrlResponse>> => {
    const queryParams = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
    return apiFetch<AzureAuthUrlResponse>(`/api/auth/azure/url${queryParams}`);
  },

  azureCallback: (code: string, state: string): Promise<ApiResponse<LoginResponse>> => {
    const queryParams = `?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    return apiFetch<LoginResponse>(`/api/auth/azure/callback${queryParams}`);
  }
};

export const AppAuthAPI = {
  getToken: (authRequest: AppAuthRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/app-auth/token', {
      method: 'POST',
      body: JSON.stringify(authRequest)
    }),

  legacyLogin: (authRequest: LegacyAuthRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/app-auth/legacy-login', {
      method: 'POST',
      body: JSON.stringify(authRequest)
    }),

  validateToken: (validateRequest: ValidateTokenRequest): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/app-auth/validate-token', {
      method: 'POST',
      body: JSON.stringify(validateRequest)
    }),

  getStats: (clientId: string): Promise<ApiResponse<StatsResponse>> =>
    apiFetch<StatsResponse>(`/api/app-auth/stats/${clientId}`)
};

// --------------------------------------------------------------------------
// SERVICIOS ESPECÍFICOS EXISTENTES (SIN CAMBIOS EN LÓGICA)
// --------------------------------------------------------------------------

// Personas API
export const PersonasAPI = createApiService<Person, InsertPerson>("/api/v1/rh/people");

// Contratos API
export const ContratosAPI = createApiService<Contract, InsertContract>("/api/v1/rh/contracts");

// Marcaciones API
export const MarcacionesAPI = createApiService<AttendancePunch, InsertAttendancePunch>("/api/v1/rh/attendance/punches");

// Permisos API
export const PermisosAPI = {
  ...createApiService<Permission, InsertPermission>("/api/v1/rh/permissions"),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/permissions/employee/${employeeId}`),
  getByBossId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/permissions/bossId/${employeeId}`)
};

// Vacaciones API
export const VacacionesAPI = {
  ...createApiService<Vacation, InsertVacation>("/api/v1/rh/vacations"),
  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/vacations/employee/${employeeId}`),
  getByBossId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/vacations/bossId/${employeeId}`)
};

// Publicaciones API
export const PublicacionesAPI = createApiService<Publication, InsertPublication>("/api/v1/rh/cv/publications");

// Health Check API
export const HealthAPI = {
  check: (): Promise<ApiResponse<{ status: string }>> =>
    apiFetch<{ status: string }>("/health")
};

// Tipos de Referencia API
export const TiposReferenciaAPI = {
  ...createApiService<any, any>("/api/v1/rh/ref/types"),
  byCategory: (category: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/ref/types/category/${category}`)
};

// Servicios especializados para AttendancePunches
export const MarcacionesEspecializadasAPI = {
  getLastPunch: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/attendance/punches/last-punch/${employeeId}`),

  getTodayPunches: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/attendance/punches/today/${employeeId}`),

  getPunchesByEmployeeAndDateRange: (
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(
      `/api/v1/rh/attendance/punches/employee/${employeeId}/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    ),

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
  getActiveJobs: (): Promise<ApiResponse<any>> =>
    apiFetch<any>("/api/v1/rh/jobs/active"),

  searchJobs: (title: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/jobs/search?title=${encodeURIComponent(title)}`)
};

// Configuración Horas Extras API
export const ConfigHorasExtrasAPI = {
  ...createApiService<any, any>("/api/v1/rh/overtime/config"),
};

// Vistas de Empleados (VwEmployees)
export const VistaEmpleadosAPI = {
  ...createApiService<any, any>("/api/v1/rh/vw/EmployeeComplete"),
  byDepartment: (department: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeComplete/department/${department}`)
};

// Servicios para Time API
export const TimeAPI = {
  getServerTime: (): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>("/api/v1/rh/time"),

  getServerTimeUtc: (): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>("/api/v1/rh/time/utc"),

  getTimeByTimeZone: (timeZoneId: string): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>(`/api/v1/rh/time/timezone/${timeZoneId}`),

  health: (): Promise<ApiResponse<any>> =>
    apiFetch<any>("/api/v1/rh/time/health")
};

// Vistas de Detalles de Empleados
export const VistaDetallesEmpleadosAPI = {
  ...createApiService<any, any>("/api/v1/rh/vw/EmployeeDetails"),

  byEmail: (email: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/vw/EmployeeDetails/email/${email}`),

  byDepartment: (departmentName: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/department/${departmentName}`),

  byFaculty: (facultyName: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/faculty/${facultyName}`),

  byType: (employeeType: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/type/${employeeType}`),

  getAvailableTypes: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>("/api/v1/rh/vw/EmployeeDetails/available/types"),

  getAvailableDepartments: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>("/api/v1/rh/vw/EmployeeDetails/available/departments"),

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
  info: (): Promise<ApiResponse<any>> =>
    apiFetch<any>("/api/v1/rh/"),

  health: (): Promise<ApiResponse<any>> =>
    apiFetch<any>("/api/v1/rh/health")
};

// Directory Parameters API
export const DirectoryParametersAPI = {
  ...createApiService<any, any>("/api/v1/rh/cv/directory-parameters"),

  getByCode: (code: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/directory-parameters/by-code/${code}`)
};

// Holidays API
export const HolidaysAPI = {
  ...createApiService<HolidayResponseDTO, any>("/api/v1/rh/holiday"),

  getByYear: (year: number): Promise<ApiResponse<HolidayResponseDTO[]>> =>
    apiFetch<HolidayResponseDTO[]>(`/api/v1/rh/holiday/year/${year}`),

  getActive: (): Promise<ApiResponse<HolidayResponseDTO[]>> =>
    apiFetch<HolidayResponseDTO[]>("/api/v1/rh/holiday/active"),

  isHoliday: (date: string): Promise<ApiResponse<boolean>> =>
    apiFetch<boolean>(`/api/v1/rh/holiday/check/${date}`)
};

// --------------------------------------------------------------------------
// SERVICIOS CRUD EXISTENTES (SIN CAMBIOS)
// --------------------------------------------------------------------------

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
//export const JustificacionesMarcacionesAPI = createApiService<any, any>("/api/v1/rh/attendance/punch-justifications");
export const HistorialSalarialAPI = createApiService<any, any>("/api/v1/rh/salary-history");
export const HorariosAPI = createApiService<any, any>("/api/v1/rh/schedules");
export const SubrogacionesAPI = createApiService<any, any>("/api/v1/rh/subrogations");
export const RegistrosRecuperacionTiempoAPI = createApiService<any, any>("/api/v1/rh/time-recovery/logs");
export const PlanesRecuperacionTiempoAPI = createApiService<any, any>("/api/v1/rh/time-recovery/plans");
export const CapacitacionesAPI = createApiService<any, any>("/api/v1/rh/cv/trainings");
export const ExperienciasLaboralesAPI = createApiService<any, any>("/api/v1/rh/cv/work-experiences");
export const CargosAPI = createApiService<any, any>("/api/v1/rh/jobs");
export const ContractRequestAPI = createApiService<any, any>("/api/v1/rh/cv/contract-request");
export const FinancialCertificationAPI = createApiService<any, any>("/api/v1/rh/financial-certification");
export const ParametersAPI = createApiService<any, any>("/api/v1/rh/cv/parameters");
export const ActivityAPI = createApiService<any, any>("/api/v1/rh/activity");
export const AdditionalActivityAPI = createApiService<any, any>("/api/v1/rh/additional-activity");
export const ContractTypeAPI = createApiService<any, any>("/api/v1/rh/contract-type");
export const DegreeAPI = createApiService<any, any>("/api/v1/rh/degree");
export const JobActivityAPI = createApiService<any, any>("/api/v1/rh/job-activity");
export const OccupationalGroupAPI = createApiService<any, any>("/api/v1/rh/occupational-group");

// --------------------------------------------------------------------------
// 🆕 MEJORAS EN FILE MANAGEMENT API (corregido uso de FILES_BASE_URL)
// --------------------------------------------------------------------------

export const FileManagementAPI = {
  /**
   * Sube un archivo al servidor
   */
  // uploadFile: (formData: FormData): Promise<ApiResponse<FileUploadResponseDto>> =>
  //   apiFetch<FileUploadResponseDto>("/api/v1/rh/files/upload", {
  //     method: "POST",
  //     body: formData,
  //     headers: {
  //       // NO fijar Content-Type aquí - se detectará automáticamente
  //     }
  //   }),

  // /**
  //  * Sube múltiples archivos al servidor
  //  */
  // uploadMultipleFiles: (formData: FormData): Promise<ApiResponse<FileUploadResponseDto[]>> =>
  //   apiFetch<FileUploadResponseDto[]>("/api/v1/rh/files/upload-multiple", {
  //     method: "POST",
  //     body: formData,
  //     headers: {
  //       // NO fijar Content-Type aquí
  //     }
  //   }),
  uploadFile: async (formData: FormData): Promise<ApiResponse<FileUploadResponseDto>> => {
    const url = `${API_CONFIG.FILES_BASE_URL}/api/v1/rh/files/upload`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        body: formData,               // NO poner Content-Type
        headers: {
          "Accept": "application/json",
          ...(tokenService.getAccessToken()
            ? { "Authorization": `Bearer ${tokenService.getAccessToken()}` }
            : {})
        },
        credentials: API_CONFIG.CREDENTIALS
      });

      if (!resp.ok) {
        let details: any = undefined;
        try { details = await resp.json(); } catch { details = await resp.text(); }
        return {
          status: "error",
          error: {
            code: resp.status,
            message: details?.message || `HTTP Error ${resp.status}`,
            details
          }
        };
      }

      const data = await resp.json();
      return { status: "success", data };
    } catch (e: any) {
      return { status: "error", error: { code: 0, message: e?.message || "Network error" } };
    }
  },

  // Sube múltiples archivos (mismo patrón)
  uploadMultipleFiles: async (formData: FormData): Promise<ApiResponse<FileUploadResponseDto[]>> => {
    const url = `${API_CONFIG.FILES_BASE_URL}/api/v1/rh/files/upload-multiple`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          "Accept": "application/json",
          ...(tokenService.getAccessToken()
            ? { "Authorization": `Bearer ${tokenService.getAccessToken()}` }
            : {})
        },
        credentials: API_CONFIG.CREDENTIALS
      });

      if (!resp.ok) {
        let details: any = undefined;
        try { details = await resp.json(); } catch { details = await resp.text(); }
        return {
          status: "error",
          error: {
            code: resp.status,
            message: details?.message || `HTTP Error ${resp.status}`,
            details
          }
        };
      }

      const data = await resp.json();
      return { status: "success", data };
    } catch (e: any) {
      return { status: "error", error: { code: 0, message: e?.message || "Network error" } };
    }
  },


  /**
   * Descarga un archivo del servidor
   */
  downloadFile: async (directoryCode: string, filePath: string): Promise<ApiResponse<Blob>> => {
    const url = `${API_CONFIG.FILES_BASE_URL}/api/v1/rh/files/download/${encodeURIComponent(directoryCode)}?filePath=${encodeURIComponent(filePath)}`;
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
        return {
          status: "error",
          error: {
            code: resp.status,
            message: text || `HTTP Error ${resp.status}`,
            details: text
          }
        };
      }

      const blob = await resp.blob();
      return { status: "success", data: blob };
    } catch (e: any) {
      return {
        status: "error",
        error: { code: 0, message: e?.message || "Network error" }
      };
    }
  },

  /**
   * Verifica si un archivo existe
   */
  fileExists: (directoryCode: string, filePath: string): Promise<ApiResponse<boolean>> =>
    apiFetch<boolean>(`/api/v1/rh/files/exists/${encodeURIComponent(directoryCode)}?filePath=${encodeURIComponent(filePath)}`),

  /**
   * Elimina un archivo del servidor
   */
  deleteFile: (directoryCode: string, filePath: string): Promise<ApiResponse<FileDeleteResponseDto>> =>
    apiFetch<FileDeleteResponseDto>(`/api/v1/rh/files/delete/${encodeURIComponent(directoryCode)}?filePath=${encodeURIComponent(filePath)}`, {
      method: "DELETE"
    })
};

// --------------------------------------------------------------------------
// API UTILITARIA Y UTILIDADES (EXISTENTES - SIN CAMBIOS)
// --------------------------------------------------------------------------

export const api = {
  get: <T>(path: string): Promise<ApiResponse<T>> =>
    apiFetch<T>(path),

  post: <T>(path: string, data: any): Promise<ApiResponse<T>> =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  put: <T>(path: string, data: any): Promise<ApiResponse<T>> =>
    apiFetch<T>(path, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  patch: <T>(path: string, data: any): Promise<ApiResponse<T>> =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  delete: <T = void>(path: string): Promise<ApiResponse<T>> =>
    apiFetch<T>(path, {
      method: "DELETE"
    })
};

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

export function setAuthToken(token: string): void {
  API_CONFIG.DEFAULT_HEADERS = {
    ...API_CONFIG.DEFAULT_HEADERS,
    "Authorization": `Bearer ${token}`
  };
}

// --------------------------------------------------------------------------
// SERVICIOS DE GESTIÓN DE AUTENTICACIÓN, USUARIOS, ROLES Y MENÚS (EXISTENTES)
// --------------------------------------------------------------------------

import type {
  User, Role, UserRole, MenuItem, RoleMenuItem,
  CreateUserDto, UpdateUserDto,
  CreateRoleDto, UpdateRoleDto,
  CreateUserRoleDto, UpdateUserRoleDto,
  CreateMenuItemDto, UpdateMenuItemDto,
  CreateRoleMenuItemDto, UpdateRoleMenuItemDto,
  ChangePasswordDto, ChangePasswordResponse
} from '@/types/auth';

// (Bloque de APIs comentadas se mantiene sin cambios)
/*
// export const AuthUsersAPI = { ... };
// export const RolesAPI = { ... };
// export const UserRolesAPI = { ... };
// export const MenuItemsAPI = { ... };
// export const RoleMenuItemsAPI = { ... };
// export const PasswordAPI = { ... };
*/


// export const AuthUsersAPI = {
//   list: (page = 1, size = 100): Promise<ApiResponse<User[]>> =>
//     apiFetch<User[]>(`/api/users?page=${page}&size=${size}`),

//   get: (id: string): Promise<ApiResponse<User>> =>
//     apiFetch<User>(`/api/users/${id}`),

//   create: (data: CreateUserDto): Promise<ApiResponse<User>> =>
//     apiFetch<User>('/api/users', {
//       method: 'POST',
//       body: JSON.stringify(data)
//     }),

//   update: (id: string, data: UpdateUserDto): Promise<ApiResponse<User>> =>
//     apiFetch<User>(`/api/users/${id}`, {
//       method: 'PUT',
//       body: JSON.stringify(data)
//     }),

//   remove: (id: string): Promise<ApiResponse<void>> =>
//     apiFetch<void>(`/api/users/${id}`, {
//       method: 'DELETE'
//     })
// };

// export const RolesAPI = {
//   list: (page = 1, size = 100): Promise<ApiResponse<Role[]>> =>
//     apiFetch<Role[]>(`/api/roles?page=${page}&size=${size}`),

//   get: (id: number): Promise<ApiResponse<Role>> =>
//     apiFetch<Role>(`/api/roles/${id}`),

//   create: (data: CreateRoleDto): Promise<ApiResponse<Role>> =>
//     apiFetch<Role>('/api/roles', {
//       method: 'POST',
//       body: JSON.stringify(data)
//     }),

//   update: (id: number, data: UpdateRoleDto): Promise<ApiResponse<Role>> =>
//     apiFetch<Role>(`/api/roles/${id}`, {
//       method: 'PUT',
//       body: JSON.stringify(data)
//     }),

//   remove: (id: number): Promise<ApiResponse<void>> =>
//     apiFetch<void>(`/api/roles/${id}`, {
//       method: 'DELETE'
//     })
// };uploadFile

// export const UserRolesAPI = {
//   list: (page = 1, size = 100): Promise<ApiResponse<UserRole[]>> =>
//     apiFetch<UserRole[]>(`/api/user-roles?page=${page}&size=${size}`),

//   get: (userId: string, roleId: number, assignedAt: string): Promise<ApiResponse<UserRole>> =>
//     apiFetch<UserRole>(`/api/user-roles/${userId}/${roleId}/${assignedAt}`),

//   create: (data: CreateUserRoleDto): Promise<ApiResponse<UserRole>> =>
//     apiFetch<UserRole>('/api/user-roles', {
//       method: 'POST',
//       body: JSON.stringify(data)
//     }),

//   remove: (userId: string, roleId: number, assignedAt: string): Promise<ApiResponse<void>> =>
//     apiFetch<void>(`/api/user-roles/${userId}/${roleId}/${assignedAt}`, {
//       method: 'DELETE'
//     })
// };

// export const MenuItemsAPI = {
//   list: (page = 1, size = 100): Promise<ApiResponse<MenuItem[]>> =>
//     apiFetch<MenuItem[]>(`/api/menu-items?page=${page}&size=${size}`),

//   get: (id: number): Promise<ApiResponse<MenuItem>> =>
//     apiFetch<MenuItem>(`/api/menu-items/${id}`),

//   create: (data: CreateMenuItemDto): Promise<ApiResponse<MenuItem>> =>
//     apiFetch<MenuItem>('/api/menu-items', {
//       method: 'POST',
//       body: JSON.stringify(data)
//     }),

//   update: (id: number, data: UpdateMenuItemDto): Promise<ApiResponse<MenuItem>> =>
//     apiFetch<MenuItem>(`/api/menu-items/${id}`, {
//       method: 'PUT',
//       body: JSON.stringify(data)
//     }),

//   remove: (id: number): Promise<ApiResponse<void>> =>
//     apiFetch<void>(`/api/menu-items/${id}`, {
//       method: 'DELETE'
//     })
// };

// export const RoleMenuItemsAPI = {
//   list: (page = 1, size = 100): Promise<ApiResponse<RoleMenuItem[]>> =>
//     apiFetch<RoleMenuItem[]>(`/api/role-menu-items?page=${page}&size=${size}`),

//   get: (roleId: number, menuItemId: number): Promise<ApiResponse<RoleMenuItem>> =>
//     apiFetch<RoleMenuItem>(`/api/role-menu-items/${roleId}/${menuItemId}`),

//   create: (data: CreateRoleMenuItemDto): Promise<ApiResponse<RoleMenuItem>> =>
//     apiFetch<RoleMenuItem>('/api/role-menu-items', {
//       method: 'POST',
//       body: JSON.stringify(data)
//     }),

//   remove: (roleId: number, menuItemId: number): Promise<ApiResponse<void>> =>
//     apiFetch<void>(`/api/role-menu-items/${roleId}/${menuItemId}`, {
//       method: 'DELETE'
//     })
// };

// export const PasswordAPI = {
//   change: (data: ChangePasswordDto): Promise<ApiResponse<ChangePasswordResponse>> =>
//     apiFetch<ChangePasswordResponse>('/api/auth/change-password', {
//       method: 'POST',
//       body: JSON.stringify(data)
//     })
// };