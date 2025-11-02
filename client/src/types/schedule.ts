// src/types/schedule.ts
export interface Schedule {
  scheduleId?: number;
  name?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  isActive?: boolean;
}

export interface Employee {
  employeeID: number;
  fullName: string;
  departmentName: string;
  email: string;
  employeeType: string;
  contractType?: string; // Añadir este campo
  idCard?: string;
  hireDate?: string;
  hasActiveSalary: boolean;
  baseSalary?: number; // Añadir este campo
  scheduleID?: number; // Añadir este campo
  schedule?: any; // Añadir este campo
}

export interface EmployeeSchedule {
  empScheduleId?: number;
  employeeId?: number;
  scheduleId?: number;
  validFrom?: string;
  validTo?: string;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
  schedule?: Schedule;
}

export interface ScheduleCount {
  schedule: Schedule;
  count: number;
  employees: Employee[];
}

export type RefType = { typeId: number; name: string; category: string };