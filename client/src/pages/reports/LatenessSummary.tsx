// client/src/pages/reports/LatenessSummary.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlarmClockOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  };

  const { data: summaryResp, isLoading, isFetching } = useQuery({
    queryKey: ['lateness-summary', filter],
    queryFn: () => getLatenessSummary(filter),
    enabled: !!startDate && !!endDate,
  });
  const rows = summaryResp?.status === 'success' ? summaryResp.data : [];
  const totalAtrasos = rows.reduce((sum, r) => sum + r.lateDaysCount, 0);
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
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Desde *</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Hasta *</Label>
            <Input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Departamento</Label>
            <div className="mt-1">
              <DepartmentSelect value={departmentId} onChange={id => setDepartmentId(id)} placeholder="Todos los departamentos" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Régimen laboral</Label>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={laborRegimeId}
              onChange={e => setLaborRegimeId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Todos</option>
              {laborRegimes.map(r => {
                const id = r.typeId ?? r.typeID ?? r.id;
                return <option key={id} value={id}>{r.name}</option>;
              })}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {loading ? 'Cargando…' : `${rows.length} empleado(s) con atrasos · ${totalAtrasos} día(s) de atraso en total`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay atrasos registrados con estos filtros.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
