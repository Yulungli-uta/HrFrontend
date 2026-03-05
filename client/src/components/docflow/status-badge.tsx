import { Badge } from "@/components/ui/badge";
import { instanceStatusColors } from "@/types/docflow/docflow.types";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = instanceStatusColors[status] || "bg-muted text-muted-foreground";

  return (
    <Badge
      variant="outline"
      className={`${colorClass} border-transparent font-medium ${className || ""}`}
      data-testid={`badge-status-${status.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {status}
    </Badge>
  );
}
