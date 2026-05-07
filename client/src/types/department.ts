export interface Department {
  departmentId: number;
  parentId: number | null;
  code?: string | null;
  name: string;
  shortName?: string | null;
  departmentType?: number | string | null;
  departmentScope?: number | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  children?: Department[];
  rowVersion?: string;
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
  scope: string;
  isActive: boolean;
  parentId: string;
  rowVersion?: string;
}

export type ActiveFilter = "all" | "active" | "inactive";

export interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  department: Department | null;
}
