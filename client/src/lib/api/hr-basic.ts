/**
 * APIs de recursos humanos básicos
 * Personas, Empleados, Departamentos, Facultades
 */

import { apiFetch, createCrudService } from './client';
import type { ApiResponse } from './client';
import type {
  Person, InsertPerson,
  Employee, InsertEmployee,
  Department, InsertDepartment,
  Faculty, InsertFaculty
} from '@shared/schema';

// =============================================================================
// API de Personas
// =============================================================================

export const PersonasAPI = createCrudService<Person, InsertPerson>('/api/v1/rh/people');

// =============================================================================
// API de Empleados
// =============================================================================

export const EmpleadosAPI = createCrudService<Employee, InsertEmployee>('/api/v1/rh/employees');

// =============================================================================
// API de Departamentos
// =============================================================================

export const DepartamentosAPI = createCrudService<Department, InsertDepartment>('/api/v1/rh/departments');

// =============================================================================
// API de Facultades
// =============================================================================

export const FacultadesAPI = createCrudService<Faculty, InsertFaculty>('/api/v1/rh/faculties');

// =============================================================================
// API de Vistas de Empleados
// =============================================================================

export const VistaEmpleadosAPI = {
  ...createCrudService<any, any>('/api/v1/rh/vw/EmployeeComplete'),
  
  byDepartment: (department: string): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>(`/api/v1/rh/vw/EmployeeComplete/department/${department}`)
};

export const VistaDetallesEmpleadosAPI = {
  ...createCrudService<any, any>('/api/v1/rh/vw/EmployeeDetails'),
  
  byEmail: (email: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/vw/EmployeeDetails/email/${encodeURIComponent(email)}`)
};

// =============================================================================
// API de Direcciones
// =============================================================================

export const DireccionesAPI = createCrudService<any, any>('/api/v1/rh/addresses');

// =============================================================================
// API de Contactos de Emergencia
// =============================================================================

export const ContactosEmergenciaAPI = createCrudService<any, any>('/api/v1/rh/emergency-contacts');

// =============================================================================
// API de Cargas Familiares
// =============================================================================

export const CargasFamiliaresAPI = createCrudService<any, any>('/api/v1/rh/family-members');

// =============================================================================
// API de Cuentas Bancarias
// =============================================================================

export const CuentasBancariasAPI = createCrudService<any, any>('/api/v1/rh/bank-accounts');

// =============================================================================
// API de Libros
// =============================================================================

export const LibrosAPI = createCrudService<any, any>('/api/v1/rh/books');

// =============================================================================
// API de Enfermedades Catastróficas
// =============================================================================

export const EnfermedadesCatastroficasAPI = createCrudService<any, any>('/api/v1/rh/catastrophic-illnesses');
