// client/src/pages/reports/LatenessSummary.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlarmClockOff, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataPagination } from '@/components/ui/DataPagination';
import { DepartmentSelect } from '@/components/departments';
import { TiposReferenciaAPI } from '@/lib/api';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { getLatenessSummary } from '@/lib/api/services/reports';
import type { ReportFilter } from '@/types/reports';

function firstDayOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LatenessSummaryPage() {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(todayStr());
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [laborRegimeId, setLaborRegimeId] = useState<number | ''>('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Cualquier cambio de filtro invalida la página actual — evita quedar "varado" en una
  // página que ya no existe para el nuevo resultado filtrado.
  const updateFilter = (fn: () => void) => { fn(); setPage(1); };

  const { data: regimesResp } = useQuery({
    queryKey: ['ref-types', REF_TYPE_CATEGORIES.CONTRACT_TYPE],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.CONTRACT_TYPE),
    staleTime: 300_000,
  });
  const laborRegimes: Array<{ typeId?: number; typeID?: number; id?: number; name: string }> =
    regimesResp?.status === 'success' ? regimesResp.data : [];

  const filter: ReportFilter = {
    startDate,
    endDate,
    departmentId: departmentId ?? undefined,
    laborRegimeId: laborRegimeId === '' ? undefined : Number(laborRegimeId),
    searchText: searchText.trim() || undefined,
  };

  const { data: summaryResp, isLoading, isFetching } = useQuery({
    queryKey: ['lateness-summary', filter, page, pageSize],
    queryFn: () => getLatenessSummary(filter, page, pageSize),
    enabled: !!startDate && !!endDate,
  });
  const result = summaryResp?.status === 'success' ? summaryResp.data : null;
  const rows = result?.items ?? [];
  const loading = isLoading || isFetching;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <AlarmClockOff className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Resumen de Atrasos</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs">Desde *</Label>
            <Input
              type="date" value={startDate} className="mt-1"
              onChange={e => updateFilter(() => setStartDate(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Hasta *</Label>
            <Input
              type="date" value={endDate} min={startDate} className="mt-1"
              onChange={e => updateFilter(() => setEndDate(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Departamento</Label>
            <div className="mt-1">
              <DepartmentSelect
                value={departmentId}
                onChange={id => updateFilter(() => setDepartmentId(id))}
                placeholder="Todos los departamentos"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Régimen laboral</Label>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={laborRegimeId}
              onChange={e => updateFilter(() => setLaborRegimeId(e.target.value === '' ? '' : Number(e.target.value)))}
            >
              <option value="">Todos</option>
              {laborRegimes.map(r => {
                const id = r.typeId ?? r.typeID ?? r.id;
                return <option key={id} value={id}>{r.name}</option>;
              })}
            </select>
          </div>
          <div>
            <Label className="text-xs">Cédula o nombre</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar…"
                value={searchText}
                onChange={e => updateFilter(() => setSearchText(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {loading ? 'Cargando…' : `${result?.totalCount ?? 0} empleado(s) con atrasos con estos filtros`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay atrasos registrados con estos filtros.</p>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Régimen</TableHead>
                      <TableHead className="text-center">Días con atraso</TableHead>
                      <TableHead className="text-center">Minutos totales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(r => (
                      <TableRow key={r.employeeId}>
                        <TableCell className="font-medium">{r.fullName}</TableCell>
                        <TableCell className="font-mono text-xs">{r.idCard}</TableCell>
                        <TableCell>{r.departmentName ?? '—'}</TableCell>
                        <TableCell>{r.contractType ?? '—'}</TableCell>
                        <TableCell className="text-center font-semibold">{r.lateDaysCount}</TableCell>
                        <TableCell className="text-center">{r.totalMinutesLate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {result && result.totalPages > 1 && (
                <DataPagination
                  page={result.page}
                  totalPages={result.totalPages}
                  totalCount={result.totalCount}
                  pageSize={result.pageSize}
                  hasPreviousPage={result.hasPreviousPage}
                  hasNextPage={result.hasNextPage}
                  onPageChange={setPage}
                  onPageSizeChange={size => { setPageSize(size); setPage(1); }}
                  disabled={loading}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
