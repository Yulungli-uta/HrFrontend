import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { publicationBadge, type PublicationStateFields } from "@/features/publications/publicationStatus";

const TONE_CLASS = {
  review: "border-warning/40 bg-warning/10 text-warning ",
  approved: "border-success/40 bg-success/10 text-success ",
  rejected: "border-muted-foreground/30 bg-muted text-muted-foreground",
} as const;

const TONE_ICON = {
  review: Clock,
  approved: Lock,
  rejected: XCircle,
} as const;

interface PublicationStatusBadgeProps {
  publication: PublicationStateFields;
  className?: string;
}

/** Insignia del estado de revisión: "En revisión" (sincronizada sin aprobar), "Aprobada" (con candado) o "Rechazada". */
export function PublicationStatusBadge({ publication, className }: PublicationStatusBadgeProps) {
  const badge = publicationBadge(publication);
  if (!badge) return null;

  const Icon = TONE_ICON[badge.tone] ?? CheckCircle2;
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", TONE_CLASS[badge.tone], className)}>
      <Icon className="h-3 w-3" />
      {badge.label}
    </Badge>
  );
}
