//src/pages/guards/GuardVacationPlans.tsx
import { useState } from 'react';
import { CalendarDays, Plus, Loader2, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useVacationPlansPaged,
  useVacationRequestsPaged,
  useVacationPlanMutations,
  useVacationRequestMutations,
} from '@/hooks/guards/useGuards';
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox';
import type {
  CreateGuardVacationPlanDto,
  GuardVacationPlanDto,
  GuardVacationRequestDto,
  SubmitToDirectionDto,
  RejectGuardVacationPlanDto,
  RejectGuardVacationRequestDto,
} from '@/types/guards';

// ─── Status badge helpers ─────────────────────────────────────────────────────

const PLAN_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PLANNED: 'outline',
  PENDING_DIRECTION_APPROVAL: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
};

const PLAN_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planificado',
  PENDING_DIRECTION_APPROVAL: 'En revisión dirección',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

const REQ_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  REQUESTED: 'outline',
  PENDING_DIRECTION_APPROVAL: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

const REQ_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Solicitado',
  PENDING_DIRECTION_APPROVAL: 'En revisión dirección',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

const TYPE_LABEL: Record<string, string> = {
  CHANGE_DATES: 'Cambio de fechas',
  ACCUMULATE_NEXT_YEAR: 'Acumular al siguiente año',
};

// ─── Nuevo plan dialog ────────────────────────────────────────────────────────

function PlanFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const { create } = useVacationPlanMutations(() => onClose());

  const initialForm = {
    employeeId: '' as number | '',
    vacationYear: currentYear,
    plannedStartDate: today,
    plannedEndDate: today,
    notes: '',
  };
  const [form, setForm] = useState(initialForm);
  const f = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleOpenChange = (v: boolean) => {
    if (!v) { setForm(initialForm); onClose(); }
  };

  const handleSave = () => {
    if (form.employeeId === '' || !form.plannedStartDate || !form.plannedEndDate) return;
    if (form.plannedStartDate < today) return;
    if (form.vacationYear < currentYear) return;
    const dto: CreateGuardVacationPlanDto = {
      employeeId: Number(form.employeeId),
      vacationYear: form.vacationYear,
      plannedStartDate: form.plannedStartDate,
      plannedEndDate: form.plannedEndDate,
      notes: form.notes || undefined,
    };
    create.mutate(dto);
  };

  const startDateInvalid = !!form.plannedStartDate && form.plannedStartDate < today;
  const yearInvalid = form.vacationYear < currentYear;
  const canSave = !create.isPending && form.employeeId !== '' && !!form.plannedStartDate &&
    !!form.plannedEndDate && !startDateInvalid && !yearInvalid;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Nuevo plan de vacaciones</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label>Guardia *</Label>
            <EmployeeCombobox value={form.employeeId !== '' ? Number(form.employeeId) : null}
              onSelect={(id) => f('employeeId', id ?? '')} placeholder="Buscar guardia…" />
          </div>
          <div>
            <Label>Año de vacaciones *</Label>
            <Input type="number" value={form.vacationYear} min={currentYear} max={currentYear + 5}
              onChange={e => f('vacationYear', Number(e.target.value))} />
            {yearInvalid && <p className="text-xs text-destructive mt-1">El año no puede ser anterior al año en curso.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Inicio planificado *</Label>
              <Input type="date" value={form.plannedStartDate} min={today}
                onChange={e => { f('plannedStartDate', e.target.value); if (form.plannedEndDate < e.target.value) f('plannedEndDate', e.target.value); }} />
              {startDateInvalid && <p className="text-xs text-destructive mt-1">No puede ser fecha pasada.</p>}
            </div>
            <div>
              <Label>Fin planificado *</Label>
              <Input type="date" value={form.plannedEndDate} min={form.plannedStartDate || today}
                onChange={e => f('plannedEndDate', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Input value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Observaciones" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={create.isPending}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {create.isPending ? 'Guardando…' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirm send to direction dialog ────────────────────────────────────────

function SubmitToDirectionDialog({
  open,
  title,
  onConfirm,
  onClose,
  isPending,
}: {
  open: boolean;
  title: string;
  onConfirm: (notes: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState('');
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" />Enviar a dirección</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{title}</p>
        <div>
          <Label className="text-xs">Notas del informe <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea className="mt-1 text-sm" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Observaciones para la dirección…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={() => onConfirm(notes)} disabled={isPending}>
            {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Enviando…</> : <><Send className="h-3.5 w-3.5 mr-2" />Enviar a dirección</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  open,
  title,
  onConfirm,
  onClose,
  isPending,
}: {
  open: boolean;
  title: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><XCircle className="h-4 w-4" />Rechazar</DialogTitle></DialogHeader>
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

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function GuardVacationPlansPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number | undefined>(currentYear);

  const plansQ = useVacationPlansPaged(20, { year, status: 'PLANNED' });
  const requestsQ = useVacationRequestsPaged(20, { status: 'REQUESTED' });
  const historyPlansQ = useVacationPlansPaged(20, { year });

  const planMutations = useVacationPlanMutations();
  const requestMutations = useVacationRequestMutations();

  const [createOpen, setCreateOpen] = useState(false);

  // Send plan to direction
  const [submitPlan, setSubmitPlan] = useState<GuardVacationPlanDto | null>(null);
  const [rejectPlan, setRejectPlan] = useState<GuardVacationPlanDto | null>(null);

  // Send request to direction
  const [submitRequest, setSubmitRequest] = useState<GuardVacationRequestDto | null>(null);
  const [rejectRequest, setRejectRequest] = useState<GuardVacationRequestDto | null>(null);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Revisión de Vacaciones</h1>
            <p className="text-sm text-muted-foreground">Vista del jefe/supervisor — gestión y envío a dirección</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Nuevo plan
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm">Año:</Label>
        <select className="h-9 border rounded-md px-3 text-sm bg-background" value={year ?? ''}
          onChange={e => setYear(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Todos</option>
          {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">
            Planes pendientes
            {plansQ.totalCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{plansQ.totalCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests">
            Solicitudes guardias
            {requestsQ.totalCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{requestsQ.totalCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* ── Planes PLANNED ── */}
        <TabsContent value="plans" className="mt-4">
          {plansQ.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Cargando…
            </div>
          ) : plansQ.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No hay planes pendientes.</p>
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guardia</TableHead>
                      <TableHead className="text-center">Año</TableHead>
                      <TableHead>Período planificado</TableHead>
                      <TableHead>Notas</TableHead>
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
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{p.notes ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSubmitPlan(p)}>
                              <Send className="h-3.5 w-3.5 mr-1" />Enviar a dirección
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

        {/* ── Solicitudes REQUESTED ── */}
        <TabsContent value="requests" className="mt-4">
          {requestsQ.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Cargando…
            </div>
          ) : requestsQ.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No hay solicitudes pendientes.</p>
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
                      <TableHead>Motivo</TableHead>
                      <TableHead>Solicitud</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestsQ.items.map(r => (
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
                        <TableCell className="text-xs max-w-[140px] truncate">{r.reason}</TableCell>
                        <TableCell className="text-xs font-mono">{new Date(r.requestedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSubmitRequest(r)}>
                              <Send className="h-3.5 w-3.5 mr-1" />Enviar a dirección
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRejectRequest(r)}>
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
                <span>{requestsQ.totalCount} solicitudes</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={requestsQ.page <= 1} onClick={() => requestsQ.goToPage(requestsQ.page - 1)}>Anterior</Button>
                  <span className="flex items-center px-2">Pág {requestsQ.page} / {requestsQ.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={requestsQ.page >= requestsQ.totalPages} onClick={() => requestsQ.goToPage(requestsQ.page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Historial ── */}
        <TabsContent value="history" className="mt-4">
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
                      <TableHead>Enviado a dirección</TableHead>
                      <TableHead>Aprobado/rechazado</TableHead>
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
      </Tabs>

      <PlanFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Enviar plan a dirección */}
      <SubmitToDirectionDialog
        open={!!submitPlan}
        title={submitPlan ? `Plan de ${submitPlan.employeeFullName} (${submitPlan.plannedStartDate} → ${submitPlan.plannedEndDate})` : ''}
        isPending={planMutations.submitToDirection.isPending}
        onConfirm={(notes) => {
          if (!submitPlan) return;
          const dto: SubmitToDirectionDto = { notes: notes || undefined };
          planMutations.submitToDirection.mutate({ id: submitPlan.guardVacationPlanId, dto },
            { onSuccess: (res) => { if (res.status === 'success') setSubmitPlan(null); } });
        }}
        onClose={() => setSubmitPlan(null)}
      />

      {/* Rechazar plan */}
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

      {/* Enviar solicitud a dirección */}
      <SubmitToDirectionDialog
        open={!!submitRequest}
        title={submitRequest ? `Solicitud de ${submitRequest.employeeFullName} — ${TYPE_LABEL[submitRequest.requestType] ?? submitRequest.requestType}` : ''}
        isPending={requestMutations.submitToDirection.isPending}
        onConfirm={(notes) => {
          if (!submitRequest) return;
          const dto: SubmitToDirectionDto = { notes: notes || undefined };
          requestMutations.submitToDirection.mutate({ id: submitRequest.guardVacationRequestId, dto },
            { onSuccess: (res) => { if (res.status === 'success') setSubmitRequest(null); } });
        }}
        onClose={() => setSubmitRequest(null)}
      />

      {/* Rechazar solicitud */}
      <RejectDialog
        open={!!rejectRequest}
        title={rejectRequest ? `Solicitud de ${rejectRequest.employeeFullName} — ${TYPE_LABEL[rejectRequest.requestType] ?? rejectRequest.requestType}` : ''}
        isPending={requestMutations.reject.isPending}
        onConfirm={(reason) => {
          if (!rejectRequest) return;
          const dto: RejectGuardVacationRequestDto = { reason };
          requestMutations.reject.mutate({ id: rejectRequest.guardVacationRequestId, dto },
            { onSuccess: (res) => { if (res.status === 'success') setRejectRequest(null); } });
        }}
        onClose={() => setRejectRequest(null)}
      />
    </div>
  );
}
