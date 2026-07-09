// src/types/employee-self-service.ts

export interface EmployeeSelfServiceProfile {
  employeeId: number;
  fullName: string;
  idCard: string;
  email?: string | null;
  personalEmail?: string | null;
  jobTitle?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  contractType?: string | null;
  schedule?: string | null;
  hireDate: string;
  immediateBossId?: number | null;
}

export interface EmployeeSelfServicePermission {
  permissionId: number;
  permissionTypeId: number;
  startDate: string;
  endDate: string;
  status: string;
  hourTaken?: number | null;
  justification?: string | null;
}

export interface EmployeeSelfServiceVacation {
  vacationId: number;
  startDate: string;
  endDate: string;
  daysGranted: number;
  daysTaken: number;
  status: string;
}

export type EmployeeCertificateStatus = 'PENDIENTE' | 'EMITIDO' | 'RECHAZADO' | 'ANULADO';

export interface EmployeeCertificateSummary {
  requestId: number;
  employeeId: number;
  certificateType: string;
  purpose?: string | null;
  status: EmployeeCertificateStatus;
  generatedDocumentId?: number | null;
  createdAt?: string | null;
  issuedAt?: string | null;
}

export interface EmployeeCertificateStatusHistoryEntry {
  historyId: number;
  requestId: number;
  previousStatus?: string | null;
  newStatus: string;
  action: string;
  observation?: string | null;
  createdAt: string;
  createdBy: number;
}

export interface EmployeeCertificateDetail {
  requestId: number;
  employeeId: number;
  employeeFullName: string;
  departmentId?: number | null;
  certificateType: string;
  purpose?: string | null;
  status: EmployeeCertificateStatus;
  generatedDocumentId?: number | null;
  generatedDocumentFileName?: string | null;
  createdAt?: string | null;
  issuedAt?: string | null;
  history: EmployeeCertificateStatusHistoryEntry[];
  rowVersion: string;
}

export interface PagedEmployeeCertificateResult {
  items: EmployeeCertificateSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateEmployeeCertificateRequest {
  certificateType: string;
  purpose?: string | null;
}

export type EmployeeInternalRequestType = 'ACTUALIZACION_DATOS' | 'DOCUMENTO' | 'INFORMACION' | 'OTRO';
export type EmployeeInternalRequestStatus =
  | 'PENDIENTE' | 'EN_REVISION' | 'DEVUELTO' | 'APROBADO' | 'RECHAZADO' | 'ANULADO' | 'COMPLETADO';

export interface EmployeeInternalRequestSummary {
  requestId: number;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string;
  departmentName?: string | null;
  requestType: EmployeeInternalRequestType;
  subject: string;
  status: EmployeeInternalRequestStatus;
  createdAt?: string | null;
}

export interface EmployeeInternalRequestStatusHistoryEntry {
  historyId: number;
  requestId: number;
  previousStatus?: string | null;
  newStatus: string;
  action: string;
  observation?: string | null;
  createdAt: string;
  createdBy: number;
}

export interface EmployeeInternalRequestDetail {
  requestId: number;
  employeeId: number;
  employeeFullName: string;
  employeeIdCard: string;
  departmentId?: number | null;
  departmentName?: string | null;
  requestType: EmployeeInternalRequestType;
  subject: string;
  description?: string | null;
  status: EmployeeInternalRequestStatus;
  createdAt?: string | null;
  createdBy?: number | null;
  updatedAt?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: number | null;
  resolvedByName?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: number | null;
  history: EmployeeInternalRequestStatusHistoryEntry[];
  rowVersion: string;
}

export interface PagedEmployeeInternalRequestResult {
  items: EmployeeInternalRequestSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateEmployeeInternalRequest {
  requestType: EmployeeInternalRequestType;
  subject: string;
  description?: string | null;
}

export interface UpdateEmployeeInternalRequest {
  subject: string;
  description?: string | null;
  rowVersion: string;
}

export interface ReviewEmployeeInternalRequest {
  observation?: string | null;
  rowVersion: string;
}

export interface CancelEmployeeInternalRequest {
  reason: string;
  rowVersion: string;
}

export interface EmployeeSelfServiceSummary {
  profile: EmployeeSelfServiceProfile;
  vacationAvailableDays: number;
  pendingPermissionsCount: number;
  pendingInternalRequestsCount: number;
  recentPermissions: EmployeeSelfServicePermission[];
  recentVacations: EmployeeSelfServiceVacation[];
  recentCertificates: EmployeeCertificateSummary[];
  recentInternalRequests: EmployeeInternalRequestSummary[];
  lastPunchTime?: string | null;
  lastPunchType?: string | null;
  pendingJustificationsCount: number;
}

export interface EmployeeSelfServiceHistoryEntry {
  source: 'PERMISSION' | 'VACATION' | 'CERTIFICATE' | 'INTERNAL_REQUEST' | 'JUSTIFICATION';
  sourceId: number;
  title: string;
  status: string;
  date: string;
  description?: string | null;
}
