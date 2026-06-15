import { useState } from 'react';
import { RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { usePendingChangesPaged, useAllChangesPaged, useShiftChangeMutations } from '@/hooks/guards/useGuards';
import { DataPagination } from '@/components/ui/DataPagination';
import type { GuardShiftChangeDto } from '@/types/guards';

// ─── Constantes ───────────────────────────────────────────────────────────────

type ActionDialog = { type: 'approve' | 'reject'; change: GuardShiftChangeDto } | null;

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING:  'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:  'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

const CHANGE_TYPE_LABEL: Record<string, string> = {
  REPLACEMENT:     'Reemplazo',
  SWAP:            'Intercambio',
  SCHEDULE_CHANGE: 'Cambio horario',
  COVERAGE:        'Cobertura adicional',
  EMERGENCY:       'Emergencia',
};

// ─── Tabla de cambios ─────────────────────────────────────────────────────────

type ChangesTableProps = {
  changes: GuardShiftChangeDto[];
  onApprove: (c: GuardShiftChangeDto) => void;
  onReject:  (c: GuardShiftChangeDto) => void;
  showActions: boolean;
};

function ChangesTable({ changes, onApprove, onReject, showActions }: ChangesTableProps) {
  if (changes.length === 0) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Check className="h-5 w-5 text-green-500" />
        <span className="text-sm">No hay registros.</span>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Guardia original</TableHead>
          <TableHead>Reemplazante</TableHead>
          <TableHead>Horario</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead>Solicitado</TableHead>
          {showActions && <TableHead className="text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {changes.map(c => (
          <TableRow key={c.shiftChangeId}>
            <TableCell className="font-mono text-sm">{c.workDate}</TableCell>
            <TableCell className="text-sm">{c.originalEmployeeFullName}</TableCell>
            <TableCell className="text-sm">{c.replacementEmployeeFullName ?? '—'}</TableCell>
            <TableCell className="text-sm">
              {c.originalScheduleDescription}
              {c.newScheduleDescription && c.newScheduleDescription !== c.originalScheduleDescription && (
                <span className="text-muted-foreground"> → {c.newScheduleDescription}</span>
              )}
            </TableCell>
            <TableCell className="text-xs">
              {CHANGE_TYPE_LABEL[c.changeType] ?? c.changeType}
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={STATUS_BADGE[c.status] ?? 'outline'}>
                {STATUS_LABEL[c.status] ?? c.status}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {c.requestedAt ? new Date(c.requestedAt).toLocaleDateString('es-EC') : '—'}
            </TableCell>
            {showActions && (
              <TableCell className="text-right">
                {c.status === 'PENDING' && (
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
                      title="Aprobar" onClick={() => onApprove(c)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600"
                      title="Rechazar" onClick={() => onReject(c)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Tab: Pendientes ──────────────────────────────────────────────────────────

function PendingTab({ onApprove, onReject }: { onApprove: (c: GuardShiftChangeDto) => void; onReject: (c: GuardShiftChangeDto) => void }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: resp, isLoading, refetch } = usePendingChangesPaged(page, pageSize);
  const pagedData = resp?.status === 'success' ? resp.data : null;
  const changes = pagedData?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Cargando…</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <ChangesTable changes={changes} onApprove={onApprove} onReject={onReject} showActions />
          </div>
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
        </>
      )}
    </div>
  );
}

// ─── Tab: Todos ───────────────────────────────────────────────────────────────

function AllTab({ onApprove, onReject }: { onApprove: (c: GuardShiftChangeDto) => void; onReject: (c: GuardShiftChangeDto) => void }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const { data: resp, isLoading, refetch } = useAllChangesPaged(page, pageSize, statusFilter || undefined);
  const pagedData = resp?.status === 'success' ? resp.data : null;
  const changes = pagedData?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">Estado:</Label>
          <select
            className="h-8 border rounded-md px-2 text-sm bg-background"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="APPROVED">Aprobado</option>
            <option value="REJECTED">Rechazado</option>
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Cargando…</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <ChangesTable changes={changes} onApprove={onApprove} onReject={onReject} showActions />
          </div>
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
        </>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GuardShiftChangesPage() {
  const { approve, reject } = useShiftChangeMutations();
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const isSaving = approve.isPending || reject.isPending;

  const openApprove = (c: GuardShiftChangeDto) => { setActionDialog({ type: 'approve', change: c }); setApprovalNotes(''); };
  const openReject  = (c: GuardShiftChangeDto) => { setActionDialog({ type: 'reject',  change: c }); setRejectionReason(''); };

  const handleApprove = () => {
    if (!actionDialog) return;
    approve.mutate(
      { id: actionDialog.change.shiftChangeId, dto: { notes: approvalNotes || undefined } },
      { onSuccess: (r) => { if (r.status === 'success') setActionDialog(null); } }
    );
  };

  const handleReject = () => {
    if (!actionDialog || !rejectionReason.trim()) return;
    reject.mutate(
      { id: actionDialog.change.shiftChangeId, dto: { rejectionReason } },
      { onSuccess: (r) => { if (r.status === 'success') setActionDialog(null); } }
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold">Cambios de Turno</h1>
          <p className="text-sm text-muted-foreground">Reemplazos y cambios de turno de guardias</p>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pendientes de aprobación</TabsTrigger>
          <TabsTrigger value="all">Todas las solicitudes</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <PendingTab onApprove={openApprove} onReject={openReject} />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <AllTab onApprove={openApprove} onReject={openReject} />
        </TabsContent>
      </Tabs>

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
              <div className="bg-muted rounded-md p-3 text-sm space-y-1.5">
                <div><span className="text-muted-foreground">Guardia original:</span> <strong>{actionDialog.change.originalEmployeeFullName}</strong></div>
                <div><span className="text-muted-foreground">Fecha:</span> {actionDialog.change.workDate}</div>
                <div><span className="text-muted-foreground">Tipo:</span> {CHANGE_TYPE_LABEL[actionDialog.change.changeType] ?? actionDialog.change.changeType}</div>
                {actionDialog.change.replacementEmployeeFullName && (
                  <div><span className="text-muted-foreground">Reemplazante:</span> <strong>{actionDialog.change.replacementEmployeeFullName}</strong></div>
                )}
                <div>
                  <span className="text-muted-foreground">Horario:</span> {actionDialog.change.originalScheduleDescription}
                  {actionDialog.change.newScheduleDescription && actionDialog.change.newScheduleDescription !== actionDialog.change.originalScheduleDescription && (
                    <span className="text-blue-600"> → {actionDialog.change.newScheduleDescription}</span>
                  )}
                </div>
                {actionDialog.change.reason && (
                  <div><span className="text-muted-foreground">Motivo:</span> {actionDialog.change.reason}</div>
                )}
                <div className="text-xs text-muted-foreground pt-0.5">
                  Solicitado: {new Date(actionDialog.change.requestedAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
              <div>
                <Label>Notas de aprobación (opcional)</Label>
                <Textarea rows={3} value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)} placeholder="Observaciones…" />
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
              <div className="bg-muted rounded-md p-3 text-sm space-y-1.5">
                <div><span className="text-muted-foreground">Guardia original:</span> <strong>{actionDialog.change.originalEmployeeFullName}</strong></div>
                <div><span className="text-muted-foreground">Fecha:</span> {actionDialog.change.workDate}</div>
                <div><span className="text-muted-foreground">Tipo:</span> {CHANGE_TYPE_LABEL[actionDialog.change.changeType] ?? actionDialog.change.changeType}</div>
                {actionDialog.change.replacementEmployeeFullName && (
                  <div><span className="text-muted-foreground">Reemplazante:</span> {actionDialog.change.replacementEmployeeFullName}</div>
                )}
                {actionDialog.change.reason && (
                  <div><span className="text-muted-foreground">Motivo:</span> {actionDialog.change.reason}</div>
                )}
              </div>
              <div>
                <Label>Motivo del rechazo *</Label>
                <Textarea rows={3} value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)} placeholder="Indique el motivo…" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={isSaving}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSaving || !rejectionReason.trim()}>
              {isSaving ? 'Procesando…' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
