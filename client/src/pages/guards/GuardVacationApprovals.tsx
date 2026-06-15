//src/pages/guards/GuardVacationApprovals.tsx
import { useState } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useVacationPlansPaged,
  useVacationPlanMutations,
  useVacationRequestsPaged,
  useVacationRequestMutations,
} from '@/hooks/guards/useGuards';
import type {
  GuardVacationPlanDto,
  GuardVacationRequestDto,
  ApproveGuardVacationPlanDto,
  RejectGuardVacationPlanDto,
  ApproveGuardVacationRequestDto,
  RejectGuardVacationRequestDto,
} from '@/types/guards';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLAN_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PLANNED: 'outline',
  PENDING_DIRECTION_APPROVAL: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

const PLAN_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planificado',
  PENDING_DIRECTION_APPROVAL: 'Pend. dirección',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

const REQ_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  REQUESTED: 'outline',
  PENDING_DIRECTION_APPROVAL: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

const REQ_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Solicitado',
  PENDING_DIRECTION_APPROVAL: 'Pend. dirección',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

const TYPE_LABEL: Record<string, string> = {
  CHANGE_DATES: 'Cambio de fechas',
  ACCUMULATE_NEXT_YEAR: 'Acumular al siguiente año',
};

// ─── Approve plan dialog ──────────────────────────────────────────────────────

function ApprovePlanDialog({
  plan, onConfirm, onClose, isPending,
}: {
  plan: GuardVacationPlanDto | null;
  onConfirm: (notes: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState('');
  return (
    <Dialog open={!!plan} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />Aprobar plan de vacaciones
          </DialogTitle>
        </DialogHeader>
        {plan && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
            <p className="font-medium text-sm text-foreground">{plan.employeeFullName}</p>
            <p className="font-mono">{plan.plannedStartDate} → {plan.plannedEndDate}</p>
            <p>Año: {plan.vacationYear}</p>
            {plan.submittedByName && <p>Enviado por: {plan.submittedByName}</p>}
          </div>
        )}
        <div>
          <Label className="text-xs">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea className="mt-1 text-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Observaciones de la aprobación…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => onConfirm(notes)} disabled={isPending}>
            {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Aprobando…</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-2" />Aprobar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject dialog (reusable) ─────────────────────────────────────────────────

function RejectDialog({
  open, title, onConfirm, onClose, isPending,
}: {
  open: boolean; title: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />Rechazar
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{title}</p>
        <div>
          <Label className="text-xs">Motivo del rechazo *</Label>
          <Textarea className="mt-1 text-sm" rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Explique el motivo…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)} disabled={isPending || !reason.trim()}>
            {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Rechazando…</> : 'Rechazar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Approve request dialog ───────────────────────────────────────────────────

function ApproveRequestDialog({
  request, onConfirm, onClose, isPending,
}: {
  request: GuardVacationRequestDto | null;
  onConfirm: (notes: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState('');
  return (
    <Dialog open={!!request} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />Aprobar solicitud
          </DialogTitle>
        </DialogHeader>
        {request && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
            <p className="font-medium text-sm text-foreground">{request.employeeFullName}</p>
            <p>{TYPE_LABEL[request.requestType] ?? request.requestType}</p>
            <p className="font-mono">{request.originalStartDate} → {request.originalEndDate}</p>
            {request.submittedByName && <p>Enviado por: {request.submittedByName}</p>}
          </div>
        )}
        <div>
          <Label className="text-xs">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea className="mt-1 text-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Observaciones de la aprobación…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => onConfirm(notes)} disabled={isPending}>
            {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Aprobando…</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-2" />Aprobar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuardVacationApprovalsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number | undefined>(currentYear);

  const pendingPlansQ  = useVacationPlansPaged(20,  { year, status: 'PENDING_DIRECTION_APPROVAL' });
  const pendingReqsQ   = useVacationRequestsPaged(20, { status: 'PENDING_DIRECTION_APPROVAL' });
  const historyPlansQ  = useVacationPlansPaged(20,  { year });
  const historyReqsQ   = useVacationRequestsPaged(20, {});

  const planMutations    = useVacationPlanMutations();
  const requestMutations = useVacationRequestMutations();

  const [approvePlan,  setApprovePlan]  = useState<GuardVacationPlanDto | null>(null);
  const [rejectPlan,   setRejectPlan]   = useState<GuardVacationPlanDto | null>(null);
  const [approveReq,   setApproveReq]   = useState<GuardVacationRequestDto | null>(null);
  const [rejectReq,    setRejectReq]    = useState<GuardVacationRequestDto | null>(null);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Aprobación de Vacaciones</h1>
            <p className="text-sm text-muted-foreground">Vista de dirección — aprobación final</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm">Año:</Label>
          <select className="h-9 border rounded-md px-3 text-sm bg-background" value={year ?? ''}
            onChange={e => setYear(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Todos</option>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">
            Planes pendientes
            {pendingPlansQ.totalCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{pendingPlansQ.totalCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests">
            Solicitudes pendientes
            {pendingReqsQ.totalCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{pendingReqsQ.totalCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history-plans">Historial planes</TabsTrigger>
          <TabsTrigger value="history-requests">Historial solicitudes</TabsTrigger>
        </TabsList>

        {/* ── Planes PENDING_DIRECTION_APPROVAL ── */}
        <TabsContent value="plans" className="mt-4">
          {pendingPlansQ.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Cargando…
            </div>
          ) : pendingPlansQ.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No hay planes pendientes de aprobación.</p>
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guardia</TableHead>
                      <TableHead className="text-center">Año</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Enviado por</TableHead>
                      <TableHead>Fecha informe</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPlansQ.items.map(p => (
                      <TableRow key={p.guardVacationPlanId}>
                        <TableCell>
                          <p className="text-sm font-medium">{p.employeeFullName}</p>
                          <p className="text-xs text-muted-foreground">{p.employeeIdCard}</p>
                        </TableCell>
                        <TableCell className="text-center font-medium">{p.vacationYear}</TableCell>
                        <TableCell className="text-xs font-mono">{p.plannedStartDate} → {p.plannedEndDate}</TableCell>
                        <TableCell className="text-xs">{p.submittedByName ?? '—'}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {p.submittedToDirectionAt
                            ? new Date(p.submittedToDirectionAt).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setApprovePlan(p)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Aprobar
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRejectPlan(p)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Rechazar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-3">
                <span>{pendingPlansQ.totalCount} planes</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pendingPlansQ.page <= 1} onClick={() => pendingPlansQ.goToPage(pendingPlansQ.page - 1)}>Anterior</Button>
                  <span className="flex items-center px-2">Pág {pendingPlansQ.page} / {pendingPlansQ.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={pendingPlansQ.page >= pendingPlansQ.totalPages} onClick={() => pendingPlansQ.goToPage(pendingPlansQ.page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Solicitudes PENDING_DIRECTION_APPROVAL ── */}
        <TabsContent value="requests" className="mt-4">
          {pendingReqsQ.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Cargando…
            </div>
          ) : pendingReqsQ.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No hay solicitudes pendientes de aprobación.</p>
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guardia</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período original</TableHead>
                      <TableHead>Período solicitado</TableHead>
                      <TableHead>Enviado por</TableHead>
                      <TableHead>Fecha informe</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReqsQ.items.map(r => (
                      <TableRow key={r.guardVacationRequestId}>
                        <TableCell>
                          <p className="text-sm font-medium">{r.employeeFullName}</p>
                          <p className="text-xs text-muted-foreground">{r.employeeIdCard}</p>
                        </TableCell>
                        <TableCell className="text-xs">{TYPE_LABEL[r.requestType] ?? r.requestType}</TableCell>
                        <TableCell className="font-mono text-xs">{r.originalStartDate} → {r.originalEndDate}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.requestedStartDate ? `${r.requestedStartDate} → ${r.requestedEndDate}` : r.targetYear ? `Año ${r.targetYear}` : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{r.submittedByName ?? '—'}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {r.submittedToDirectionAt
                            ? new Date(r.submittedToDirectionAt).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setApproveReq(r)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Aprobar
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRejectReq(r)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Rechazar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-3">
                <span>{pendingReqsQ.totalCount} solicitudes</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pendingReqsQ.page <= 1} onClick={() => pendingReqsQ.goToPage(pendingReqsQ.page - 1)}>Anterior</Button>
                  <span className="flex items-center px-2">Pág {pendingReqsQ.page} / {pendingReqsQ.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={pendingReqsQ.page >= pendingReqsQ.totalPages} onClick={() => pendingReqsQ.goToPage(pendingReqsQ.page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Historial planes ── */}
        <TabsContent value="history-plans" className="mt-4">
          {historyPlansQ.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Cargando…
            </div>
          ) : historyPlansQ.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No hay planes registrados.</p>
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guardia</TableHead>
                      <TableHead className="text-center">Año</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead>Fecha solicitud</TableHead>
                      <TableHead>Enviado a dirección</TableHead>
                      <TableHead>Aprobado/rechazado</TableHead>
                      <TableHead>Aprobado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyPlansQ.items.map(p => (
                      <TableRow key={p.guardVacationPlanId}>
                        <TableCell>
                          <p className="text-sm font-medium">{p.employeeFullName}</p>
                          <p className="text-xs text-muted-foreground">{p.employeeIdCard}</p>
                        </TableCell>
                        <TableCell className="text-center font-medium">{p.vacationYear}</TableCell>
                        <TableCell className="text-xs font-mono">{p.plannedStartDate} → {p.plannedEndDate}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={PLAN_STATUS_VARIANT[p.statusName] ?? 'outline'}>
                            {PLAN_STATUS_LABEL[p.statusName] ?? p.statusName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">—</TableCell>
                        <TableCell className="text-xs font-mono">
                          {p.submittedToDirectionAt
                            ? new Date(p.submittedToDirectionAt).toLocaleDateString()
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {p.directionApprovedAt
                            ? new Date(p.directionApprovedAt).toLocaleDateString()
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">{p.directionApproverName ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-3">
                <span>{historyPlansQ.totalCount} planes</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={historyPlansQ.page <= 1} onClick={() => historyPlansQ.goToPage(historyPlansQ.page - 1)}>Anterior</Button>
                  <span className="flex items-center px-2">Pág {historyPlansQ.page} / {historyPlansQ.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={historyPlansQ.page >= historyPlansQ.totalPages} onClick={() => historyPlansQ.goToPage(historyPlansQ.page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Historial solicitudes ── */}
        <TabsContent value="history-requests" className="mt-4">
          {historyReqsQ.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Cargando…
            </div>
          ) : historyReqsQ.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No hay solicitudes registradas.</p>
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guardia</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período original</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead>Fecha solicitud</TableHead>
                      <TableHead>Enviado a dirección</TableHead>
                      <TableHead>Resolución dirección</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyReqsQ.items.map(r => (
                      <TableRow key={r.guardVacationRequestId}>
                        <TableCell>
                          <p className="text-sm font-medium">{r.employeeFullName}</p>
                          <p className="text-xs text-muted-foreground">{r.employeeIdCard}</p>
                        </TableCell>
                        <TableCell className="text-xs">{TYPE_LABEL[r.requestType] ?? r.requestType}</TableCell>
                        <TableCell className="font-mono text-xs">{r.originalStartDate} → {r.originalEndDate}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={REQ_STATUS_VARIANT[r.status] ?? 'outline'}>
                            {REQ_STATUS_LABEL[r.status] ?? r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{new Date(r.requestedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {r.submittedToDirectionAt
                            ? new Date(r.submittedToDirectionAt).toLocaleDateString()
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {r.directionApprovedAt
                            ? new Date(r.directionApprovedAt).toLocaleDateString()
                            : r.rejectedAt
                              ? <span className="text-destructive">{new Date(r.rejectedAt).toLocaleDateString()}</span>
                              : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-3">
                <span>{historyReqsQ.totalCount} solicitudes</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={historyReqsQ.page <= 1} onClick={() => historyReqsQ.goToPage(historyReqsQ.page - 1)}>Anterior</Button>
                  <span className="flex items-center px-2">Pág {historyReqsQ.page} / {historyReqsQ.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={historyReqsQ.page >= historyReqsQ.totalPages} onClick={() => historyReqsQ.goToPage(historyReqsQ.page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ApprovePlanDialog
        plan={approvePlan}
        isPending={planMutations.approve.isPending}
        onConfirm={(notes) => {
          if (!approvePlan) return;
          const dto: ApproveGuardVacationPlanDto = { notes: notes || undefined };
          planMutations.approve.mutate({ id: approvePlan.guardVacationPlanId, dto },
            { onSuccess: (res) => { if (res.status === 'success') setApprovePlan(null); } });
        }}
        onClose={() => setApprovePlan(null)}
      />

      <RejectDialog
        open={!!rejectPlan}
        title={rejectPlan ? `Plan de ${rejectPlan.employeeFullName} (${rejectPlan.plannedStartDate} → ${rejectPlan.plannedEndDate})` : ''}
        isPending={planMutations.reject.isPending}
        onConfirm={(reason) => {
          if (!rejectPlan) return;
          const dto: RejectGuardVacationPlanDto = { reason };
          planMutations.reject.mutate({ id: rejectPlan.guardVacationPlanId, dto },
            { onSuccess: (res) => { if (res.status === 'success') setRejectPlan(null); } });
        }}
        onClose={() => setRejectPlan(null)}
      />

      <ApproveRequestDialog
        request={approveReq}
        isPending={requestMutations.approve.isPending}
        onConfirm={(notes) => {
          if (!approveReq) return;
          const dto: ApproveGuardVacationRequestDto = { notes: notes || undefined };
          requestMutations.approve.mutate({ id: approveReq.guardVacationRequestId, dto },
            { onSuccess: (res) => { if (res.status === 'success') setApproveReq(null); } });
        }}
        onClose={() => setApproveReq(null)}
      />

      <RejectDialog
        open={!!rejectReq}
        title={rejectReq ? `Solicitud de ${rejectReq.employeeFullName} — ${TYPE_LABEL[rejectReq.requestType] ?? rejectReq.requestType}` : ''}
        isPending={requestMutations.reject.isPending}
        onConfirm={(reason) => {
          if (!rejectReq) return;
          const dto: RejectGuardVacationRequestDto = { reason };
          requestMutations.reject.mutate({ id: rejectReq.guardVacationRequestId, dto },
            { onSuccess: (res) => { if (res.status === 'success') setRejectReq(null); } });
        }}
        onClose={() => setRejectReq(null)}
      />
    </div>
  );
}
