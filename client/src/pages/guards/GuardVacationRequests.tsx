//src/pages/guards/GuardVacationRequests.tsx
import { useState } from 'react';
import { CalendarCheck, Plus, Loader2, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useVacationRequestMutations,
  useVacationPlansByEmployee,
  useVacationRequestsByEmployee,
} from '@/hooks/guards/useGuards';
import { useAuth } from '@/features/auth';
import type {
  GuardVacationPlanDto,
  CreateChangeDatesRequestDto,
  CreateAccumulateRequestDto,
} from '@/types/guards';

// ─── Constantes ────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  REQUESTED: 'outline',
  PENDING_DIRECTION_APPROVAL: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Solicitado',
  PENDING_DIRECTION_APPROVAL: 'En revisión dirección',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

const TYPE_LABEL: Record<string, string> = {
  CHANGE_DATES: 'Cambio de fechas',
  ACCUMULATE_NEXT_YEAR: 'Acumular al siguiente año',
};

// ─── Formulario cambio de fechas ──────────────────────────────────────────────

function ChangeDatesDialog({
  open,
  plan,
  employeeId,
  onClose,
}: {
  open: boolean;
  plan: GuardVacationPlanDto | null;
  employeeId: number;
  onClose: () => void;
}) {
  const { createChangeDates } = useVacationRequestMutations(() => onClose());
  const today = new Date().toISOString().slice(0, 10);

  const init = {
    requestedStartDate: plan?.plannedStartDate ?? today,
    requestedEndDate: plan?.plannedEndDate ?? today,
    reason: '',
  };
  const [form, setForm] = useState(init);
  const f = <K extends keyof typeof init>(k: K, v: typeof init[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!plan || !form.reason.trim()) return;
    const dto: CreateChangeDatesRequestDto = {
      employeeId,
      guardVacationPlanId: plan.guardVacationPlanId,
      originalStartDate: plan.plannedStartDate,
      originalEndDate: plan.plannedEndDate,
      requestedStartDate: form.requestedStartDate,
      requestedEndDate: form.requestedEndDate,
      sourceYear: plan.vacationYear,
      reason: form.reason.trim(),
    };
    createChangeDates.mutate(dto);
  };

  const canSave = !createChangeDates.isPending && !!form.reason.trim();

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Solicitar cambio de fechas
          </DialogTitle>
        </DialogHeader>
        {plan && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
            <p className="font-medium text-sm text-foreground mb-0.5">Período original</p>
            <p className="font-mono">{plan.plannedStartDate} → {plan.plannedEndDate}</p>
            <p>Año: {plan.vacationYear}</p>
          </div>
        )}
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nueva fecha inicio *</Label>
              <Input type="date" className="h-8 text-sm mt-1" value={form.requestedStartDate}
                onChange={e => { f('requestedStartDate', e.target.value); if (form.requestedEndDate < e.target.value) f('requestedEndDate', e.target.value); }} />
            </div>
            <div>
              <Label className="text-xs">Nueva fecha fin *</Label>
              <Input type="date" className="h-8 text-sm mt-1" value={form.requestedEndDate}
                min={form.requestedStartDate}
                onChange={e => f('requestedEndDate', e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Motivo *</Label>
            <Input className="mt-1" value={form.reason} onChange={e => f('reason', e.target.value)}
              placeholder="Explique el motivo del cambio" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createChangeDates.isPending}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {createChangeDates.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Enviando…</> : 'Solicitar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Formulario acumulación ───────────────────────────────────────────────────

function AccumulateDialog({
  open,
  plan,
  employeeId,
  onClose,
}: {
  open: boolean;
  plan: GuardVacationPlanDto | null;
  employeeId: number;
  onClose: () => void;
}) {
  const { createAccumulate } = useVacationRequestMutations(() => onClose());
  const [reason, setReason] = useState('');

  const handleSave = () => {
    if (!plan || !reason.trim()) return;
    const dto: CreateAccumulateRequestDto = {
      employeeId,
      guardVacationPlanId: plan.guardVacationPlanId,
      originalStartDate: plan.plannedStartDate,
      originalEndDate: plan.plannedEndDate,
      sourceYear: plan.vacationYear,
      targetYear: plan.vacationYear + 1,
      reason: reason.trim(),
    };
    createAccumulate.mutate(dto);
  };

  const canSave = !createAccumulate.isPending && !!reason.trim();

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Solicitar acumulación de vacaciones</DialogTitle></DialogHeader>
        {plan && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
            <p className="font-medium text-sm text-foreground mb-0.5">Vacaciones a acumular</p>
            <p className="font-mono">{plan.plannedStartDate} → {plan.plannedEndDate}</p>
            <p>Año {plan.vacationYear} → acumula al año {plan.vacationYear + 1}</p>
          </div>
        )}
        <div>
          <Label className="text-xs">Motivo *</Label>
          <Input className="mt-1" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Explique el motivo de la acumulación" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createAccumulate.isPending}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {createAccumulate.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Enviando…</> : 'Solicitar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function GuardVacationRequestsPage() {
  const { employeeDetails } = useAuth();
  const employeeId = employeeDetails?.employeeID ?? 0;

  const { data: plansResp, isLoading: loadingPlans } = useVacationPlansByEmployee(
    employeeId > 0 ? employeeId : null,
  );
  const { data: requestsResp, isLoading: loadingRequests } = useVacationRequestsByEmployee(
    employeeId > 0 ? employeeId : null,
  );

  const requests = requestsResp?.status === 'success' ? requestsResp.data : [];

  const activePlanIds = new Set(
    requests
      .filter(r => r.status !== 'REJECTED' && r.status !== 'CANCELLED')
      .map(r => r.guardVacationPlanId),
  );

  const approvedPlans = (plansResp?.status === 'success' ? plansResp.data : [])
    .filter(p => p.statusName === 'APPROVED' && !activePlanIds.has(p.guardVacationPlanId));

  const [selectedPlan, setSelectedPlan] = useState<GuardVacationPlanDto | null>(null);
  const [changeDatesOpen, setChangeDatesOpen] = useState(false);
  const [accumulateOpen, setAccumulateOpen] = useState(false);

  const openChangeDates = (plan: GuardVacationPlanDto) => { setSelectedPlan(plan); setChangeDatesOpen(true); };
  const openAccumulate  = (plan: GuardVacationPlanDto) => { setSelectedPlan(plan); setAccumulateOpen(true); };

  const isLoading = loadingPlans || loadingRequests;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Mis Solicitudes de Vacaciones</h1>
          <p className="text-sm text-muted-foreground">Vista del guardia — solicitudes personales</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />Cargando…
        </div>
      ) : (
        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Mis vacaciones aprobadas</TabsTrigger>
            <TabsTrigger value="requests">Mis solicitudes</TabsTrigger>
          </TabsList>

          {/* Planes APROBADOS — desde aquí puede hacer solicitudes */}
          <TabsContent value="plans" className="mt-4">
            {approvedPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                No tienes vacaciones aprobadas. Solo puedes solicitar cambios o acumulación sobre vacaciones ya aprobadas.
              </p>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-center">Año</TableHead>
                      <TableHead>Aprobado por</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedPlans.map(p => (
                      <TableRow key={p.guardVacationPlanId}>
                        <TableCell className="font-mono text-xs">
                          {p.plannedStartDate} → {p.plannedEndDate}
                        </TableCell>
                        <TableCell className="text-center font-medium">{p.vacationYear}</TableCell>
                        <TableCell className="text-xs">{p.directionApproverName ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                          {p.notes ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openChangeDates(p)}>
                              <Plus className="h-3.5 w-3.5 mr-1" />Cambio de fechas
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openAccumulate(p)}>
                              <Plus className="h-3.5 w-3.5 mr-1" />Acumular
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Historial de solicitudes propias */}
          <TabsContent value="requests" className="mt-4">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                No tienes solicitudes registradas.
              </p>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período original</TableHead>
                      <TableHead>Período solicitado</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead>Fecha solicitud</TableHead>
                      <TableHead>Enviado a dirección</TableHead>
                      <TableHead>Resolución dirección</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map(r => (
                      <TableRow key={r.guardVacationRequestId}>
                        <TableCell className="text-xs font-medium">
                          {TYPE_LABEL[r.requestType] ?? r.requestType}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.originalStartDate} → {r.originalEndDate}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.requestedStartDate
                            ? `${r.requestedStartDate} → ${r.requestedEndDate}`
                            : r.targetYear
                              ? `Año ${r.targetYear}`
                              : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={STATUS_VARIANT[r.status] ?? 'outline'}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {new Date(r.requestedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {r.submittedToDirectionAt
                            ? new Date(r.submittedToDirectionAt).toLocaleDateString()
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.directionApprovedAt
                            ? <span className="font-mono">{new Date(r.directionApprovedAt).toLocaleDateString()}</span>
                            : r.rejectedAt
                              ? <span className="font-mono text-destructive">{new Date(r.rejectedAt).toLocaleDateString()}</span>
                              : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <ChangeDatesDialog
        open={changeDatesOpen}
        plan={selectedPlan}
        employeeId={employeeId}
        onClose={() => { setChangeDatesOpen(false); setSelectedPlan(null); }}
      />
      <AccumulateDialog
        open={accumulateOpen}
        plan={selectedPlan}
        employeeId={employeeId}
        onClose={() => { setAccumulateOpen(false); setSelectedPlan(null); }}
      />
    </div>
  );
}
