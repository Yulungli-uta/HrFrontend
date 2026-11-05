// features/publications/publicationStatus.ts
//
// Reglas de presentación del estado de revisión de una publicación. La decisión real (qué cuenta, qué se puede
// modificar) la toma el servidor y llega en isLocked / requiresApproval / countsForCv; aquí solo se traduce a etiquetas.

import type { PublicationApprovalStatus } from "@/lib/api/services/publicationSync";

export interface PublicationStateFields {
  approvalStatus?: string | null;
  isLocked?: boolean | null;
  requiresApproval?: boolean | null;
  countsForCv?: boolean | null;
}

export type PublicationBadgeTone = "review" | "approved" | "rejected";

export interface PublicationBadge {
  label: string;
  tone: PublicationBadgeTone;
}

/**
 * Insignia de la tarjeta. Lo histórico o manual sin revisión no lleva insignia (se ve como siempre);
 * lo sincronizado sin aprobar es "En revisión".
 */
export function publicationBadge(p: PublicationStateFields): PublicationBadge | null {
  if (p.approvalStatus === "APROBADA") return { label: "Aprobada", tone: "approved" };
  if (p.approvalStatus === "RECHAZADA") return { label: "Rechazada", tone: "rejected" };
  if (p.requiresApproval) return { label: "En revisión", tone: "review" };
  return null;
}

/** Aprobada o rechazada: no se edita ni se elimina. Si el servidor no informa el estado se asume editable (como antes). */
export function isPublicationLocked(p: PublicationStateFields): boolean {
  return p.isLocked ?? (p.approvalStatus === "APROBADA" || p.approvalStatus === "RECHAZADA");
}

/** Cuenta en el contador y las estadísticas de la Hoja de Vida (igual que en el CV en PDF y la promoción). */
export function publicationCounts(p: PublicationStateFields): boolean {
  return p.countsForCv ?? p.approvalStatus !== "RECHAZADA";
}

/** Sincronizada que espera la decisión de la Dirección de Investigación. */
export function isPendingReview(p: PublicationStateFields): boolean {
  return !!p.requiresApproval && (p.approvalStatus ?? "SIN_REVISION") === "SIN_REVISION";
}

export function lockedMessage(status: PublicationApprovalStatus | string | null | undefined): string {
  return status === "RECHAZADA"
    ? "Publicación rechazada por la Dirección de Investigación: no se puede modificar."
    : "Publicación aprobada por la Dirección de Investigación: no se puede modificar.";
}

export const STATUS_LABEL: Record<PublicationApprovalStatus, string> = {
  SIN_REVISION: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};
