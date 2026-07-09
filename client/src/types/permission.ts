// src/types/Permission.ts

export interface PermissionType  {
  typeId: number;
  name: string;
  deductsFromVacation: boolean;
  requiresApproval: boolean;
  attachedFileRequired: boolean;
  maxDays?: number | null;
  leadTimeHours?: number | null;
  isMedical?: boolean;
  isActive?: boolean;
  /** RefTypes.TypeId (Category=CONTRACT_TYPE). Null = aplica a todos los regímenes. */
  contractTypeId?: number | null;
};

