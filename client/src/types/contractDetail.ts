/**
 * Tipos para el flujo detallado de contratos (generación de documentos, workflow documental).
 * Separados de contract.ts para no romper el CRUD existente.
 */

export interface ContractTypeDto {
  contractTypeId: number;
  name: string;
  code?: string | null;
  contractCode?: string | null;
  description?: string | null;
  status: string;
  defaultTemplateId?: number | null;
  numberingPrefix?: string | null;
  numberingYear: number;
  numberingLastSequence: number;
}

export interface ContractDetailDto {
  contractID: number;
  contractCode: string;
  personID: number;
  contractTypeID: number;
  contractTypeName?: string | null;
  jobID?: number | null;
  departmentID: number;
  startDate: string;
  endDate: string;
  status: number;
  contractDescription?: string | null;
  authorizationDate?: string | null;
  generatedDocumentId?: number | null;
  isDocumentFrozen?: boolean;
  signedDocumentStoredFileId?: number | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ContractDocumentStatusDto {
  contractId: number;
  generatedDocumentId?: number | null;
  templateVersionUsed?: number | null;
  isDocumentFrozen: boolean;
  documentStatus?: string | null;
  fileName?: string | null;
  storedFileId?: number | null;
}

export interface GenerateContractDocumentResponse {
  contractID: number;
  generatedDocumentId: number;
  documentNumber: string;
  fileName: string;
  pdfBase64: string;
  fileSizeBytes: number;
  isDocumentFrozen: boolean;
  contractStatus: number;
  contractStatusName: string;
}

export interface ContractStatusHistoryEntry {
  historyId?: number;
  contractId?: number;
  statusCode: string;
  comment?: string | null;
  changedBy?: number | null;
  changedAt: string;
}

/** Campos que se mapean a los placeholders del template CONTRATO_PROFESOR_OCASIONAL */
export interface ContractDocumentOverrides {
  CONTRACT_NUMBER?: string;
  CONTRACT_DATE_DAY_WORDS?: string;
  CONTRACT_DATE_MONTH?: string;
  CONTRACT_DATE_YEAR_WORDS?: string;
  FACULTY_ROLE?: string;
  FACULTY_NAME?: string;
  AUTHORITY_TITLE?: string;
  AUTHORITY_FULLNAME?: string;
  AUTHORITY_IDCARD?: string;
  AUTHORITY_ROLE?: string;
  RECTOR_FULLNAME?: string;
  DELEGATION_RESOLUTION?: string;
  DELEGATION_DATE?: string;
  EMPLOYEE_TITLE?: string;
  EMPLOYEE_FULLNAME?: string;
  EMPLOYEE_IDCARD?: string;
  EMPLOYEE_CONTRACT_ROLE?: string;
  CAU_RESOLUTION_NUMBER?: string;
  CAU_RESOLUTION_DATE?: string;
  RECTOR_MEMO_NUMBER?: string;
  RECTOR_MEMO_DATE?: string;
  WORK_DISTRIBUTION_TABLE?: string;
  CONTRACT_START_DATE?: string;
  CONTRACT_END_DATE?: string;
  SALARY_WORDS?: string;
  SALARY_AMOUNT?: string;
  BUDGET_CODE?: string;
  SCHEDULE_TABLE?: string;
  ELABORATOR_FULLNAME?: string;
  DTH_REGISTRY_NUMBER?: string;
  DTH_REGISTRY_DATE_LONG?: string;
  DTH_DIRECTOR_FULLNAME?: string;
  [key: string]: string | undefined;
}
