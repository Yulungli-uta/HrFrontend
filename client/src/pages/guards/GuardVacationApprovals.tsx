//src/pages/guards/GuardVacationApprovals.tsx
import { useState } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

  // ── Filtros: Planes ──
  const [planYear, setPlanYear] = useState<number | undefined>(currentYear);
  const [planStatus, setPlanStatus] = useState('');
  const [planFrom, setPlanFrom] = useState('');
  const [planTo, setPlanTo] = useState('');
  const plansQ = useVacationPlansPaged(20, {
    year: planYear,
    status: planStatus || undefined,
    startDate: planFrom || undefined,
    endDate: planTo || undefined,
  });

  // ── Filtros: Solicitudes ──
  const [reqStatus, setReqStatus] = useState('');
  const [reqFrom, setReqFrom] = useState('');
  const [reqTo, setReqTo] = useState('');
  const reqsQ = useVacationRequestsPaged(20, {
    status: reqStatus || undefined,
    startDate: reqFrom || undefined,
    endDate: reqTo || undefined,
  });

  const planMutations    = useVacationPlanMutations();
  const requestMutations = useVacationRequestMutations();

  const [approvePlan,  setApprovePlan]  = useState<GuardVacationPlanDto | null>(null);
  const [rejectPlan,   setRejectPlan]   = useState<GuardVacationPlanDto | null>(null);
  const [approveReq,   setApproveReq]   = useState<GuardVacationRequestDto | null>(null);
  const [rejectReq,    setRejectReq]    = useState<GuardVacationRequestDto | null>(null);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Aprobación de Vacaciones</h1>
          <p className="text-sm text-muted-foreground">Vista de dirección — aprobación final</p>
        </div>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Planes de vacaciones</TabsTrigger>
          <TabsTrigger value="requests">Solicitudes de cambio</TabsTrigger>
        </TabsList>

        {/* ── Sección: Planes de vacaciones ── */}
        <TabsContent value="plans" className="space-y-3 mt-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="text-xs">Buscar</Label>
            <Input
              placeholder="Nombre o cédula…"
              className="h-9 w-56"
              onChange={e => plansQ.setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Estado</Label>
            <select className="h-9 border rounded-md px-3 text-sm bg-background" value={planStatus}
              onChange={e => setPlanStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="PLANNED">Planificado</option>
              <option value="PENDING_DIRECTION_APPROVAL">Pend. dirección</option>
              <option value="APPROVED">Aprobado</option>
              <option value="REJECTED">Rechazado</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Año</Label>
            <select className="h-9 border rounded-md px-3 text-sm bg-background" value={planYear ?? ''}
              onChange={e => setPlanYear(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Todos</option>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" className="h-9" value={planFrom} onChange={e => setPlanFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" className="h-9" value={planTo} onChange={e => setPlanTo(e.target.value)} />
          </div>
        </div>

        {plansQ.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />Cargando…
          </div>
        ) : plansQ.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">No hay planes que coincidan con el filtro.</p>
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
                    <TableHead>Enviado por</TableHead>
                    <TableHead>Resolución</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plansQ.items.map(p => (
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
                      <TableCell className="text-xs">{p.submittedByName ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {p.directionApprovedAt
                          ? <span>{p.directionApproverName ?? '—'} · {new Date(p.directionApprovedAt).toLocaleDateString()}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.statusName === 'PENDING_DIRECTION_APPROVAL' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setApprovePlan(p)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Aprobar
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRejectPlan(p)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Rechazar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{plansQ.totalCount} planes</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={plansQ.page <= 1} onClick={() => plansQ.goToPage(plansQ.page - 1)}>Anterior</Button>
                <span className="flex items-center px-2">Pág {plansQ.page} / {plansQ.totalPages}</span>
                <Button variant="outline" size="sm" disabled={plansQ.page >= plansQ.totalPages} onClick={() => plansQ.goToPage(plansQ.page + 1)}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
        </TabsContent>

        {/* ── Sección: Solicitudes de cambio ── */}
        <TabsContent value="requests" className="space-y-3 mt-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="text-xs">Buscar</Label>
            <Input
              placeholder="Nombre o cédula…"
              className="h-9 w-56"
              onChange={e => reqsQ.setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Estado</Label>
            <select className="h-9 border rounded-md px-3 text-sm bg-background" value={reqStatus}
              onChange={e => setReqStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="REQUESTED">Solicitado</option>
              <option value="PENDING_DIRECTION_APPROVAL">Pend. dirección</option>
              <option value="APPROVED">Aprobado</option>
              <option value="REJECTED">Rechazado</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" className="h-9" value={reqFrom} onChange={e => setReqFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" className="h-9" value={reqTo} onChange={e => setReqTo(e.target.value)} />
          </div>
        </div>

        {reqsQ.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />Cargando…
          </div>
        ) : reqsQ.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">No hay solicitudes que coincidan con el filtro.</p>
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
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Enviado por</TableHead>
                    <TableHead>Resolución</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reqsQ.items.map(r => (
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
                      <TableCell className="text-center">
                        <Badge variant={REQ_STATUS_VARIANT[r.status] ?? 'outline'}>
                          {REQ_STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.submittedByName ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {r.directionApprovedAt
                          ? <span>{new Date(r.directionApprovedAt).toLocaleDateString()}</span>
                          : r.rejectedAt
                            ? <span className="text-destructive">{new Date(r.rejectedAt).toLocaleDateString()}</span>
                            : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === 'PENDING_DIRECTION_APPROVAL' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setApproveReq(r)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Aprobar
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRejectReq(r)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Rechazar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{reqsQ.totalCount} solicitudes</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={reqsQ.page <= 1} onClick={() => reqsQ.goToPage(reqsQ.page - 1)}>Anterior</Button>
                <span className="flex items-center px-2">Pág {reqsQ.page} / {reqsQ.totalPages}</span>
                <Button variant="outline" size="sm" disabled={reqsQ.page >= reqsQ.totalPages} onClick={() => reqsQ.goToPage(reqsQ.page + 1)}>Siguiente</Button>
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
