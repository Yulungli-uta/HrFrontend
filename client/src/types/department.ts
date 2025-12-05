export interface Department {
  departmentId: number;
  parentId: number | null;
  code?: string | null;
  name: string;
  shortName?: string | null;
  departmentType?: number | string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  children?: Department[];
}

export interface ReferenceType {
  typeId: number;
  category: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string | null;
}

export interface DepartmentFormData {
  name: string;
  code: string;
  shortName: string;
  type: string;
  isActive: boolean;
  parentId: string;
}

export type ActiveFilter = "all" | "active" | "inactive";

export interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  department: Department | null;
}

// types/department.ts
export interface Department {
  departmentId: number;
  parentId: number | null;
  code?: string | null;
  name: string;
  shortName?: string | null;
  departmentType?: number | string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  children?: Department[];
  // Nueva propiedad para control de concurrencia
  rowVersion?: string; // Base64 string del byte array
}

export interface DepartmentFormData {
  name: string;
  code: string;
  shortName: string;
  type: string;
  isActive: boolean;
  parentId: string;
  // Incluir rowVersion para updates
  rowVersion?: string;
}