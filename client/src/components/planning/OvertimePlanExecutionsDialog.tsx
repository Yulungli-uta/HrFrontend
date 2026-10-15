import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TimePlanningOverviewAPI } from '@/lib/api';
import type { TimePlanningOverviewEmployee, TimePlanningOverviewExecution } from '@/lib/api';
import { formatDateOnly } from '@/lib/dateOnly';
import { formatMinutes } from '@/components/planning/planningFormat';

type Props = {
  employee: TimePlanningOverviewEmployee | null;
  onClose: () => void;
};

const clock = (value?: string | null) => (value ? value.slice(11, 16) || '—' : '—');

/** Ejecuciones (horas trabajadas) registradas para un empleado de una planificación. Solo lectura. */
export default function OvertimePlanExecutionsDialog({ employee, onClose }: Props) {
  const planEmployeeId = employee?.planEmployeeId ?? 0;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['time-planning-executions', planEmployeeId],
    queryFn: async () => {
      const resp = await TimePlanningOverviewAPI.getEmployeeExecutions(planEmployeeId);
      if (resp.status !== 'success') throw new Error('No se pudieron cargar las ejecuciones.');
      return (resp.data ?? []) as TimePlanningOverviewExecution[];
    },
    enabled: planEmployeeId > 0,
    staleTime: 30_000,
  });

  const rows = data ?? [];

  return (
    <Dialog open={!!employee} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ejecuciones — {employee?.employeeName}</DialogTitle>
          <DialogDescription>
            {employee?.idCard} · {employee?.departmentName || 'Sin departamento'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && (
          <p className="text-sm text-destructive">No se pudieron cargar las ejecuciones.</p>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Este empleado aún no tiene ejecuciones registradas.</p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Regular</TableHead>
                  <TableHead className="text-right">Extra</TableHead>
                  <TableHead className="text-right">Nocturno</TableHead>
                  <TableHead className="text-right">Feriado</TableHead>
                  <TableHead>Verificado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.executionId}>
                    <TableCell>{formatDateOnly(r.workDate)}</TableCell>
                    <TableCell>{clock(r.startTime)}</TableCell>
                    <TableCell>{clock(r.endTime)}</TableCell>
                    <TableCell className="text-right">{formatMinutes(r.totalMinutes)}</TableCell>
                    <TableCell className="text-right">{formatMinutes(r.regularMinutes)}</TableCell>
                    <TableCell className="text-right">{formatMinutes(r.overtimeMinutes)}</TableCell>
                    <TableCell className="text-right">{formatMinutes(r.nightMinutes)}</TableCell>
                    <TableCell className="text-right">{formatMinutes(r.holidayMinutes)}</TableCell>
                    <TableCell>{r.verifiedByName ?? 'Pendiente'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
