// client/src/pages/reports/PunchDetailReport.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Fingerprint, Search, FileText, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataPagination } from '@/components/ui/DataPagination';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { useRefTypesByCategory } from '@/hooks/useRefTypes';
import { useDepartments } from '@/hooks/departments';
import { useReport } from '@/hooks/useReport';
import { getPunchDetailSummary } from '@/lib/api/services/reports';
import { parseApiError } from '@/lib/error-handling';
import type { ReportFilter } from '@/types/reports';

const MAX_RANGE_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha local en formato yyyy-MM-dd (toISOString la desplazaría por la zona horaria). */
function toLocalDateStr(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function daysBetweenInclusive(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T00:00:00`).getTime();
  return Math.round((e - s) / DAY_MS) + 1;
}

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '—');
const punchTime = (t: string | null | undefined) => (t ? t.slice(11, 19) : '—');
const formatDate = (d: string) => d.slice(0, 10).split('-').reverse().join('/');

export default function PunchDetailReport() {
  const today = new Date();
  const [startDate, setStartDate] = useState(toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [endDate, setEndDate] = useState(toLocalDateStr(today));
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [laborRegimeId, setLaborRegimeId] = useState<number | ''>('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const updateFilter = (fn: () => void) => { fn(); setPage(1); };

  const { data: laborRegimesData } = useRefTypesByCategory(REF_TYPE_CATEGORIES.CONTRACT_TYPE);
  const laborRegimes: Array<{ typeId?: number; typeID?: number; id?: number; name: string }> = laborRegimesData;
  const { departments } = useDepartments();
  const sortedDepartments = useMemo(
    () => [...departments].sort((a, b) => a.name.localeCompare(b.name)),
    [departments],
  );

  const rangeDays = startDate && endDate ? daysBetweenInclusive(startDate, endDate) : 0;
  const rangeError =
    !startDate || !endDate ? 'Indique el rango de fechas.'
      : rangeDays < 1 ? 'La fecha "Hasta" no puede ser anterior a "Desde".'
        : rangeDays > MAX_RANGE_DAYS ? `El rango máximo es de ${MAX_RANGE_DAYS} días (seleccionó ${rangeDays}).`
          : '';

  const filter: ReportFilter = {
    startDate,
    endDate,
    departmentId: departmentId === '' ? undefined : Number(departmentId),
    laborRegimeId: laborRegimeId === '' ? undefined : Number(laborRegimeId),
    searchText: searchText.trim() || undefined,
  };

  const { data: summaryResp, isLoading, isFetching, error } = useQuery({
    queryKey: ['punch-detail-summary', filter, page, pageSize],
    queryFn: () => getPunchDetailSummary(filter, page, pageSize),
    enabled: !rangeError,
  });
  const result = summaryResp?.status === 'success' ? summaryResp.data : null;
  const rows = result?.items ?? [];
  const loading = !rangeError && (isLoading || isFetching);
  const loadError = error ? parseApiError(error).message : '';

  const { download, isDownloading } = useReport();

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Fingerprint className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Reporte detallado de picadas</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm" disabled={isDownloading || !!rangeError}
            onClick={() => download({ type: 'punch-detail', format: 'pdf', filter })}
          >
            <FileText className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
          <Button
            variant="outline" size="sm" disabled={isDownloading || !!rangeError}
            onClick={() => download({ type: 'punch-detail', format: 'excel', filter })}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              <Label className="text-xs">Dependencia</Label>
              <select
                className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                value={departmentId}
                onChange={e => updateFilter(() => setDepartmentId(e.target.value === '' ? '' : Number(e.target.value)))}
              >
                <option value="">Todas</option>
                {sortedDepartments.map(d => (
                  <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                ))}
              </select>
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
          </div>
          <p className={`text-xs ${rangeError ? 'text-destructive' : 'text-muted-foreground'}`}>
            {rangeError || `Rango máximo de ${MAX_RANGE_DAYS} días. Incluye los días programados sin picadas.`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {rangeError ? 'Ajuste el rango de fechas' : loading ? 'Cargando…' : `${result?.totalCount ?? 0} jornada(s) con estos filtros`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : !rangeError && !loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay jornadas con estos filtros.</p>
          ) : !rangeError && (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Nombres</TableHead>
                      <TableHead className="text-center">Fecha</TableHead>
                      <TableHead className="text-center">Horario prog.</TableHead>
                      <TableHead className="text-center">Almuerzo</TableHead>
                      <TableHead className="text-center">Entrada</TableHead>
                      <TableHead className="text-center">Salida almuerzo</TableHead>
                      <TableHead className="text-center">Regreso almuerzo</TableHead>
                      <TableHead className="text-center">Salida</TableHead>
                      <TableHead className="text-right">Min. atraso</TableHead>
                      <TableHead className="text-center">Atraso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={`${r.employeeId}-${r.workDate}-${r.journeyNumber}-${i}`}>
                        <TableCell className="font-mono text-xs">{r.idCard}</TableCell>
                        <TableCell className="font-medium">{r.fullName}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">{formatDate(r.workDate)}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {r.scheduledEntryTime && r.scheduledExitTime
                            ? `${hhmm(r.scheduledEntryTime)} - ${hhmm(r.scheduledExitTime)}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {r.hasLunch ? `Sí (${hhmm(r.scheduledLunchStart)}-${hhmm(r.scheduledLunchEnd)})` : 'No'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">{punchTime(r.entryPunch)}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{r.hasLunch ? punchTime(r.lunchOutPunch) : '—'}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{r.hasLunch ? punchTime(r.lunchInPunch) : '—'}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{punchTime(r.exitPunch)}</TableCell>
                        <TableCell className="text-right">{r.lateMinutes}</TableCell>
                        <TableCell className={`text-center font-medium ${r.hasLateness ? 'text-destructive' : ''}`}>
                          {r.hasLateness ? 'Sí' : 'No'}
                        </TableCell>
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
