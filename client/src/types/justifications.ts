export type JustificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Justification {
  punchJustID: number;
  employeeID: number;
  bossEmployeeID: number;
  justificationTypeID: number;
  startDate: string | null;         // ISO (backend puede devolver startDate)
  endDate: string | null;           // ISO
  justificationDate: string | null; // "YYYY-MM-DD"
  reason: string;
  hoursRequested: number | null;
  approved: boolean;
  approvedAt: string | null;
  createdAt: string;                // ISO
  createdBy: number;
  comments: string | null;
  status: JustificationStatus;
}

export interface Employee {
  employeeId: number;
  firstName: string;
  lastName: string;
  department: string;
  position?: string;
}

export interface JustificationType {
  typeId: number;
  name: string;
  code?: string;
}

export interface CreateJustificationDTO {
  employeeID: number;
  bossEmployeeID: number;
  justificationTypeID: number;
  reason: string;
  startDateTime: string | null;      // ISO datetime
  endDateTime: string | null;        // ISO datetime
  justificationDate: string | null;  // "YYYY-MM-DD"
  hoursRequested: number | null;
  createdBy: number;
}
