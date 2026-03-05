export interface DirectoryParameter {
  id: number | string;
  code: string;
  label: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: number | string | null;
  metadata?: Record<string, any>;
}

export type DirectoryType =
  | "document_type"
  | "instance_statuses"
  | "movement_types"
  | "areas"
  | "priorities"
  | "users";
  // | "processes";

export interface DirectoryFilter {
  isActive?: boolean;
  parentId?: number | string | null;
  search?: string;
}

export interface IDirectoryParametersService {
  getParameters(type: DirectoryType, filter?: DirectoryFilter): DirectoryParameter[];
  getParameterById(type: DirectoryType, id: number | string): DirectoryParameter | undefined;
  getParameterByCode(type: DirectoryType, code: string): DirectoryParameter | undefined;
}
