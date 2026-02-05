// src/types/directoryParameter.ts
export type DirectoryParameter = {
  directoryId: number;
  code: string;
  physicalPath: string;
  relativePath: string;
  description?: string;
  extension?: string;
  maxSizeMb?: number;
  status?: boolean;
  createdAt?: string;
  createdBy?: number | null;
  updatedAt?: string | null;
  updatedBy?: number | null;
};

