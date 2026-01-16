// src/types/Permission.ts

export interface PermissionType  {
  typeId: number;
  name: string;
  deductsFromVacation: boolean;
  requiresApproval: boolean;
  attachedFileRequired: boolean;
};

