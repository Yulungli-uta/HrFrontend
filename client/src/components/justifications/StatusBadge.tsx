import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { JustificationStatus } from "@/types/justifications";

const MAP = {
  PENDING: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800 border-yellow-200", Icon: Clock },
  APPROVED: { label: "Aprobada", className: "bg-green-100 text-green-800 border-green-200", Icon: CheckCircle },
  REJECTED: { label: "Rechazada", className: "bg-red-100 text-red-800 border-red-200", Icon: AlertCircle },
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
