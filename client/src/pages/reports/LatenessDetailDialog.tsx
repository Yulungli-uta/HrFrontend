// client/src/pages/reports/LatenessDetailDialog.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataPagination } from '@/components/ui/DataPagination';
import { getLatenessDetail, type LatenessSummaryRow } from '@/lib/api/services/reports';
import { parseApiError } from '@/lib/error-handling';

interface LatenessDetailDialogProps {
  employee: LatenessSummaryRow | null;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '—');
const punchTime = (t: string | null | undefined) => (t ? t.slice(11, 19) : '—');
const formatDate = (d: string) => d.slice(0, 10).split('-').reverse().join('/');

/** Detalle de los días con atraso de un empleado: horario asignado, almuerzo y las cuatro picadas. */
export default function LatenessDetailDialog({ employee, startDate, endDate, onClose }: LatenessDetailDialogProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: resp, isLoading, isFetching, error } = useQuery({
    queryKey: ['lateness-detail', employee?.employeeId, startDate, endDate, page, pageSize],
    queryFn: () => getLatenessDetail(
      { startDate, endDate, employeeId: employee!.employeeId }, page, pageSize),
    enabled: !!employee,
  });
  const result = resp?.status === 'success' ? resp.data : null;
  const rows = result?.items ?? [];
  const loading = isLoading || isFetching;
  const loadError = error ? parseApiError(error).message : '';

  const handleOpenChange = (open: boolean) => {
    if (!open) { setPage(1); onClose(); }
  };

  return (
    <Dialog open={!!employee} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de atrasos — {employee?.fullName}</DialogTitle>
          <DialogDescription>
            Cédula {employee?.idCard} · {formatDate(startDate)} al {formatDate(endDate)} ·{' '}
            {employee?.lateDaysCount} día(s) con atraso, {employee?.totalMinutesLate} min en total
          </DialogDescription>
        </DialogHeader>

        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay jornadas con atraso en el rango.</p>
        ) : (
          <div className="space-y-3 min-w-0">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Fecha</TableHead>
                    <TableHead className="text-center">Horario asignado</TableHead>
                    <TableHead className="text-center">Almuerzo</TableHead>
                    <TableHead className="text-center">Entrada</TableHead>
                    <TableHead className="text-center">Salida almuerzo</TableHead>
                    <TableHead className="text-center">Regreso almuerzo</TableHead>
                    <TableHead className="text-center">Salida</TableHead>
                    <TableHead className="text-right">Min. atraso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={`${r.workDate}-${r.journeyNumber}-${i}`}>
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
                      <TableCell className="text-right font-medium text-destructive">{r.lateMinutes}</TableCell>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
