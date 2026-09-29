import { useState } from 'react';
import { RefreshCw, Check, X, AlertCircle, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useAllChangesPaged, useShiftChangeMutations } from '@/hooks/guards/useGuards';
import { GuardRotationGroupsAPI } from '@/lib/api/services/guards';
import { DataPagination } from '@/components/ui/DataPagination';
import type { GuardShiftChangeDto, GuardRotationGroupDto } from '@/types/guards';

function extractArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray((res as { data?: unknown })?.data)) return (res as { data: T[] }).data;
  return [];
}

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
  REASSIGNMENT:    'Reasignación',
  SWAP:            'Intercambio',
  SCHEDULE_CHANGE: 'Cambio horario',
  COVERAGE:        'Cobertura adicional',
  EMERGENCY:       'Emergencia',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Tabla de cambios ─────────────────────────────────────────────────────────

type ChangesTableProps = {
  changes: GuardShiftChangeDto[];
  onApprove: (c: GuardShiftChangeDto) => void;
  onReject:  (c: GuardShiftChangeDto) => void;
  onRevert:  (c: GuardShiftChangeDto) => void;
  showActions: boolean;
};

function ChangesTable({ changes, onApprove, onReject, onRevert, showActions }: ChangesTableProps) {
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
          <TableHead>Movimiento</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead>Solicitado por</TableHead>
          {showActions && <TableHead className="text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {changes.map(c => {
          const isReassignment = c.changeType === 'REASSIGNMENT';
          const dateMoved = !!c.newWorkDate && c.newWorkDate !== c.workDate;
          const canRevert = isReassignment && c.isActiveForAttendance;
          return (
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
                {dateMoved ? (
                  <span>{c.workDate} <span className="text-muted-foreground">→</span> {c.newWorkDate}</span>
                ) : '—'}
                {c.newLocationName && (
                  <div className="text-muted-foreground">{c.newLocationName}</div>
                )}
              </TableCell>
              <TableCell className="text-xs">
                {CHANGE_TYPE_LABEL[c.changeType] ?? c.changeType}
                {isReassignment && !c.isActiveForAttendance && (
                  <div className="text-muted-foreground">(deshecha)</div>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={STATUS_BADGE[c.status] ?? 'outline'}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <div>{c.requestedByName ?? (c.requestedBy ? `#${c.requestedBy}` : '—')}</div>
                <div>{formatDateTime(c.requestedAt)}</div>
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {c.status === 'PENDING' && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
                          title="Aprobar" onClick={() => onApprove(c)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600"
                          title="Rechazar" onClick={() => onReject(c)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {canRevert && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-600"
                        title="Deshacer reasignación" onClick={() => onRevert(c)}>
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ─── Lista filtrable (sin tabs — Estado incluye "Pendiente" como opción más) ──

type TabActions = {
  onApprove: (c: GuardShiftChangeDto) => void;
  onReject: (c: GuardShiftChangeDto) => void;
  onRevert: (c: GuardShiftChangeDto) => void;
};

function ChangesList({ onApprove, onReject, onRevert }: TabActions) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [changeTypeFilter, setChangeTypeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const { data: groupsResp } = useQuery({
    queryKey: ['guards', 'rotation-groups', 'all'],
    queryFn: () => GuardRotationGroupsAPI.getAll(),
    staleTime: 60_000,
  });
  const groups: GuardRotationGroupDto[] = extractArray(groupsResp);

  const { data: resp, isLoading, refetch } = useAllChangesPaged(page, pageSize, statusFilter || undefined, {
    changeType: changeTypeFilter || undefined,
    groupId: groupFilter === '' ? undefined : groupFilter,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    search: search || undefined,
  });
  const pagedData = resp?.status === 'success' ? resp.data : null;
  const changes = pagedData?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="text-xs">Buscar</Label>
            <Input
              placeholder="Nombre o cédula…"
              className="h-9 w-56"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <Label className="text-xs">Estado</Label>
            <select
              className="h-9 border rounded-md px-3 text-sm bg-background"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="APPROVED">Aprobado</option>
              <option value="REJECTED">Rechazado</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Grupo</Label>
            <select
              className="h-9 border rounded-md px-3 text-sm bg-background"
              value={groupFilter}
              onChange={e => { setGroupFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
            >
              <option value="">Todos</option>
              {groups.map(g => (
                <option key={g.groupId} value={g.groupId}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <select
              className="h-9 border rounded-md px-3 text-sm bg-background"
              value={changeTypeFilter}
              onChange={e => { setChangeTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">Todos</option>
              <option value="REASSIGNMENT">Reasignación</option>
              <option value="REPLACEMENT">Reemplazo</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" className="h-9" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" className="h-9" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />
          </div>
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
            <ChangesTable changes={changes} onApprove={onApprove} onReject={onReject} onRevert={onRevert} showActions />
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
  const { approve, reject, revertReassignment } = useShiftChangeMutations();
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [revertTarget, setRevertTarget] = useState<GuardShiftChangeDto | null>(null);
  const isSaving = approve.isPending || reject.isPending;

  const openApprove = (c: GuardShiftChangeDto) => { setActionDialog({ type: 'approve', change: c }); setApprovalNotes(''); };
  const openReject  = (c: GuardShiftChangeDto) => { setActionDialog({ type: 'reject',  change: c }); setRejectionReason(''); };
  const openRevert  = (c: GuardShiftChangeDto) => setRevertTarget(c);

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

  const handleRevert = () => {
    if (!revertTarget) return;
    revertReassignment.mutate(revertTarget.shiftChangeId, {
      onSuccess: (r) => { if (r.status === 'success') setRevertTarget(null); },
    });
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

      <ChangesList onApprove={openApprove} onReject={openReject} onRevert={openRevert} />

      {/* Dialog aprobar */}
      <Dialog open={actionDialog?.type === 'approve'} onOpenChange={v => !v && setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Aprobar cambio de turno
            </DialogTitle>
            <DialogDescription>Confirma la aprobación de este cambio de turno solicitado.</DialogDescription>
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
            <DialogDescription>Confirma el rechazo de este cambio de turno solicitado.</DialogDescription>
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

      {/* Dialog deshacer reasignación */}
      <Dialog open={!!revertTarget} onOpenChange={v => !v && setRevertTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Undo2 className="h-5 w-5" />
              Deshacer reasignación
            </DialogTitle>
            <DialogDescription>
              Esto restaura el turno a la fecha, horario y ubicación originales, antes de esta reasignación.
            </DialogDescription>
          </DialogHeader>
          {revertTarget && (
            <div className="bg-muted rounded-md p-3 text-sm space-y-1.5">
              <div><span className="text-muted-foreground">Guardia:</span> <strong>{revertTarget.originalEmployeeFullName}</strong></div>
              <div>
                <span className="text-muted-foreground">Fecha reasignada:</span>{' '}
                {revertTarget.workDate}
                {revertTarget.newWorkDate && revertTarget.newWorkDate !== revertTarget.workDate && (
                  <> → <strong>{revertTarget.newWorkDate}</strong></>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Horario:</span> {revertTarget.originalScheduleDescription}
                {revertTarget.newScheduleDescription && revertTarget.newScheduleDescription !== revertTarget.originalScheduleDescription && (
                  <> → <strong>{revertTarget.newScheduleDescription}</strong></>
                )}
              </div>
              {revertTarget.newLocationName && (
                <div><span className="text-muted-foreground">Ubicación reasignada:</span> {revertTarget.newLocationName}</div>
              )}
              <div className="text-xs pt-0.5">
                <span className="text-muted-foreground">Reasignado por:</span>{' '}
                {revertTarget.requestedByName ?? '—'} el {formatDateTime(revertTarget.requestedAt)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertTarget(null)} disabled={revertReassignment.isPending}>Cancelar</Button>
            <Button onClick={handleRevert} disabled={revertReassignment.isPending} className="bg-orange-600 hover:bg-orange-700">
              {revertReassignment.isPending ? 'Deshaciendo…' : 'Deshacer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
