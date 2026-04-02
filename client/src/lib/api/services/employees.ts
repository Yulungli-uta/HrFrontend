// src/lib/api/services/employees.ts
import { createApiService } from '../core/pagination';
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

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
  countryId?: number | null;
  provinceId?: number | null;
  cantonId?: number | null;
  yearsOfResidence?: number | null;
  ethnicityTypeId?: number | null;
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
  countryId?: number;
  provinceId?: number;
  cantonId?: number;
  yearsOfResidence?: number;
  ethnicityTypeId?: number;
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

export const PersonasAPI = createApiService<PersonDto, PersonCreateDto>('/api/v1/rh/people');

// =============================================================================
// API de Empleados
// =============================================================================

export const EmpleadosAPI = createApiService<any, any>('/api/v1/rh/employees');

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
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/department/${departmentName}`),

  byFaculty: (facultyName: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeDetails/faculty/${facultyName}`),

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
};

// =============================================================================
// APIs de CV asociadas a personas
// =============================================================================

export const DireccionesAPI = createApiService<any, any>('/api/v1/rh/cv/addresses');

export const ContactosEmergenciaAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/emergency-contacts'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/emergency-contacts/person/${personId}`),
};

export const CargasFamiliaresAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/family-burden'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/family-burden/person/${personId}`),
};

export const CuentasBancariasAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/bank-accounts'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/bank-accounts/person/${personId}`),
};

export const LibrosAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/books'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/books/person/${personId}`),
};

export const EnfermedadesCatastroficasAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/catastrophic-illnesses'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/catastrophic-illnesses/person/${personId}`),
};
