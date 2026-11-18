// Acciones de personal y contratos con archivo firmado registrado (solo lectura).

export interface PersonnelActionSignedFile {
  actionId: number;
  actionNumber: string | null;
  personIdCard: string | null;
  personName: string | null;
  departmentName: string | null;
  actionTypeName: string | null;
  status: string | null;
  effectiveDate: string | null;
  endDate: string | null;
  elaboratorIdCard: string | null;
  elaboratorName: string | null;
  signedFileName: string | null;
  signedFileSizeBytes: number;
  signedFileUploadedAt: string | null;
}

export interface ContractSignedFile {
  contractId: number;
  contractCode: string | null;
  personIdCard: string | null;
  personName: string | null;
  departmentName: string | null;
  contractTypeName: string | null;
  statusName: string | null;
  startDate: string;
  endDate: string;
  createdByIdCard: string | null;
  createdByName: string | null;
  signedFileName: string | null;
  signedFileSizeBytes: number;
  signedFileUploadedAt: string | null;
}

export interface PersonnelActionSignedFileQuery {
  search?: string;
  actionTypeId?: number;
  status?: string;
  departmentId?: number;
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
}

export interface ContractSignedFileQuery {
  search?: string;
  contractTypeId?: number;
  statusTypeId?: number;
  departmentId?: number;
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
}
