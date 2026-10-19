import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';

// Estados de PLAN_STATUS (plan) y EMPLOYEE_PLAN_STATUS (empleado dentro del plan), por nombre:
// el TypeID es IDENTITY y varía entre ambientes.
const VARIANT_BY_NAME: Record<string, BadgeVariant> = {
  Planificado: 'outline',
  Borrador: 'secondary',
  Pendiente: 'outline',
  Aprobado: 'success',
  Rechazado: 'destructive',
  'En Progreso': 'default',
  'En Proceso': 'default',
  Completado: 'success',
  Ejecutado: 'success',
  Asignado: 'outline',
  Cancelado: 'destructive',
};

type Props = {
  name?: string | null;
};

/** Insignia de estado de una planificación o de un empleado dentro de ella. */
export default function PlanStatusBadge({ name }: Props) {
  if (!name) return <Badge variant="outline">—</Badge>;
  return <Badge variant={VARIANT_BY_NAME[name] ?? 'outline'}>{name}</Badge>;
}
