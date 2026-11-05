import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { publicationBadge, type PublicationStateFields } from "@/features/publications/publicationStatus";

const TONE_CLASS = {
  review: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
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
