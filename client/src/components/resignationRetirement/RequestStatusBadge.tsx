// src/components/resignationRetirement/RequestStatusBadge.tsx
import { Badge } from '@/components/ui/badge';
import type { ResignationRetirementStatus } from '@/types/resignation-retirement';

const STATUS_LABEL: Record<ResignationRetirementStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  DEVUELTO: 'Devuelto',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
};

const STATUS_VARIANT: Record<ResignationRetirementStatus, string> = {
  PENDIENTE: 'bg-warning/10 text-warning border-warning/30',
  EN_REVISION: 'bg-primary/10 text-primary border-primary/30',
  DEVUELTO: 'bg-warning/10 text-warning border-warning/30',
  APROBADO: 'bg-success/10 text-success border-success/30',
  RECHAZADO: 'bg-destructive/10 text-destructive border-destructive/30',
  ANULADO: 'bg-muted text-muted-foreground border-border',
};

export function RequestStatusBadge({ status }: { status: ResignationRetirementStatus }) {
  return (
    <Badge variant="outline" className={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
