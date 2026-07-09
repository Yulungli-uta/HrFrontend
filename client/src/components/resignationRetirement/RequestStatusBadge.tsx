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
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  EN_REVISION: 'bg-blue-50 text-blue-700 border-blue-200',
  DEVUELTO: 'bg-orange-50 text-orange-700 border-orange-200',
  APROBADO: 'bg-green-50 text-green-700 border-green-200',
  RECHAZADO: 'bg-red-50 text-red-700 border-red-200',
  ANULADO: 'bg-gray-100 text-gray-600 border-gray-300',
};

export function RequestStatusBadge({ status }: { status: ResignationRetirementStatus }) {
  return (
    <Badge variant="outline" className={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
