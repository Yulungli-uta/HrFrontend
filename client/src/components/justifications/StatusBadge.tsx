import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { JustificationStatus } from "@/types/justifications";

const MAP = {
  PENDING: { label: "Pendiente", className: "bg-warning/15 text-warning border-warning/30", Icon: Clock },
  APPROVED: { label: "Aprobada", className: "bg-success/15 text-success border-success/30", Icon: CheckCircle },
  REJECTED: { label: "Rechazada", className: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertCircle },
};

export function StatusBadge({ status }: { status: JustificationStatus }) {
  const cfg = MAP[status] ?? MAP.PENDING;
  const Icon = cfg.Icon;
  return (
    <Badge className={`${cfg.className} flex items-center gap-1`} variant="outline">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
