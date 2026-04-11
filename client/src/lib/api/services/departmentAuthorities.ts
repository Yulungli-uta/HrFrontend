// src/lib/api/services/departmentAuthorities.ts
/**
 * Servicio API para la gestión de Autoridades de Departamento.
 * Principio SRP: este módulo sólo gestiona las llamadas HTTP al endpoint /department-authorities.
 * Principio OCP: extiende createApiService con métodos especializados sin modificar el factory.
 */
import { createApiService } from '../core/pagination';
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedRequest, PagedResult } from '../core/pagination';

// =============================================================================
// DTOs — espejo del backend (DepartmentAuthorityDto.cs)
// =============================================================================

/** DTO de lectura enriquecido con nombres resueltos de las FK */
export interface DepartmentAuthorityDto {
  authorityId: number;
  departmentId: number;
  departmentName: string;
  departmentCode: string;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string;
  employeeEmail: string;
  authorityTypeId: number;
  authorityTypeName: string;
  jobId: number | null;
  jobName: string | null;
  denomination: string | null;
  startDate: string;           // ISO date "YYYY-MM-DD"
  endDate: string | null;
  resolutionCode: string | null;
  notes: string | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
}

/** DTO de creación */
export interface DepartmentAuthorityCreateDto {
  departmentId: number;
  employeeId: number;
  authorityTypeId: number;
  jobId?: number | null;
  denomination?: string | null;
  startDate: string;           // ISO date "YYYY-MM-DD"
  endDate?: string | null;
  resolutionCode?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

/** DTO de actualización */
export interface DepartmentAuthorityUpdateDto {
  departmentId: number;
  employeeId: number;
  authorityTypeId: number;
  jobId?: number | null;
  denomination?: string | null;
  startDate: string;
  endDate?: string | null;
  resolutionCode?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

/** DTO de respuesta para consulta de denominación por cédula */
export interface DepartmentAuthorityDenominationDto {
  idCard: string;
  employeeId: number;
  employeeFullName: string;
  employeeEmail: string;
  denomination: string | null;
  authorityTypeName: string;
  departmentName: string;
  departmentCode: string;
  startDate: string;
  endDate: string | null;
  resolutionCode: string | null;
  isActive: boolean;
}

/** Parámetros adicionales para la consulta paginada de DepartmentAuthorities */
export interface DepartmentAuthorityPagedRequest extends PagedRequest {
  onlyActive?: boolean;
}

// =============================================================================
// Servicio API
// =============================================================================

const BASE_PATH = '/department-authorities';

/** Servicio CRUD base generado por el factory */
const _base = createApiService<
  DepartmentAuthorityDto,
  DepartmentAuthorityCreateDto,
  DepartmentAuthorityUpdateDto
>(BASE_PATH);

/**
 * DepartmentAuthoritiesAPI — Servicio completo para autoridades de departamento.
 *
 * Métodos heredados del factory:
 *  - list()                → GET  /department-authorities
 *  - get(id)               → GET  /department-authorities/:id
 *  - create(dto)           → POST /department-authorities
 *  - update(id, dto)       → PUT  /department-authorities/:id
 *  - delete(id)            → DELETE /department-authorities/:id
 *
 * Métodos especializados:
 *  - listPaged(params)                     → GET /department-authorities/paged
 *  - listPagedByDepartment(id, params)     → GET /department-authorities/by-department/:id
 *  - listActiveByDepartment(id)            → GET /department-authorities/by-department/:id/active
 *  - listPagedByEmployee(id, params)       → GET /department-authorities/by-employee/:id
 *  - getDenominationByIdCard(idCard)       → GET /department-authorities/denomination/by-idcard/:idCard
 *  - changeStatus(id, isActive)            → PATCH /department-authorities/:id/status
 */
export const DepartmentAuthoritiesAPI = {
  ..._base,

  /**
   * Listado paginado con búsqueda y filtro de activos.
   */
  listPaged(
    params: DepartmentAuthorityPagedRequest
  ): Promise<ApiResponse<PagedResult<DepartmentAuthorityDto>>> {
    const qs = new URLSearchParams({
      page:       String(params.page ?? 1),
      pageSize:   String(params.pageSize ?? 20),
      ...(params.search        ? { search:      params.search }              : {}),
      ...(params.sortBy        ? { sortBy:       params.sortBy }              : {}),
      ...(params.sortDirection ? { sortDirection: params.sortDirection }      : {}),
      ...(params.onlyActive !== undefined
        ? { onlyActive: String(params.onlyActive) }
        : {}),
    });
    return apiFetch<PagedResult<DepartmentAuthorityDto>>(
      `${BASE_PATH}/paged?${qs.toString()}`
    );
  },

  /**
   * Listado paginado filtrado por departamento.
   */
  listPagedByDepartment(
    departmentId: number,
    params: DepartmentAuthorityPagedRequest
  ): Promise<ApiResponse<PagedResult<DepartmentAuthorityDto>>> {
    const qs = new URLSearchParams({
      page:     String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
      ...(params.onlyActive !== undefined
        ? { onlyActive: String(params.onlyActive) }
        : {}),
    });
    return apiFetch<PagedResult<DepartmentAuthorityDto>>(
      `${BASE_PATH}/by-department/${departmentId}?${qs.toString()}`
    );
  },

  /**
   * Obtiene solo las autoridades activas (sin fecha de fin) de un departamento.
   */
  listActiveByDepartment(
    departmentId: number
  ): Promise<ApiResponse<DepartmentAuthorityDto[]>> {
    return apiFetch<DepartmentAuthorityDto[]>(
      `${BASE_PATH}/by-department/${departmentId}/active`
    );
  },

  /**
   * Listado paginado filtrado por empleado.
   */
  listPagedByEmployee(
    employeeId: number,
    params: PagedRequest
  ): Promise<ApiResponse<PagedResult<DepartmentAuthorityDto>>> {
    const qs = new URLSearchParams({
      page:     String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
    });
    return apiFetch<PagedResult<DepartmentAuthorityDto>>(
      `${BASE_PATH}/by-employee/${employeeId}?${qs.toString()}`
    );
  },

  /**
   * Consulta la denominación vigente de una persona mediante su número de cédula.
   * Flujo: People(IdCard) → Employees(PersonID) → DepartmentAuthorities(EmployeeID)
   */
  getDenominationByIdCard(
    idCard: string
  ): Promise<ApiResponse<DepartmentAuthorityDenominationDto>> {
    return apiFetch<DepartmentAuthorityDenominationDto>(
      `${BASE_PATH}/denomination/by-idcard/${encodeURIComponent(idCard)}`
    );
  },

  /**
   * Cambia el estado activo/inactivo de una autoridad.
   */
  changeStatus(
    id: number,
    isActive: boolean
  ): Promise<ApiResponse<void>> {
    return apiFetch<void>(
      `${BASE_PATH}/${id}/status?isActive=${isActive}`,
      { method: 'PATCH' }
    );
  },
};
