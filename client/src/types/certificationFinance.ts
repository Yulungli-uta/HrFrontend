// src/types/certificationFinance.ts
// ============================================
// Tipos para Certificaciones Financieras
// ============================================

export interface ContractRequestSummary {
  requestId: number;
  numberOfPeopleToHire: number;
  totalPeopleHired: number;
  pendingCount: number;
}

export interface FinancialCertification {
  certificationId: number;
  requestId?: number | null;

  certCode: string;
  certNumber?: string | null;
  budget?: string | null;
  certBudgetDate?: string | null;
  rmuHour?: number | null;
  rmuCon?: number | null;

  filename?: string | null;
  filepath?: string | null;

  createdAt: string;
  createdBy: number;
  updatedAt?: string | null;
  updatedBy?: number | null;
  status?: number | null;
  statusName?: string | null;
  requestSummary?: ContractRequestSummary | null;
}

export interface UIFinancialCertification extends FinancialCertification {
  isActive: boolean;
  totalAmount: number;
  daysUntilExpiry?: number;
  statusText: string;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
}

export type DialogMode = "create" | "view" | "edit";
