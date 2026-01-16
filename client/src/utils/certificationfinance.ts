// src/utils/certificationFinance.ts
import type { FinancialCertification, UIFinancialCertification } from "@/types/certificationFinance";

export function getStatusInfo(
  status?: number | null
): { text: string; variant: UIFinancialCertification["statusVariant"] } {
  switch (status ?? 0) {
    case 1: return { text: "Activo", variant: "default" };
    case 2: return { text: "Pendiente", variant: "secondary" };
    case 3: return { text: "Aprobado", variant: "default" };
    case 4: return { text: "Rechazado", variant: "destructive" };
    case 0: return { text: "Inactivo", variant: "outline" };
    default: return { text: "Desconocido", variant: "outline" };
  }
}

export function getDaysUntilExpiry(certBudgetDate?: string | null): number | undefined {
  if (!certBudgetDate) return undefined;
  const expiryDate = new Date(certBudgetDate);
  if (Number.isNaN(expiryDate.getTime())) return undefined;
  expiryDate.setMonth(expiryDate.getMonth() + 6);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return days > 0 ? days : undefined;
}

export function toUI(cert: FinancialCertification): UIFinancialCertification {
  const statusInfo = getStatusInfo(cert.status);
  const daysUntilExpiry = getDaysUntilExpiry(cert.certBudgetDate);
  return {
    ...cert,
    isActive: cert.status === 1 || cert.status === 3,
    totalAmount: Number(cert.rmuHour ?? 0) * Number(cert.rmuCon ?? 0),
    daysUntilExpiry,
    statusText: statusInfo.text,
    statusVariant: statusInfo.variant,
  };
}

export function mapToUI(list: FinancialCertification[]): UIFinancialCertification[] {
  return (list || []).map(toUI);
}

export function filterCerts(list: UIFinancialCertification[], term: string) {
  const q = (term || "").toLowerCase();
  if (!q) return list;
  return list.filter((c) =>
    (c.certCode ?? "").toLowerCase().includes(q) ||
    (c.certNumber ?? "").toLowerCase().includes(q) ||
    (c.budget ?? "").toLowerCase().includes(q) ||
    (c.statusText ?? "").toLowerCase().includes(q)
  );
}

export function calcStats(list: UIFinancialCertification[]) {
  const total = list.length;
  const approved = list.filter(c => c.status === 3).length;
  const pending = list.filter(c => c.status === 2).length;
  const totalBudget = list.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const expiringSoon = list.filter(c => c.daysUntilExpiry && c.daysUntilExpiry < 30).length;

  return { total, approved, pending, totalBudget, expiringSoon };
}
