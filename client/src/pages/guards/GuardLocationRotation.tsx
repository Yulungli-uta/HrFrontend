// src/pages/guards/GuardLocationRotation.tsx
import { useState } from 'react';
import { MapPin, Plus, Loader2, ChevronLeft, ChevronRight, Users, Building2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useLocationRotationPeriods, useLocationRotationPeriodsPaged,
  useLocationRotationAssignments, useLocationRotationMutations,
  useGuardLocationsAssignable, useGuardRotationGroups,
} from '@/hooks/guards/useGuards';
import type {
  GuardLocationRotationPeriodDto, GuardLocationRotationAssignmentDto,
  CreateGuardLocationRotationPeriodDto, UpdateGuardLocationRotationPeriodDto,
  CreateGuardLocationRotationAssignmentDto,
} from '@/types/guards';

// ─── Period form dialog ────────────────────────────────────────────────────────

type PeriodForm = { name: string; startDate: string; endDate: string; notes: string; isActive: boolean };

function PeriodFormDialog({
  open, onClose, editTarget,
}: {
  open: boolean;
  onClose: () => void;
  editTarget: GuardLocationRotationPeriodDto | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const { createPeriod, updatePeriod } = useLocationRotationMutations(() => onClose());
  const [form, setForm] = useState<PeriodForm>(() => editTarget
    ? { name: editTarget.name, startDate: editTarget.startDate, endDate: editTarget.endDate, notes: editTarget.notes ?? '', isActive: editTarget.isActive }
    : { name: '', startDate: today, endDate: today, notes: '', isActive: true }
  );

  const f = <K extends keyof PeriodForm>(k: K, v: PeriodForm[K]) => setForm(p => ({ ...p, [k]: v }));
  const isSaving = createPeriod.isPending || updatePeriod.isPending;

  const handleSave = () => {
    if (!form.name.trim() || !form.startDate || !form.endDate) return;
    if (editTarget) {
      const dto: UpdateGuardLocationRotationPeriodDto = {
        name: form.name.trim(), startDate: form.startDate, endDate: form.endDate,
        notes: form.notes || undefined, isActive: form.isActive,
      };
      updatePeriod.mutate({ id: editTarget.locationRotationPeriodId, dto });
    } else {
      const dto: CreateGuardLocationRotationPeriodDto = {
        name: form.name.trim(), startDate: form.startDate, endDate: form.endDate,
        notes: form.notes || undefined,
      };
      createPeriod.mutate(dto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{editTarget ? 'Editar periodo' : 'Nuevo periodo de rotación'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Ej: Rotación 2026-Q1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Inicio *</Label>
              <Input type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} />
            </div>
            <div>
              <Label>Fin *</Label>
              <Input type="date" value={form.endDate} min={form.startDate} onChange={e => f('endDate', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Input value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Observaciones opcionales" />
          </div>
          {editTarget && (
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={v => f('isActive', v)} />
              <Label>Activo</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || !form.name.trim() || !form.startDate || !form.endDate}>
            {isSaving ? 'Guardando…' : editTarget ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assignment form dialog ────────────────────────────────────────────────────

function AssignmentFormDialog({
  open, onClose, periodId,
}: {
  open: boolean;
  onClose: () => void;
  periodId: number;
}) {
  const { data: locData } = useGuardLocationsAssignable();
  const { data: grpData } = useGuardRotationGroups();
  const locations = locData?.status === 'success' ? locData.data : [];
  const groups = grpData?.status === 'success' ? grpData.data : [];
  const { createAssignment } = useLocationRotationMutations(() => onClose());

  const [form, setForm] = useState({
    groupId: '' as number | '',
    employeeId: '' as number | '',
    locationId: '' as number | '',
    isFixedLocation: false,
    isFixedSchedule: false,
    notes: '',
  });
  const f = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.locationId) return;
    const dto: CreateGuardLocationRotationAssignmentDto = {
      locationRotationPeriodId: periodId,
      locationId: Number(form.locationId),
      groupId: form.groupId !== '' ? Number(form.groupId) : undefined,
      isFixedLocation: form.isFixedLocation,
      isFixedSchedule: form.isFixedSchedule,
      notes: form.notes || undefined,
    };
    createAssignment.mutate(dto);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Nueva asignación</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label>Grupo (opcional)</Label>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={form.groupId}
              onChange={e => f('groupId', e.target.value !== '' ? Number(e.target.value) : '')}
            >
              <option value="">Sin grupo</option>
              {groups.map(g => <option key={g.groupId} value={g.groupId}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Ubicación asignada *</Label>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={form.locationId}
              onChange={e => f('locationId', e.target.value !== '' ? Number(e.target.value) : '')}
            >
              <option value="">Seleccionar…</option>
              {locations.map(l => (
                <option key={l.locationId} value={l.locationId}>
                  {l.locationCode ? `[${l.locationCode}] ` : ''}{l.locationName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.isFixedLocation} onCheckedChange={v => f('isFixedLocation', v)} />
              <Label className="text-sm">Ubicación fija</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isFixedSchedule} onCheckedChange={v => f('isFixedSchedule', v)} />
              <Label className="text-sm">Turno fijo</Label>
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Input value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Observaciones" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createAssignment.isPending}>Cancelar</Button>
          <Button onClick={handleSave} disabled={createAssignment.isPending || !form.locationId}>
            {createAssignment.isPending ? 'Guardando…' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Period detail view ────────────────────────────────────────────────────────

function PeriodDetailView({
  period, onBack,
}: {
  period: GuardLocationRotationPeriodDto;
  onBack: () => void;
}) {
  const { data, isLoading } = useLocationRotationAssignments(period.locationRotationPeriodId);
  const { deleteAssignment } = useLocationRotationMutations();
  const assignments: GuardLocationRotationAssignmentDto[] =
    data?.status === 'success' ? (data.data ?? []) : [];

  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1 pl-1" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />Periodos
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{period.name}</span>
        <Badge variant="outline" className="font-mono text-xs">{period.startDate} → {period.endDate}</Badge>
        <Badge variant={period.isActive ? 'default' : 'secondary'}>{period.isActive ? 'Activo' : 'Inactivo'}</Badge>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />Nueva asignación
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />Cargando…
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Sin asignaciones en este periodo.</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo / Guardia</TableHead>
                <TableHead>Ubicación asignada</TableHead>
                <TableHead className="text-center">Fija ubic.</TableHead>
                <TableHead className="text-center">Fija turno</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map(a => (
                <TableRow key={a.locationRotationAssignmentId}>
                  <TableCell>
                    {a.groupName && <p className="text-sm font-medium">{a.groupName}</p>}
                    {a.employeeFullName && <p className="text-xs text-muted-foreground">{a.employeeFullName}</p>}
                    {!a.groupName && !a.employeeFullName && <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{a.locationName}</p>
                    {a.locationCode && <p className="text-xs text-muted-foreground font-mono">{a.locationCode}</p>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={a.isFixedLocation ? 'default' : 'outline'} className="text-xs">
                      {a.isFixedLocation ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={a.isFixedSchedule ? 'default' : 'outline'} className="text-xs">
                      {a.isFixedSchedule ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={a.isActive ? 'default' : 'secondary'} className="text-xs">
                      {a.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteAssignment.mutate({ id: a.locationRotationAssignmentId })}
                      disabled={deleteAssignment.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AssignmentFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        periodId={period.locationRotationPeriodId}
      />
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function GuardLocationRotationPage() {
  const { data, isLoading } = useLocationRotationPeriods();
  const periods: GuardLocationRotationPeriodDto[] = data?.status === 'success' ? (data.data ?? []) : [];

  const [selected, setSelected] = useState<GuardLocationRotationPeriodDto | null>(null);
  const [periodForm, setPeriodForm] = useState<{ open: boolean; edit: GuardLocationRotationPeriodDto | null }>({
    open: false, edit: null,
  });

  if (selected) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Rotación de Ubicaciones</h1>
        </div>
        <PeriodDetailView period={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Rotación de Ubicaciones</h1>
        </div>
        <Button size="sm" onClick={() => setPeriodForm({ open: true, edit: null })}>
          <Plus className="h-4 w-4 mr-1" />Nuevo periodo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />Cargando…
        </div>
      ) : periods.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No hay periodos de rotación registrados.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {periods.map(p => (
            <Card
              key={p.locationRotationPeriodId}
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
              onClick={() => setSelected(p)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Badge variant={p.isActive ? 'default' : 'secondary'} className="shrink-0">
                    {p.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {p.startDate} → {p.endDate}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{p.assignmentCount} asignaciones</span>
                  </div>
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={e => { e.stopPropagation(); setPeriodForm({ open: true, edit: p }); }}
                  >
                    Editar
                  </Button>
                </div>
                {p.notes && <p className="text-xs text-muted-foreground mt-2 truncate">{p.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PeriodFormDialog
        open={periodForm.open}
        onClose={() => setPeriodForm({ open: false, edit: null })}
        editTarget={periodForm.edit}
      />
    </div>
  );
}
