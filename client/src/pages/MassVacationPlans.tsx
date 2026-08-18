// src/pages/MassVacationPlans.tsx
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataPagination } from '@/components/ui/DataPagination';
import { CalendarRange, Plus, Loader2, Ban, Building2, Globe, Search, X, Clock, Pencil, Eye, ListChecks } from 'lucide-react';
import {
  MassVacationPlansAPI,
  type MassVacationPlanDto,
  type MassVacationPlanRosterItemDto,
  type MassVacationPlanStatus,
} from '@/lib/api';
import { DepartmentSelect } from '@/components/departments/DepartmentSelect';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/lib/error-handling';
import { usePaged } from '@/hooks/pagination/usePaged';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 5);
}

function statusBadgeVariant(status: MassVacationPlanStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'FINISHED':
      return 'default';
    case 'IN_PROGRESS':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
}

function todayIsoTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Diálogo: crear/editar plan ─────────────────────────────────────────────

function CreatePlanDialog({
  open,
  editPlan,
  onClose,
  onSaved,
}: {
  open: boolean;
  editPlan?: MassVacationPlanDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEditMode = !!editPlan;
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hourlyMode, setHourlyMode] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);

  const { setIsFormDirty, handleOpenChange, close, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard((isOpen) => { if (!isOpen) onClose(); });

  const reset = () => {
    setDepartmentId(null);
    setDescription('');
    setStartDate('');
    setEndDate('');
    setHourlyMode(false);
    setStartTime('');
    setEndTime('');
    setIsFormDirty(false);
  };

  useEffect(() => {
    if (!open) return;
    if (editPlan) {
      setDepartmentId(editPlan.departmentId);
      setDescription(editPlan.description ?? '');
      setStartDate(editPlan.startDate.slice(0, 10));
      setEndDate(editPlan.endDate.slice(0, 10));
      setHourlyMode(!!(editPlan.startTime && editPlan.endTime));
      setStartTime(editPlan.startTime ? editPlan.startTime.slice(0, 5) : '');
      setEndTime(editPlan.endTime ? editPlan.endTime.slice(0, 5) : '');
    } else {
      reset();
    }
    setIsFormDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editPlan?.planId]);

  const markDirty = () => setIsFormDirty(true);

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Datos incompletos', description: 'Indique fecha de inicio y fin.', variant: 'destructive' });
      return;
    }
    if (endDate < startDate) {
      toast({ title: 'Fechas inválidas', description: 'La fecha de fin no puede ser anterior al inicio.', variant: 'destructive' });
      return;
    }
    const tomorrow = todayIsoTomorrow();
    if (startDate < tomorrow) {
      toast({ title: 'Fecha inválida', description: 'La fecha de inicio debe ser estrictamente futura: se planifica antes de que llegue el día, no el mismo día.', variant: 'destructive' });
      return;
    }
    if (hourlyMode) {
      if (!startTime || !endTime) {
        toast({ title: 'Datos incompletos', description: 'Indique hora de inicio y de fin para el modo por horas.', variant: 'destructive' });
        return;
      }
      if (startDate !== endDate) {
        toast({ title: 'Modo por horas', description: 'El modo por horas solo aplica a un único día: la fecha de inicio debe ser igual a la de fin.', variant: 'destructive' });
        return;
      }
      if (endTime <= startTime) {
        toast({ title: 'Horas inválidas', description: 'La hora de fin debe ser posterior a la hora de inicio.', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        departmentId,
        description: description.trim() || null,
        startDate,
        endDate,
        startTime: hourlyMode ? `${startTime}:00` : null,
        endTime: hourlyMode ? `${endTime}:00` : null,
        vacationYear: new Date(startDate).getFullYear(),
      };
      const res = isEditMode
        ? await MassVacationPlansAPI.update(editPlan!.planId, payload)
        : await MassVacationPlansAPI.create(payload);
      if (res.status === 'error') {
        toast({ title: 'Error', description: parseApiError(res.error).message, variant: 'destructive' });
        return;
      }
      toast(
        isEditMode
          ? { title: 'Plan actualizado' }
          : { title: 'Plan creado', description: 'Quedó en estado Planificado. Puede gestionar las exclusiones hasta que llegue la fecha de inicio.' }
      );
      reset();
      onSaved();
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Editar Planificación Masiva de Vacaciones' : 'Nueva Planificación Masiva de Vacaciones'}</DialogTitle>
            <DialogDescription>
              Cierre colectivo institucional o de un departamento. La fecha de inicio debe ser
              futura — el paso a "En Ejecución" (con descuento automático de saldo) ocurre solo
              cuando llega esa fecha, nunca de forma manual. Las personas que trabajarán
              normalmente se excluyen después, individualmente, mientras el plan esté Planificado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Alcance</Label>
              <DepartmentSelect
                value={departmentId}
                onChange={(v) => { setDepartmentId(v); markDirty(); }}
                placeholder="Toda la institución (dejar vacío) o elegir departamento…"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                placeholder="Ej: Cierre institucional de fin de año, receso de vacaciones colectivas…"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fecha inicio</Label>
                <Input
                  type="date"
                  min={todayIsoTomorrow()}
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); if (hourlyMode) setEndDate(e.target.value); markDirty(); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fecha fin</Label>
                <Input
                  type="date"
                  min={startDate || todayIsoTomorrow()}
                  value={endDate}
                  disabled={hourlyMode}
                  onChange={(e) => { setEndDate(e.target.value); markDirty(); }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Planificar por horas</p>
                  <p className="text-xs text-muted-foreground">Solo un día específico, en una franja horaria puntual</p>
                </div>
              </div>
              <Switch
                checked={hourlyMode}
                onCheckedChange={(checked) => {
                  setHourlyMode(checked);
                  if (checked && startDate) setEndDate(startDate);
                  markDirty();
                }}
              />
            </div>

            {hourlyMode && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hora inicio</Label>
                  <Input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); markDirty(); }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hora fin</Label>
                  <Input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); markDirty(); }} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {isEditMode ? 'Guardar Cambios' : 'Crear Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />
    </>
  );
}

// ─── Diálogo: roster + exclusión + anulación ───────────────────────────────

function PlanDetailDialog({ plan, onClose, onChanged }: { plan: MassVacationPlanDto | null; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [showOnlyExcluded, setShowOnlyExcluded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['mass-vacation-plan-roster', plan?.planId],
    queryFn: () => MassVacationPlansAPI.getRoster(plan!.planId),
    enabled: !!plan,
  });

  const roster: MassVacationPlanRosterItemDto[] = data?.status === 'success' ? data.data ?? [] : [];
  const isPlanned = plan?.status === 'PLANNED';

  const filteredRoster = useMemo(() => {
    const term = rosterSearch.trim().toLowerCase();
    return roster.filter((item) => {
      if (showOnlyExcluded && !item.isExcluded) return false;
      if (!term) return true;
      return item.fullName.toLowerCase().includes(term) || item.idCard.toLowerCase().includes(term);
    });
  }, [roster, rosterSearch, showOnlyExcluded]);

  const toggleExclusion = async (item: MassVacationPlanRosterItemDto) => {
    if (!plan || !isPlanned) return;
    setTogglingId(item.employeeId);
    try {
      const res = await MassVacationPlansAPI.setExclusion(plan.planId, {
        employeeId: item.employeeId,
        isExcluded: !item.isExcluded,
      });
      if (res.status === 'error') {
        toast({ title: 'Error', description: parseApiError(res.error).message, variant: 'destructive' });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['mass-vacation-plan-roster', plan.planId] });
      onChanged();
    } finally {
      setTogglingId(null);
    }
  };

  const handleCancel = async () => {
    if (!plan) return;
    setCancelling(true);
    try {
      const res = await MassVacationPlansAPI.cancel(plan.planId);
      if (res.status === 'error') {
        toast({ title: 'Error al anular', description: parseApiError(res.error).message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Plan anulado' });
      onChanged();
      onClose();
    } finally {
      setCancelling(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={!!plan} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {plan.departmentId ? <Building2 className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            {plan.departmentName ?? 'Toda la institución'}
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">
              {formatDate(plan.startDate)}
              {plan.startTime && plan.endTime ? ` (${formatTime(plan.startTime)} – ${formatTime(plan.endTime)})` : ` — ${formatDate(plan.endDate)}`}
              {' · '}
              <Badge variant={statusBadgeVariant(plan.status)}>{plan.statusLabel}</Badge>
            </span>
            {plan.description && <span className="block text-muted-foreground">{plan.description}</span>}
          </DialogDescription>
        </DialogHeader>

        {!isPlanned && (
          <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
            {plan.status === 'IN_PROGRESS' && 'Este plan ya está En Ejecución — la fecha de inicio ya pasó, las exclusiones quedaron fijas y el saldo ya se descontó automáticamente. Pasará a Finalizado solo cuando termine el período.'}
            {plan.status === 'FINISHED' && 'Este plan ya finalizó — es solo de consulta.'}
            {plan.status === 'CANCELLED' && 'Este plan fue anulado antes de llegar a su fecha de inicio; no tuvo efecto en el saldo de nadie.'}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nombre o cédula…"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm whitespace-nowrap px-1">
            <Checkbox checked={showOnlyExcluded} onCheckedChange={(v) => setShowOnlyExcluded(!!v)} />
            Solo excluidos (trabajan normalmente)
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando personal…
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto max-h-[45vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Dependencia</TableHead>
                  <TableHead className="text-center">Trabaja normalmente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoster.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                      Sin resultados para el filtro actual.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoster.map((item) => (
                    <TableRow key={item.employeeId}>
                      <TableCell>
                        <p className="text-sm font-medium">{item.fullName}</p>
                        <p className="text-xs text-muted-foreground">{item.idCard}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.departmentName ?? '—'}</TableCell>
                      <TableCell className="text-center">
                        {togglingId === item.employeeId ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        ) : (
                          <Checkbox
                            checked={item.isExcluded}
                            disabled={!isPlanned}
                            onCheckedChange={() => toggleExclusion(item)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {roster.filter((r) => r.isExcluded).length} de {roster.length} trabajan normalmente
          </p>
          {isPlanned && (
            <Button onClick={handleCancel} disabled={cancelling} variant="destructive">
              {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Ban className="h-3.5 w-3.5 mr-1" />}
              Anular Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Botón de acción con ícono + tooltip ───────────────────────────────────

function IconActionButton({
  icon,
  tooltip,
  onClick,
  variant = 'ghost',
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  variant?: 'ghost' | 'outline';
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function MassVacationPlansPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MassVacationPlanDto | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MassVacationPlanDto | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const {
    items: plans,
    isLoading,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
    setSearch,
    currentParams,
  } = usePaged<MassVacationPlanDto>({
    queryKey: ['mass-vacation-plans', fromDate, toDate],
    queryFn: (params) => MassVacationPlansAPI.listPagedFiltered({ ...params, fromDate: fromDate || undefined, toDate: toDate || undefined }),
    initialPageSize: 20,
  });

  const queryClient = useQueryClient();
  const refetch = () => queryClient.invalidateQueries({ queryKey: ['mass-vacation-plans'] });

  const clearDateFilters = () => { setFromDate(''); setToDate(''); };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CalendarRange className="h-6 w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Planificación Masiva de Vacaciones</h1>
            <p className="text-sm text-muted-foreground">Cierres colectivos institucionales o por departamento</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo Plan
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
            Planes ({totalCount})
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por descripción…"
                defaultValue={currentParams.search ?? ''}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input type="date" className="sm:w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="Desde" />
            <Input type="date" className="sm:w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="Hasta" />
            {(fromDate || toDate) && (
              <Button variant="ghost" size="icon" onClick={clearDateFilters} title="Limpiar fechas">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
            </div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">Sin planes que coincidan con el filtro.</p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alcance</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-center">Personal</TableHead>
                    <TableHead className="text-center">Excluidos</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p.planId} className="cursor-pointer" onClick={() => setSelectedPlan(p)}>
                      <TableCell className="flex items-center gap-2 text-sm">
                        {p.departmentId ? <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                        {p.departmentName ?? 'Toda la institución'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">{p.description ?? '—'}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatDate(p.startDate)}
                        {p.startTime && p.endTime ? ` (${formatTime(p.startTime)}–${formatTime(p.endTime)})` : ` — ${formatDate(p.endDate)}`}
                      </TableCell>
                      <TableCell className="text-center text-sm">{p.totalEmployeesInScope}</TableCell>
                      <TableCell className="text-center text-sm">{p.totalExcluded}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusBadgeVariant(p.status)}>{p.statusLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === 'PLANNED' && (
                            <IconActionButton
                              icon={<Pencil className="h-4 w-4" />}
                              tooltip="Editar plan"
                              onClick={() => setEditingPlan(p)}
                            />
                          )}
                          <IconActionButton
                            icon={p.status === 'PLANNED' ? <ListChecks className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            tooltip={p.status === 'PLANNED' ? 'Gestionar exclusiones' : 'Ver detalle'}
                            onClick={() => setSelectedPlan(p)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DataPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPageChange={goToPage}
            onPageSizeChange={setPageSize}
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <CreatePlanDialog open={showCreate} onClose={() => setShowCreate(false)} onSaved={refetch} />
      <CreatePlanDialog
        open={!!editingPlan}
        editPlan={editingPlan}
        onClose={() => setEditingPlan(null)}
        onSaved={refetch}
      />
      <PlanDetailDialog
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onChanged={refetch}
      />
    </div>
  );
}
