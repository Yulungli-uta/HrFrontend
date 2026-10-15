import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DataPagination } from '@/components/ui/DataPagination';
import { TimePlanningOverviewAPI } from '@/lib/api';
import type { TimePlanningOverviewEmployee } from '@/lib/api';
import PlanStatusBadge from '@/components/planning/PlanStatusBadge';
import { formatHours, formatMinutes } from '@/components/planning/planningFormat';

type Props = {
  planId: number;
  employeeStatusTypeId?: number;
  onSelectEmployee: (employee: TimePlanningOverviewEmployee) => void;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** Empleados de una planificación con su estado y horas (paginado, solo lectura). */
export default function OvertimePlanEmployeesPanel({ planId, employeeStatusTypeId, onSelectEmployee }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['time-planning-overview-employees', planId, employeeStatusTypeId ?? null, page, pageSize],
    queryFn: async () => {
      const resp = await TimePlanningOverviewAPI.getPlanEmployees(planId, { page, pageSize, employeeStatusTypeId });
      if (resp.status !== 'success') throw new Error('No se pudieron cargar los empleados del plan.');
      return resp.data;
    },
    staleTime: 30_000,
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (isError || !data) {
    return <p className="text-sm text-destructive">No se pudieron cargar los empleados del plan.</p>;
  }
  if (data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">Este plan no tiene empleados con los filtros aplicados.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead className="text-right">Asignadas</TableHead>
              <TableHead className="text-right">Ejecutadas</TableHead>
              <TableHead className="text-right">Extra ejecutado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ejecuciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((e) => (
              <TableRow key={e.planEmployeeId}>
                <TableCell className="font-medium">
                  {e.employeeName}
                  {!e.isEligible && (
                    <Badge variant="outline" className="ml-2">No elegible</Badge>
                  )}
                </TableCell>
                <TableCell>{e.idCard}</TableCell>
                <TableCell>{e.departmentName || '—'}</TableCell>
                <TableCell className="text-right">{formatHours(e.assignedHours)}</TableCell>
                <TableCell className="text-right">{formatHours(e.actualHours)}</TableCell>
                <TableCell className="text-right">{formatMinutes(e.executedOvertimeMinutes)}</TableCell>
                <TableCell><PlanStatusBadge name={e.employeeStatusName} /></TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectEmployee(e)}
                    aria-label={`Ver ejecuciones de ${e.employeeName}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {e.executionCount}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        page={data.page}
        totalPages={data.totalPages}
        totalCount={data.totalCount}
        pageSize={data.pageSize}
        hasPreviousPage={data.hasPreviousPage}
        hasNextPage={data.hasNextPage}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
      />
    </div>
  );
}
