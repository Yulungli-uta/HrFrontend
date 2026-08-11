// src/features/electronicSignature/signatureStatus.ts
import {
  CheckCircle2,
  Clock,
  Eye,
  Send,
  AlertTriangle,
  XCircle,
  PenLine,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { BadgeProps } from "@/components/ui/badge";

export type StatusMeta = {
  label: string;
  icon: LucideIcon;
  badgeVariant: NonNullable<BadgeProps["variant"]>;
  iconClassName: string;
};

const normalize = (s: string) => s.replace(/[_\s-]/g, "").toUpperCase();

// Coincide con ParticipantStatus en UtaElectronicSignatureBackend (SignatureDomain.cs)
const PARTICIPANT_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: "Pendiente", icon: Clock, badgeVariant: "outline", iconClassName: "text-muted-foreground" },
  NOTIFIED: { label: "Notificado", icon: Send, badgeVariant: "secondary", iconClassName: "text-warning" },
  VIEWED: { label: "Visto", icon: Eye, badgeVariant: "secondary", iconClassName: "text-warning" },
  AVAILABLETOSIGN: { label: "Disponible para firmar", icon: PenLine, badgeVariant: "secondary", iconClassName: "text-warning" },
  SIGNING: { label: "Firmando...", icon: PenLine, badgeVariant: "secondary", iconClassName: "text-warning" },
  SIGNED: { label: "Firmado", icon: CheckCircle2, badgeVariant: "success", iconClassName: "text-success" },
  REJECTED: { label: "Rechazado", icon: XCircle, badgeVariant: "destructive", iconClassName: "text-destructive" },
  EXPIRED: { label: "Expirado", icon: AlertTriangle, badgeVariant: "destructive", iconClassName: "text-destructive" },
  RETRYREQUIRED: { label: "Requiere reintento", icon: AlertTriangle, badgeVariant: "destructive", iconClassName: "text-destructive" },
  VALIDATIONFAILED: { label: "Validación fallida", icon: XCircle, badgeVariant: "destructive", iconClassName: "text-destructive" },
};

// Coincide con ProcessStatus en UtaElectronicSignatureBackend (SignatureDomain.cs)
const PROCESS_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: "Borrador", icon: Clock, badgeVariant: "outline", iconClassName: "text-muted-foreground" },
  READYTOSEND: { label: "Listo para enviar", icon: Send, badgeVariant: "outline", iconClassName: "text-muted-foreground" },
  INPROGRESS: { label: "En progreso", icon: Clock, badgeVariant: "secondary", iconClassName: "text-warning" },
  PARTIALLYSIGNED: { label: "Parcialmente firmado", icon: PenLine, badgeVariant: "secondary", iconClassName: "text-warning" },
  COMPLETED: { label: "Completado", icon: CheckCircle2, badgeVariant: "success", iconClassName: "text-success" },
  REJECTED: { label: "Rechazado", icon: XCircle, badgeVariant: "destructive", iconClassName: "text-destructive" },
  CANCELLED: { label: "Cancelado", icon: XCircle, badgeVariant: "destructive", iconClassName: "text-destructive" },
  EXPIRED: { label: "Expirado", icon: AlertTriangle, badgeVariant: "destructive", iconClassName: "text-destructive" },
  OBSERVED: { label: "Observado", icon: AlertTriangle, badgeVariant: "outline", iconClassName: "text-warning" },
  VALIDATIONFAILED: { label: "Validación fallida", icon: XCircle, badgeVariant: "destructive", iconClassName: "text-destructive" },
};

const fallback = (status: string): StatusMeta => ({
  label: status || "—",
  icon: HelpCircle,
  badgeVariant: "outline",
  iconClassName: "text-muted-foreground",
});

export function getParticipantStatusMeta(status: string): StatusMeta {
  return PARTICIPANT_STATUS[normalize(status)] ?? fallback(status);
}

export function getProcessStatusMeta(status: string): StatusMeta {
  return PROCESS_STATUS[normalize(status)] ?? fallback(status);
}
