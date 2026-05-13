// src/types/contractRequest.ts
import type { DirectoryParameter } from "@/types/directoryParameter";

export interface ContractRequestCreate {
  workModalityId: number | null;
  departmentId: number | null;
  numberOfPeopleToHire: number;
  numberHour: number;
  startDate?: string | null;
  endDate?: string | null;
  observation?: string;
  status?: number | null;
  createdBy: number;
}

export interface ContractRequestDto {
  requestId: number;
  workModalityId: number | null;
  departmentId: number | null;
  numberOfPeopleToHire: number;
  numberHour: number;
  totalPeopleHired: number;
  startDate?: string | null;
  endDate?: string | null;
  observation?: string | null;
  pendingCorrectionReason?: string | null;

  createdAt: string;
  createdBy: number;
  updatedAt?: string | null;
  updatedBy?: number | null;

  status?: number | null;
  statusName?: string | null;
  pendingCount: number;
}

export type StatusVariant = "default" | "secondary" | "destructive" | "outline";

export type UIContractRequest = ContractRequestDto & {
  statusText: string;
  statusVariant: StatusVariant;
};

export type { DirectoryParameter };
