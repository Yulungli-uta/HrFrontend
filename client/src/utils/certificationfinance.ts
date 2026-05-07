// src/utils/certificationFinance.ts
import type { FinancialCertification, UIFinancialCertification } from "@/types/certificationFinance";

function statusVariantFromName(
  statusName?: string | null
): UIFinancialCertification["statusVariant"] {
  const n = (statusName ?? "").toUpperCase();
  if (n === "APROBADA") return "default";
  if (n === "PENDIENTE_REVISION") return "secondary";
  if (n === "RECHAZADA") return "destructive";
  return "outline";
}

export function statusTextFromName(statusName?: string | null): string {
  const n = (statusName ?? "").toUpperCase();
  if (n === "APROBADA") return "Aprobada";
  if (n === "PENDIENTE_REVISION") return "Pendiente de revisión";
  if (n === "RECHAZADA") return "Rechazada";
  return statusName ?? "Desconocido";
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
  const daysUntilExpiry = getDaysUntilExpiry(cert.certBudgetDate);
  return {
    ...cert,
    isActive: cert.statusName === "APROBADA",
    totalAmount: Number(cert.rmuCon ?? 0),
    daysUntilExpiry,
    statusText: statusTextFromName(cert.statusName),
    statusVariant: statusVariantFromName(cert.statusName),
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
  const approved = list.filter(c => c.statusName === "APROBADA").length;
  const pending = list.filter(c => c.statusName === "PENDIENTE_REVISION").length;
  const totalBudget = list.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const expiringSoon = list.filter(c => c.daysUntilExpiry && c.daysUntilExpiry < 30).length;

  return { total, approved, pending, totalBudget, expiringSoon };
}
