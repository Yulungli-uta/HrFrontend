//src/types/sheduleChangePlansType.ts
export interface ScheduleChangePlanDetailResponse {
  detailID: number;
  planID: number;
  employeeID: number;
  employeeFullName?: string | null;
  previousScheduleID?: number | null;
  previousScheduleDescription?: string | null;
  statusTypeID: number;
  statusName?: string | null;
  notes?: string | null;
  omissionReason?: string | null;
  appliedAt?: string | null;
  createdAt: string;
}

export interface ScheduleChangePlanResponse {
  planID: number;
  planCode?: string | null;
  title: string;
  justification?: string | null;
  requestedByBossID: number;
  bossFullName?: string | null;
  newScheduleID: number;
  newScheduleDescription?: string | null;
  effectiveDate: string;
  applyAfterHours: 24 | 48;
  effectiveApplyDate?: string | null;
  isPermanent: boolean;
  temporalEndDate?: string | null;
  statusTypeID: number;
  statusName?: string | null;
  approvedByID?: number | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  appliedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  details: ScheduleChangePlanDetailResponse[];
}

export interface CreateScheduleChangePlanDetailRequest {
  employeeID: number;
  notes?: string | null;
}

export interface CreateScheduleChangePlanRequest {
  title: string;
  justification?: string | null;
  requestedByBossID: number;
  newScheduleID: number;
  effectiveDate: string;
  applyAfterHours: 24 | 48;
  isPermanent: boolean;
  temporalEndDate?: string | null;
  details: CreateScheduleChangePlanDetailRequest[];
}

export interface EmployeeDetailOption {
  employeeID: number;
  firstName?: string;
  lastName?: string;
  fullName: string;
  idCard?: string;
  email: string;
  employeeType?: number | string;
  ImmediateBossID?: number;
  department: string;
  faculty?: string;
  scheduleID: number;
  baseSalary?: number;
  hireDate?: string;
  hasActiveSalary?: boolean;
}

export interface ScheduleOption {
  scheduleId: number;
  name: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  workingDays?: string | null;
}

export type BossStatusFilterValue =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface BossStatusFilter {
  label: string;
  value: BossStatusFilterValue;
}

export interface PlanFormState {
  title: string;
  justification: string;
  newScheduleID: string;
  effectiveDate: string;
  applyAfterHours: "24" | "48";
  isPermanent: boolean;
  temporalEndDate: string;
  selectedEmployeeIds: number[];
  notesByEmployee: Record<number, string>;
}