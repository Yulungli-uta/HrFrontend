import { useState } from 'react';
import { RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { usePendingChangesPaged, useShiftChangeMutations } from '@/hooks/guards/useGuards';
import { DataPagination } from '@/components/ui/DataPagination';
import type { GuardShiftChangeDto } from '@/types/guards';

type ActionDialog = { type: 'approve' | 'reject'; change: GuardShiftChangeDto } | null;

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING:  'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:  'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

export default function GuardShiftChangesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: resp, isLoading } = usePendingChangesPaged(page, pageSize);
  const { approve, reject } = useShiftChangeMutations();

  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const pagedData = resp?.status === 'success' ? resp.data : null;
  const changes = pagedData?.items ?? [];

  const handleApprove = () => {
    if (!actionDialog) return;
    approve.mutate(
      { id: actionDialog.change.shiftChangeId, dto: { approvalNotes: approvalNotes || undefined } },
      { onSuccess: (r) => { if (r.status === 'success') { setActionDialog(null); setApprovalNotes(''); } } }
    );
  };

  const handleReject = () => {
    if (!actionDialog || !rejectionReason.trim()) return;
    reject.mutate(
      { id: actionDialog.change.shiftChangeId, dto: { rejectionReason } },
      { onSuccess: (r) => { if (r.status === 'success') { setActionDialog(null); setRejectionReason(''); } } }
    );
  };

  const isSaving = approve.isPending || reject.isPending;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Cambios de Turno</h1>
            <p className="text-sm text-muted-foreground">Reemplazos y cambios pendientes de aprobación</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Cambios pendientes
            {(pagedData?.totalCount ?? 0) > 0 && (
              <Badge variant="secondary">{pagedData?.totalCount}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Cargando cambios…</p>
          ) : changes.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm">No hay cambios pendientes de aprobación.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado original</TableHead>
                  <TableHead>Reemplazante</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Solicitado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.map(c => (
                  <TableRow key={c.shiftChangeId}>
                    <TableCell className="font-mono text-sm">{c.workDate}</TableCell>
                    <TableCell>{c.originalEmployeeName}</TableCell>
                    <TableCell>{c.replacementEmployeeName ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {c.originalScheduleDescription}
                      {c.newScheduleDescription && c.newScheduleDescription !== c.originalScheduleDescription && (
                        <span className="text-muted-foreground"> → {c.newScheduleDescription}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[c.status] ?? 'outline'}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.changeType}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.requestedAt ? new Date(c.requestedAt).toLocaleDateString('es-EC') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === 'PENDING' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-green-600"
                            title="Aprobar"
                            onClick={() => { setActionDialog({ type: 'approve', change: c }); setApprovalNotes(''); }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-red-600"
                            title="Rechazar"
                            onClick={() => { setActionDialog({ type: 'reject', change: c }); setRejectionReason(''); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {(pagedData?.totalPages ?? 0) > 1 && (
            <DataPagination
              page={pagedData?.page ?? page}
              totalPages={pagedData?.totalPages ?? 0}
              totalCount={pagedData?.totalCount ?? 0}
              pageSize={pagedData?.pageSize ?? pageSize}
              hasPreviousPage={pagedData?.hasPreviousPage ?? false}
              hasNextPage={pagedData?.hasNextPage ?? false}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              disabled={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog aprobar */}
      <Dialog open={actionDialog?.type === 'approve'} onOpenChange={v => !v && setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Aprobar cambio de turno
            </DialogTitle>
          </DialogHeader>
          {actionDialog && (
            <div className="space-y-3 py-2">
              <div className="bg-muted rounded-md p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Empleado:</span> {actionDialog.change.originalEmployeeName}</div>
                <div><span className="text-muted-foreground">Fecha:</span> {actionDialog.change.workDate}</div>
                <div><span className="text-muted-foreground">Reemplazante:</span> {actionDialog.change.replacementEmployeeName ?? '—'}</div>
              </div>
              <div>
                <Label>Notas de aprobación (opcional)</Label>
                <Textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  placeholder="Observaciones…"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleApprove} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? 'Procesando…' : 'Aprobar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog rechazar */}
      <Dialog open={actionDialog?.type === 'reject'} onOpenChange={v => !v && setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="h-5 w-5" />
              Rechazar cambio de turno
            </DialogTitle>
          </DialogHeader>
          {actionDialog && (
            <div className="space-y-3 py-2">
              <div className="bg-muted rounded-md p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Empleado:</span> {actionDialog.change.originalEmployeeName}</div>
                <div><span className="text-muted-foreground">Fecha:</span> {actionDialog.change.workDate}</div>
              </div>
              <div>
                <Label>Motivo del rechazo *</Label>
                <Textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Indique el motivo…"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={isSaving}>Cancelar</Button>
            <Button
              variant="destructive" onClick={handleReject}
              disabled={isSaving || !rejectionReason.trim()}
            >
              {isSaving ? 'Procesando…' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
