/**
 * Archivo: src/lib/api/services/people.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - Bloque funcional de identidad organizacional y nucleo del empleado.
 * - Ubicacion recomendada para revisar persona, empleado, departamentos, facultades
 *   y vistas consolidadas de empleados.
 * - El bloque de hoja de vida relacionado se movio a cv.ts.
 */

// src/lib/api/services/employees.ts
import { createApiService } from '../core/pagination';
import type { PagedRequest, PagedResult } from '../core/pagination';
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { BulkVerifyResponse } from '@/types/contractRequestPerson';

// =============================================================================
// DTO de Persona (contrato real del backend)
// =============================================================================

/**
 * Representa el DTO que devuelve el backend en `/api/v1/rh/people`.
 * Coincide con `PeopleDto.cs` del backend.
 *
 * IMPORTANTE: usar este tipo en los componentes en lugar del tipo Drizzle `Person`
 * para evitar el error "Property 'personId' is missing".
 */
export interface PersonDto {
  personId: number;
  firstName: string;
  lastName: string;
  identType: number;
  idCard: string;
  email: string;
  phone?: string | null;
  birthDate?: string | null;
  sex?: number | null;
  gender?: number | null;
  disability?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  maritalStatusTypeId?: number | null;
  militaryCard?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
  countryId?: string | null;
  provinceId?: string | null;
  cantonId?: string | null;
  yearsOfResidence?: number | null;
  ethnicityTypeId?: number | null;
  /** SIIES NACIONALIDAD indígena (ref_Types categoría SIIES_INDIGENOUS_NATIONALITY). Solo aplica si ethnicityTypeId = INDIGENA. */
  indigenousNationalityTypeId?: number | null;
  bloodTypeTypeId?: number | null;
  specialNeedsTypeId?: number | null;
  disabilityPercentage?: number | null;
  conadisCard?: string | null;
}

export interface PersonCreateDto {
  firstName: string;
  lastName: string;
  identType: number;
  idCard: string;
  email: string;
  phone?: string;
  birthDate?: string;
  sex?: number;
  gender?: number;
  disability?: string;
  address?: string;
  isActive?: boolean;
  maritalStatusTypeId?: number;
  militaryCard?: string;
  motherName?: string;
  fatherName?: string;
  countryId?: string;
  provinceId?: string;
  cantonId?: string;
  yearsOfResidence?: number;
  ethnicityTypeId?: number;
  indigenousNationalityTypeId?: number;
  bloodTypeTypeId?: number;
  specialNeedsTypeId?: number;
  disabilityPercentage?: number;
  conadisCard?: string;
}

// =============================================================================
// DTOs de estadísticas de empleados
// =============================================================================

export interface ContractTypeStatDto {
  employeeType: number;
  count: number;
}

export interface EmployeeCompleteStatsDto {
  total: number;
  active: number;
  inactive: number;
  byContractType: ContractTypeStatDto[];
}

// =============================================================================
// API de Personas
// CORRECCIÓN: tipado con PersonDto (contrato real del backend) en lugar de
// Person de Drizzle para resolver el error TS2322 en ContractDialog y People.tsx
// =============================================================================

export const PersonasAPI = {
  ...createApiService<PersonDto, PersonCreateDto>('/api/v1/rh/people'),

  verifyBulk: (identifications: string[]): Promise<ApiResponse<BulkVerifyResponse>> =>
    apiFetch<BulkVerifyResponse>('/api/v1/rh/people/verify-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifications }),
    }),
};

// =============================================================================
// API de Empleados
// =============================================================================

export const EmpleadosAPI = {
  ...createApiService<any, any>('/api/v1/rh/employees'),

  byPersonId: (personId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/employees/person/${personId}`),

  subordinatesByBossId: (bossId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/employees/boss/${bossId}/subordinates`),
};

// =============================================================================
// API de Departamentos
// =============================================================================

export const DepartamentosAPI = createApiService<any, any>('/api/v1/rh/departments');

// =============================================================================
// API de Facultades
// =============================================================================

export const FacultadesAPI = createApiService<any, any>('/api/v1/rh/faculties');

// =============================================================================
// API de Vistas de Empleados (completa)
// =============================================================================

export const VistaEmpleadosAPI = {
  ...createApiService<any, any>('/api/v1/rh/vw/EmployeeComplete'),

  /**
   * Sobrescribe listPaged para soportar filtros adicionales server-side:
   * régimen (employeeType), departamento y estado (isActive), además de search/paginación.
   */
  listPaged: (params: PagedRequest & {
    employeeType?: number;
    department?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<PagedResult<any>>> => {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.sortDirection ? { sortDirection: params.sortDirection } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.employeeType ? { employeeType: String(params.employeeType) } : {}),
      ...(params.department ? { department: params.department } : {}),
      ...(params.isActive !== undefined ? { isActive: String(params.isActive) } : {}),
    });
    return apiFetch<PagedResult<any>>(`/api/v1/rh/vw/EmployeeComplete/paged?${qs.toString()}`);
  },

  byDepartment: (department: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeComplete/department/${department}`),

  stats: (): Promise<ApiResponse<EmployeeCompleteStatsDto>> =>
    apiFetch<EmployeeCompleteStatsDto>('/api/v1/rh/vw/EmployeeComplete/stats'),

  byContractTypeStats: (): Promise<ApiResponse<ContractTypeStatDto[]>> =>
    apiFetch<ContractTypeStatDto[]>(
      '/api/v1/rh/vw/EmployeeComplete/stats/by-contract-type'
    ),
};

// =============================================================================
// API de Detalles de Empleados (completa)
// =============================================================================

export const VistaDetallesEmpleadosAPI = {
  ...createApiService<any, any>('/api/v1/rh/vw/EmployeeDetails'),

  byEmail: (email: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/vw/EmployeeDetails/email/${encodeURIComponent(email)}`),

  byDepartment: (departmentName: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/department/${encodeURIComponent(departmentName)}`),

  /** Filtra por DepartmentID exacto (sin ambigüedad de nombres/tildes). */
  byDepartmentId: (departmentId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/department-id/${departmentId}`),

  byFaculty: (facultyName: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/faculty/${encodeURIComponent(facultyName)}`),

  byType: (employeeType: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/type/${employeeType}`),

  byImmediateBoss: (bossId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(
      `/api/v1/rh/vw/EmployeeDetails/boss/${bossId}/subordinates/details`
    ),

  getAvailableTypes: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>('/api/v1/rh/vw/EmployeeDetails/available/types'),

  getAvailableDepartments: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>('/api/v1/rh/vw/EmployeeDetails/available/departments'),

  getAvailableFaculties: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>('/api/v1/rh/vw/EmployeeDetails/available/faculties'),

  /** Cobertura de horario (total/con horario/sin horario), calculada en el servidor —
   * evita traer la tabla completa de empleados al navegador solo para contar. */
  scheduleCoverageStats: (): Promise<ApiResponse<ScheduleCoverageStatsDto>> =>
    apiFetch<ScheduleCoverageStatsDto>('/api/v1/rh/vw/EmployeeDetails/stats/schedule-coverage'),

};

export interface ScheduleCoverageStatsDto {
  total: number;
  withSchedule: number;
  withoutSchedule: number;
}
