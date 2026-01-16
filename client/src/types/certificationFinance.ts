// src/types/certificationFinance.ts
// ============================================
// Tipos para Certificaciones Financieras
// ============================================
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
  status?: number | null;
}

export interface UIFinancialCertification extends FinancialCertification {
  isActive: boolean;
  totalAmount: number;
  daysUntilExpiry?: number;
  statusText: string;
  statusVariant: "default" | "secondary" | "destructive" | "outline";
}

export type DialogMode = "create" | "view" | "edit";