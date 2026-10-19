// src/pages/OvertimePlanning.tsx
// Consulta (solo lectura) de las planificaciones de horas extra para Recursos Humanos:
// planes con sus empleados, estados y horas asignadas/ejecutadas.
import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DataPagination } from '@/components/ui/DataPagination';
import { DepartmentSelect } from '@/components/departments/DepartmentSelect';
import { TimePlanningOverviewAPI } from '@/lib/api';
import type { TimePlanningOverviewEmployee, TimePlanningOverviewFilter } from '@/lib/api';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { useRefTypesByCategory } from '@/hooks/useRefTypes';
import { formatDateOnly } from '@/lib/dateOnly';
import PlanStatusBadge from '@/components/planning/PlanStatusBadge';
import OvertimePlanEmployeesPanel from '@/components/planning/OvertimePlanEmployeesPanel';
import OvertimePlanExecutionsDialog from '@/components/planning/OvertimePlanExecutionsDialog';
import { formatClock, formatHours } from '@/components/planning/planningFormat';

const ALL = 'all';
const PLAN_TYPE_LABEL: Record<string, string> = { Overtime: 'Horas extra', Recovery: 'Recuperación' };
const PAGE_SIZE_OPTIONS = [10, 20, 50];

type Filters = {
  planType: string;
  startDate: string;
  endDate: string;
  planStatusTypeId: number | null;
  employeeStatusTypeId: number | null;
  departmentId: number | null;
  search: string;
};

const DEFAULT_FILTERS: Filters = {
  planType: 'Overtime',
  startDate: '',
  endDate: '',
  planStatusTypeId: null,
  employeeStatusTypeId: null,
  departmentId: null,
  search: '',
};

const typeIdOf = (t: { typeID?: number; typeId?: number }) => t.typeID ?? t.typeId ?? 0;

export default function OvertimePlanning() {
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<TimePlanningOverviewEmployee | null>(null);

  const { data: planStatuses } = useRefTypesByCategory(REF_TYPE_CATEGORIES.PLAN_STATUS);
  const { data: employeeStatuses } = useRefTypesByCategory(REF_TYPE_CATEGORIES.EMPLOYEE_PLAN_STATUS);

  const invalidRange = !!draft.startDate && !!draft.endDate && draft.startDate > draft.endDate;

  const filter: TimePlanningOverviewFilter = {
    page,
    pageSize,
    planType: applied.planType,
    startDate: applied.startDate || undefined,
    endDate: applied.endDate || undefined,
    planStatusTypeId: applied.planStatusTypeId ?? undefined,
    employeeStatusTypeId: applied.employeeStatusTypeId ?? undefined,
    departmentId: applied.departmentId ?? undefined,
    search: applied.search.trim() || undefined,
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['time-planning-overview', filter],
    queryFn: async () => {
      const resp = await TimePlanningOverviewAPI.getPlans(filter);
      if (resp.status !== 'success') throw new Error('No se pudo cargar la planificación.');
      return resp.data;
    },
    staleTime: 30_000,
  });

  const applyFilters = () => {
    if (invalidRange) return;
    setApplied(draft);
    setPage(1);
    setExpanded(new Set());
  };

  const clearFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(1);
    setExpanded(new Set());
  };

  const toggleExpanded = (planId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });

  const plans = data?.items ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold">Planificación de Horas Extra</h1>
          <p className="text-sm text-muted-foreground">
            Consulta los planes con los empleados incluidos, su estado y las horas asignadas y ejecutadas.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-from">Desde</Label>
              <Input
                id="plan-from"
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-to">Hasta</Label>
              <Input
                id="plan-to"
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo de plan</Label>
              <Select
                value={draft.planType || ALL}
                onValueChange={(v) => setDraft({ ...draft, planType: v === ALL ? '' : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Overtime">Horas extra</SelectItem>
                  <SelectItem value="Recovery">Recuperación</SelectItem>
                  <SelectItem value={ALL}>Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estado del plan</Label>
              <Select
                value={draft.planStatusTypeId ? String(draft.planStatusTypeId) : ALL}
                onValueChange={(v) => setDraft({ ...draft, planStatusTypeId: v === ALL ? null : Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {planStatuses.filter((s) => s.isActive !== false).map((s) => (
                    <SelectItem key={typeIdOf(s)} value={String(typeIdOf(s))}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estado del empleado</Label>
              <Select
                value={draft.employeeStatusTypeId ? String(draft.employeeStatusTypeId) : ALL}
                onValueChange={(v) => setDraft({ ...draft, employeeStatusTypeId: v === ALL ? null : Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {employeeStatuses.map((s) => (
                    <SelectItem key={typeIdOf(s)} value={String(typeIdOf(s))}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Departamento del empleado</Label>
              <DepartmentSelect
                value={draft.departmentId}
                onChange={(id) => setDraft({ ...draft, departmentId: id })}
                placeholder="Todos"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="plan-search">Buscar (título, cédula o nombre)</Label>
              <Input
                id="plan-search"
                value={draft.search}
                maxLength={100}
                onChange={(e) => setDraft({ ...draft, search: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                placeholder="Ej: 0102030405, Pérez, Soporte fin de semana"
              />
            </div>
          </div>
          {invalidRange && (
            <p className="text-sm text-destructive">La fecha "Desde" no puede ser posterior a "Hasta".</p>
          )}
          <div className="flex gap-2">
            <Button onClick={applyFilters} disabled={invalidRange}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            <Button variant="outline" onClick={clearFilters}>Limpiar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Planes</CardTitle>
          <CardDescription>
            {data ? `${data.totalCount} plan(es) encontrados` : 'Cargando…'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <Skeleton className="h-32 w-full" />}
          {isError && (
            <p className="text-sm text-destructive">No se pudo cargar la planificación. Intente actualizar.</p>
          )}
          {!isLoading && !isError && plans.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay planes que coincidan con los filtros.</p>
          )}

          {plans.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead className="min-w-[220px]">Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Empleados</TableHead>
                    <TableHead className="text-right">Asignadas</TableHead>
                    <TableHead className="text-right">Ejecutadas</TableHead>
                    <TableHead>Creado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => {
                    const isOpen = expanded.has(p.planId);
                    return (
                      <Fragment key={p.planId}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleExpanded(p.planId)}
                              aria-label={isOpen ? 'Ocultar empleados' : 'Ver empleados'}
                              aria-expanded={isOpen}
                            >
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.title}
                            {p.overtimeType && (
                              <Badge variant="outline" className="ml-2">{p.overtimeType}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{PLAN_TYPE_LABEL[p.planType] ?? p.planType}</TableCell>
                          <TableCell>{formatDateOnly(p.startDate)} – {formatDateOnly(p.endDate)}</TableCell>
                          <TableCell>{formatClock(p.startTime)} – {formatClock(p.endTime)}</TableCell>
                          <TableCell><PlanStatusBadge name={p.planStatusName} /></TableCell>
                          <TableCell className="text-right">{p.totalEmployees}</TableCell>
                          <TableCell className="text-right">{formatHours(p.totalAssignedHours)}</TableCell>
                          <TableCell className="text-right">{formatHours(p.totalActualHours)}</TableCell>
                          <TableCell>{p.createdByName || '—'}</TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow>
                            <TableCell />
                            <TableCell colSpan={9} className="bg-muted/30">
                              <OvertimePlanEmployeesPanel
                                planId={p.planId}
                                employeeStatusTypeId={applied.employeeStatusTypeId ?? undefined}
                                onSelectEmployee={setSelectedEmployee}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {data && data.totalCount > 0 && (
            <DataPagination
              page={data.page}
              totalPages={data.totalPages}
              totalCount={data.totalCount}
              pageSize={data.pageSize}
              hasPreviousPage={data.hasPreviousPage}
              hasNextPage={data.hasNextPage}
              onPageChange={(p) => { setPage(p); setExpanded(new Set()); }}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); setExpanded(new Set()); }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              disabled={isFetching}
            />
          )}
        </CardContent>
      </Card>

      <OvertimePlanExecutionsDialog employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
    </div>
  );
}
