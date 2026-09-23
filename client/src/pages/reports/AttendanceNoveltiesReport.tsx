// client/src/pages/reports/AttendanceNoveltiesReport.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Search, FileText, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataPagination } from '@/components/ui/DataPagination';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import { useRefTypesByCategory } from '@/hooks/useRefTypes';
import { useReport } from '@/hooks/useReport';
import { getAttendanceNoveltiesSummary } from '@/lib/api/services/reports';
import type { ReportFilter } from '@/types/reports';

const NOVELTY_TYPES: Array<{ value: string; label: string }> = [
  { value: 'UNJUSTIFIED_ABSENCE', label: 'Ausencia injustificada' },
  { value: 'UNRELIABLE_PUNCH_CAPTURE', label: 'Picada sin captura confiable' },
  { value: 'LATE_ARRIVAL', label: 'Atraso' },
  { value: 'EARLY_LEAVE', label: 'Salida anticipada' },
  { value: 'MANUAL_ADJUSTMENT', label: 'Ajuste manual' },
  { value: 'TIME_RECOVERY_APPLIED', label: 'Recuperación aplicada' },
  { value: 'GUARD_REPLACEMENT', label: 'Reemplazo de guardia' },
];

function firstDayOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceNoveltiesReport() {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(todayStr());
  const [laborRegimeId, setLaborRegimeId] = useState<number | ''>('');
  const [noveltyType, setNoveltyType] = useState('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Cualquier cambio de filtro invalida la página actual — evita quedar "varado" en una
  // página que ya no existe para el nuevo resultado filtrado.
  const updateFilter = (fn: () => void) => { fn(); setPage(1); };

  const { data: laborRegimesData } = useRefTypesByCategory(REF_TYPE_CATEGORIES.CONTRACT_TYPE);
  const laborRegimes: Array<{ typeId?: number; typeID?: number; id?: number; name: string }> =
    laborRegimesData;

  const filter: ReportFilter = {
    startDate,
    endDate,
    laborRegimeId: laborRegimeId === '' ? undefined : Number(laborRegimeId),
    noveltyType: noveltyType || undefined,
    searchText: searchText.trim() || undefined,
  };

  const { data: summaryResp, isLoading, isFetching } = useQuery({
    queryKey: ['attendance-novelties-summary', filter, page, pageSize],
    queryFn: () => getAttendanceNoveltiesSummary(filter, page, pageSize),
    enabled: !!startDate && !!endDate,
  });
  const result = summaryResp?.status === 'success' ? summaryResp.data : null;
  const rows = result?.items ?? [];
  const loading = isLoading || isFetching;

  const { download, isDownloading } = useReport();

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Novedades de Asistencia</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm" disabled={isDownloading}
            onClick={() => download({ type: 'attendance-novelties', format: 'pdf', filter })}
          >
            <FileText className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
          <Button
            variant="outline" size="sm" disabled={isDownloading}
            onClick={() => download({ type: 'attendance-novelties', format: 'excel', filter })}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar Excel
          </Button>
        </div>
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
            <Label className="text-xs">Tipo de novedad</Label>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={noveltyType}
              onChange={e => updateFilter(() => setNoveltyType(e.target.value))}
            >
              <option value="">Todos</option>
              {NOVELTY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
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
            {loading ? 'Cargando…' : `${result?.totalCount ?? 0} novedad(es) con estos filtros`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay novedades registradas con estos filtros.</p>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead className="text-center">Fecha</TableHead>
                      <TableHead className="text-center">Jornada</TableHead>
                      <TableHead className="text-center">Horario</TableHead>
                      <TableHead>Tipo de Novedad</TableHead>
                      <TableHead>Observación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={`${r.employeeId}-${r.workDate}-${r.journeyNumber}-${r.noveltyType}-${i}`}>
                        <TableCell className="font-medium">{r.fullName}</TableCell>
                        <TableCell className="font-mono text-xs">{r.idCard}</TableCell>
                        <TableCell className="text-center">{r.workDate}</TableCell>
                        <TableCell className="text-center">{r.journeyNumber}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {r.scheduledEntryTime && r.scheduledExitTime
                            ? `${r.scheduledEntryTime.slice(0, 5)} - ${r.scheduledExitTime.slice(0, 5)}`
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{r.noveltyLabel}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.observation}</TableCell>
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
