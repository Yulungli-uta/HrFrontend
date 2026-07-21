// src/types/resignation-retirement.ts

export type ResignationRetirementRequestType = 'RESIGNATION' | 'RETIREMENT';

export type ResignationRetirementStatus =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'DEVUELTO'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'ANULADO';

export interface EmployeeConsolidatedInfo {
  employeeId: number;
  personId?: number | null;
  idCard: string;
  fullName: string;
  email?: string | null;
  personalEmail?: string | null;
  phone?: string | null;

  jobTitle?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  laborRegimeTypeId?: number | null;
  laborRegimeName?: string | null;
  contractTypeName?: string | null;
  hireDate: string;
  immediateBossId?: number | null;
  immediateBossName?: string | null;

  vigenteSourceType?: 'CONTRACT' | 'PERSONNEL_ACTION' | null;
  vigenteSourceId?: number | null;
  vigenteDocumentNumber?: string | null;
  vigenteStartDate?: string | null;
  vigenteEndDate?: string | null;
  vigenteJobTitle?: string | null;
  vigenteDepartmentName?: string | null;

  vacationAvailableDays: number;
  serviceTimeYears: number;
  serviceTimeMonths: number;

  age?: number | null;
  isRetirementEligible: boolean;
  retirementEligibilityNote?: string | null;
}

export interface ResignationRetirementSummary {
  requestId: number;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string;
  departmentName?: string | null;
  requestType: ResignationRetirementRequestType;
  requestDate: string;
  proposedExitDate: string;
  status: ResignationRetirementStatus;
  createdAt?: string | null;
}

export interface SignedDocumentSummary {
  fileId: number;
  fileGuid: string;
  originalFileName?: string | null;
  uploadedAt?: string | null;
}

export interface ResignationRetirementStatusHistoryEntry {
  historyId: number;
  requestId: number;
  previousStatus?: string | null;
  newStatus: string;
  action: string;
  observation?: string | null;
  createdAt: string;
  createdBy: number;
}

export interface ResignationRetirementDetail {
  requestId: number;
  requestType: ResignationRetirementRequestType;
  requestDate: string;
  proposedExitDate: string;
  reason?: string | null;
  additionalNotes?: string | null;
  status: ResignationRetirementStatus;
  linkedPersonnelActionId?: number | null;
  generatedDocumentId?: number | null;
  generatedDocumentFileName?: string | null;

  employee: EmployeeConsolidatedInfo;

  createdAt?: string | null;
  createdBy?: number | null;
  createdByName?: string | null;
  updatedAt?: string | null;
  updatedBy?: number | null;
  approvedAt?: string | null;
  approvedBy?: number | null;
  approvedByName?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: number | null;
  rejectedByName?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: number | null;
  cancelledByName?: string | null;

  history: ResignationRetirementStatusHistoryEntry[];
  rowVersion: string; // byte[] serializado como base64 por System.Text.Json

  /** Documento(s) firmado(s) adjuntos (HR_RESIGNATION_RETIREMENT / RESIGNATION_RETIREMENT_REQUEST). */
  supportingDocuments: SignedDocumentSummary[];
}

export interface PagedResignationRetirementResult {
  items: ResignationRetirementSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateResignationRetirementRequest {
  requestType: ResignationRetirementRequestType;
  proposedExitDate: string;
  reason?: string | null;
  additionalNotes?: string | null;
}

export interface UpdateResignationRetirementRequest {
  proposedExitDate: string;
  reason?: string | null;
  additionalNotes?: string | null;
  rowVersion: string;
}

export interface ReviewResignationRetirementRequest {
  observation?: string | null;
  rowVersion: string;
}

/** Aprobación: exige el StoredFileId del documento firmado ya adjunto a la solicitud. */
export interface ApproveResignationRetirementRequest {
  storedFileId: number;
  observation?: string | null;
  rowVersion: string;
}

export interface CancelResignationRetirementRequest {
  reason: string;
  rowVersion: string;
}

export interface ResignationRetirementQueryFilter {
  requestType?: ResignationRetirementRequestType;
  status?: ResignationRetirementStatus;
  dateFrom?: string;
  dateTo?: string;
  departmentId?: number;
  page?: number;
  pageSize?: number;
}
