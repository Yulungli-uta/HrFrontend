//src/pages/guards/GuardRotationGroups.tsx
import { useState } from 'react';
import {
  Users, Plus, MapPin, Shield, ChevronRight, ChevronLeft,
  Loader2, UserMinus, X, Building2, RotateCw, ChevronDown, ChevronUp,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox';
import { GroupPatternAssignmentDialog } from '@/components/guards/GroupPatternAssignmentDialog';
import {
  useLocationSummary, useGroupsByLocation, useGuardGroupEmployees,
  useGuardGroupMutations, useGeneralGroupsWithSubgroups, useGeneralGroups,
  useGuardRefTypes, useEmployeeLocationAssignments, useLocationRotationMutations,
  useGuardLocationsAssignable, useLocationRotationPeriods, useLocationRotationAssignments,
  useGroupPatterns,
} from '@/hooks/guards/useGuards';
import type {
  LocationSummaryDto, LocationGroupDetailDto,
  GuardRotationGroupDto, GuardRotationGroupWithSubgroupsDto,
  GuardRotationGroupEmployeeDto,
  CreateGuardRotationGroupDto, UpdateGuardRotationGroupDto,
  RemoveEmployeeFromRotationGroupDto, AssignEmployeeToRotationGroupDto,
  GuardLocationRotationAssignmentDto,
} from '@/types/guards';

// ─── helpers ──────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

const SEQ_COLORS: Record<string, string> = {
  L: 'bg-slate-100 text-slate-600',
  M: 'bg-yellow-100 text-yellow-700',
  T: 'bg-orange-100 text-orange-700',
  N: 'bg-indigo-100 text-indigo-700',
};

function PatternChips({ sequence }: { sequence: string | null }) {
  if (!sequence) return <span className="text-xs text-muted-foreground">—</span>;
  const labels: Record<string, string> = { L: 'Libre', M: 'Mañana', T: 'Tarde', N: 'Noche' };
  return (
    <div className="flex flex-wrap gap-0.5">
      {sequence.split('').map((c, i) => (
        <span
          key={i}
          title={labels[c] ?? c}
          className={`w-5 h-5 rounded text-xs flex items-center justify-center font-medium ${SEQ_COLORS[c] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function ColorDot({ color }: { color?: string | null }) {
  if (!color) return <div className="w-3 h-3 rounded-full bg-muted border shrink-0" />;
  return <div className="w-3 h-3 rounded-full shrink-0 border" style={{ backgroundColor: color }} />;
}

// Carga el patrón activo del grupo y lo muestra inline.
// variant="badge"  → chip compacto para headers de card (una línea)
// variant="cell"   → bloque con nombre + fechas para celdas de tabla
function GroupActivePattern({
  groupId,
  onAssign,
  variant = 'cell',
}: {
  groupId: number;
  onAssign: () => void;
  variant?: 'badge' | 'cell';
}) {
  const { data, isLoading } = useGroupPatterns(groupId);
  const patterns = data?.status === 'success' ? data.data : [];
  const active = patterns.find(p => p.isActive) ?? null;

  if (isLoading) return (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
    </span>
  );

  if (!active) return (
    <button
      onClick={onAssign}
      className="text-xs text-muted-foreground italic hover:text-primary transition-colors underline-offset-2 hover:underline"
    >
      Sin patrón
    </button>
  );

  if (variant === 'badge') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
        title={`Desde ${active.validFrom} · Inicio ciclo: ${active.startCycleDate}`}
        onClick={onAssign}
      >
        {active.patternCode ?? active.patternName}
      </span>
    );
  }

  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-foreground leading-tight">{active.patternName}</p>
      <p className="text-[10px] text-muted-foreground">
        Desde {active.validFrom} · Ciclo: {active.startCycleDate}
      </p>
    </div>
  );
}

function toLocationDetail(g: {
  groupId: number;
  groupCode: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  employeeCount: number;
}): LocationGroupDetailDto {
  return {
    groupId: g.groupId, groupCode: g.groupCode, groupName: g.name,
    description: g.description, isActive: g.isActive,
    patternId: null, patternCode: null, patternName: null,
    patternSequence: null, patternReadable: null,
    assignedEmployees: g.employeeCount,
  };
}

// ─── EmployeeLocationSection ──────────────────────────────────────────────────
// Muestra la asignación actual y un select para cambiarla; sin botón de guardar propio.
// El guardado se maneja en el padre (GroupEmployeesPanel) con un botón único.

function EmployeeLocationSection({
  employeeId,
  locations,
  activePeriod,
  pendingLocationId,
  pendingDelete,
  onPendingChange,
  onMarkDelete,
  onCancelPending,
}: {
  employeeId: number;
  locations: { locationId: number; locationCode: string | null; locationName: string }[];
  activePeriod: { locationRotationPeriodId: number; name: string } | null;
  pendingLocationId: number | '';
  pendingDelete: boolean;
  onPendingChange: (empId: number, locId: number | '', existingAssignmentId: number | null) => void;
  onMarkDelete: (empId: number, existingAssignmentId: number) => void;
  onCancelPending: (empId: number) => void;
}) {
  const { data, isLoading } = useEmployeeLocationAssignments(employeeId);
  const assignments: GuardLocationRotationAssignmentDto[] =
    data?.status === 'success' ? data.data : [];
  const currentAssignment = assignments.length > 0 ? assignments[0] : null;

  if (isLoading) return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
      <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
    </div>
  );

  // Estado: pendiente de eliminación
  if (pendingDelete && currentAssignment) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 font-medium line-through">
          <MapPin className="h-2.5 w-2.5" />
          {currentAssignment.locationCode ? `[${currentAssignment.locationCode}] ` : ''}
          {currentAssignment.locationName}
        </span>
        <span className="text-[10px] text-red-500 font-medium">se quitará</span>
        <button
          className="text-[10px] text-muted-foreground hover:text-foreground underline"
          onClick={() => onCancelPending(employeeId)}
        >
          deshacer
        </button>
      </div>
    );
  }

  const isPending = pendingLocationId !== '';
  const displayValue = isPending ? pendingLocationId : (currentAssignment?.locationId ?? '');

  return (
    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
      {/* Badge de asignación actual con botón X para quitar */}
      {currentAssignment && !isPending && (
        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
          <MapPin className="h-2.5 w-2.5" />
          {currentAssignment.locationCode ? `[${currentAssignment.locationCode}] ` : ''}
          {currentAssignment.locationName}
          {currentAssignment.periodName && (
            <span className="text-blue-400 ml-0.5">· {currentAssignment.periodName}</span>
          )}
          <button
            className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
            title="Quitar asignación de ubicación"
            onClick={() => onMarkDelete(employeeId, currentAssignment.locationRotationAssignmentId)}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      )}
      {/* Select para cambiar o asignar */}
      <select
        className={`h-7 border rounded-md px-2 text-xs bg-background flex-1 min-w-0 ${isPending ? 'border-primary ring-1 ring-primary/30' : ''}`}
        value={displayValue}
        onChange={e => onPendingChange(
          employeeId,
          e.target.value !== '' ? Number(e.target.value) : '',
          currentAssignment?.locationRotationAssignmentId ?? null,
        )}
        disabled={!activePeriod}
        title={!activePeriod ? 'Sin periodo activo' : undefined}
      >
        <option value="">
          {currentAssignment ? '— Cambiar ubicación —' : 'Seleccionar sub-ubicación…'}
        </option>
        {locations.map(l => (
          <option key={l.locationId} value={l.locationId}>
            {l.locationCode ? `[${l.locationCode}] ` : ''}{l.locationName}
          </option>
        ))}
      </select>
      {isPending && (
        <button
          className="text-[10px] text-muted-foreground hover:text-foreground"
          title="Cancelar cambio"
          onClick={() => onCancelPending(employeeId)}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── GroupEmployeesPanel ──────────────────────────────────────────────────────

type PendingEmployee = { employeeId: number; fullName: string; idCard: string };

type PendingLocation = { locationId: number; existingAssignmentId: number | null };

function GroupEmployeesPanel({ group }: { group: LocationGroupDetailDto }) {
  const { data, isLoading } = useGuardGroupEmployees(group.groupId);
  const { assignBatch, removeEmployee } = useGuardGroupMutations();
  const { data: periodsData } = useLocationRotationPeriods();
  const { data: locData } = useGuardLocationsAssignable();
  const { createAssignment, updateAssignment, deleteAssignment } = useLocationRotationMutations();
  const { data: periodAssignmentsData } = useLocationRotationAssignments(
    (periodsData?.status === 'success' ? (periodsData.data.find(p => p.isActive) ?? periodsData.data[0] ?? null) : null)?.locationRotationPeriodId ?? null
  );

  const periods = periodsData?.status === 'success' ? periodsData.data : [];
  const allLocations = locData?.status === 'success' ? locData.data : [];
  const periodAssignments = periodAssignmentsData?.status === 'success' ? periodAssignmentsData.data : [];
  const activePeriod = periods.find(p => p.isActive) ?? periods[0] ?? null;

  // Sub-ubicaciones disponibles para este grupo (hijas de la ubicación asignada al grupo)
  const groupParentLocationId = periodAssignments
    .find(a => a.groupId === group.groupId && a.isActive)?.locationId ?? null;
  const availableLocations = groupParentLocationId
    ? allLocations.filter(l => l.parentLocationId === groupParentLocationId)
    : allLocations;

  // Estado de cambios de ubicación pendientes (empleadoId → { locationId, existingAssignmentId })
  const [pendingLocations, setPendingLocations] = useState<Map<number, PendingLocation>>(new Map());
  // Estado de eliminaciones pendientes (empleadoId → locationRotationAssignmentId a eliminar)
  const [pendingDeletes, setPendingDeletes] = useState<Map<number, number>>(new Map());
  const [isSavingLocations, setIsSavingLocations] = useState(false);

  const employees: GuardRotationGroupEmployeeDto[] =
    data?.status === 'success' ? (data.data ?? []) : [];
  const active = employees.filter(e => e.isActive);

  const [pending, setPending] = useState<PendingEmployee[]>([]);
  const [batchDate, setBatchDate] = useState(today);
  const [comboKey, setComboKey] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<GuardRotationGroupEmployeeDto | null>(null);
  const [removeDate, setRemoveDate] = useState(today);

  const activeIds = new Set(active.map(e => e.employeeId));
  const pendingIds = new Set(pending.map(p => p.employeeId));

  const handleAdd = (emp: any) => {
    if (!emp || activeIds.has(emp.employeeId) || pendingIds.has(emp.employeeId)) return;
    setPending(prev => [...prev, {
      employeeId: emp.employeeId,
      fullName: emp.fullName ?? emp.employeeFullName ?? '',
      idCard: emp.idCard ?? '',
    }]);
    setComboKey(k => k + 1);
  };

  const handleAssign = () => {
    if (!pending.length) return;
    const assignments: AssignEmployeeToRotationGroupDto[] = pending.map(p => ({
      employeeId: p.employeeId, validFrom: batchDate,
    }));
    assignBatch.mutate({ groupId: group.groupId, assignments }, { onSuccess: () => setPending([]) });
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    const dto: RemoveEmployeeFromRotationGroupDto = {
      groupEmployeeId: removeTarget.groupEmployeeId, validTo: removeDate,
    };
    removeEmployee.mutate({ groupId: group.groupId, dto }, { onSuccess: () => setRemoveTarget(null) });
  };

  const handlePendingLocationChange = (empId: number, locId: number | '', existingAssignmentId: number | null) => {
    setPendingLocations(prev => {
      const next = new Map(prev);
      if (locId === '') next.delete(empId);
      else next.set(empId, { locationId: locId, existingAssignmentId });
      return next;
    });
  };

  const handleMarkDelete = (empId: number, existingAssignmentId: number) => {
    // Quitar de cambios pendientes si existía, y marcar para eliminar
    setPendingLocations(prev => { const n = new Map(prev); n.delete(empId); return n; });
    setPendingDeletes(prev => new Map(prev).set(empId, existingAssignmentId));
  };

  const handleCancelPending = (empId: number) => {
    setPendingLocations(prev => { const n = new Map(prev); n.delete(empId); return n; });
    setPendingDeletes(prev => { const n = new Map(prev); n.delete(empId); return n; });
  };

  const handleSaveAllLocations = () => {
    const totalOps = pendingLocations.size + pendingDeletes.size;
    if (!activePeriod || totalOps === 0) return;
    setIsSavingLocations(true);
    let remaining = totalOps;
    const onSettled = () => {
      remaining--;
      if (remaining === 0) {
        setIsSavingLocations(false);
        setPendingLocations(new Map());
        setPendingDeletes(new Map());
      }
    };
    for (const [empId, { locationId, existingAssignmentId }] of Array.from(pendingLocations.entries())) {
      if (existingAssignmentId != null) {
        updateAssignment.mutate({
          id: existingAssignmentId,
          dto: { locationId, isFixedLocation: false, isFixedSchedule: false, isActive: true },
          employeeId: empId,
        }, { onSettled });
      } else {
        createAssignment.mutate({
          locationRotationPeriodId: activePeriod.locationRotationPeriodId,
          employeeId: empId,
          locationId,
          isFixedLocation: false,
          isFixedSchedule: false,
        }, { onSettled });
      }
    }
    for (const [empId, assignmentId] of Array.from(pendingDeletes.entries())) {
      deleteAssignment.mutate({ id: assignmentId, employeeId: empId }, { onSettled });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">{group.groupName}</p>
        {group.groupCode && <p className="text-xs text-muted-foreground font-mono">{group.groupCode}</p>}
        {group.patternReadable && <p className="text-xs text-muted-foreground mt-0.5">{group.patternReadable}</p>}
      </div>
      <Separator />
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
          Guardias activos ({active.length})
        </p>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin guardias asignados.</p>
        ) : (
          <>
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {active.map(e => (
                <div key={e.groupEmployeeId} className="rounded-md border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.employeeFullName}</p>
                      <p className="text-xs text-muted-foreground">{e.employeeIdCard}</p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => { setRemoveTarget(e); setRemoveDate(today); }}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <EmployeeLocationSection
                    employeeId={e.employeeId}
                    locations={availableLocations}
                    activePeriod={activePeriod}
                    pendingLocationId={pendingLocations.get(e.employeeId)?.locationId ?? ''}
                    pendingDelete={pendingDeletes.has(e.employeeId)}
                    onPendingChange={handlePendingLocationChange}
                    onMarkDelete={handleMarkDelete}
                    onCancelPending={handleCancelPending}
                  />
                </div>
              ))}
            </div>
            {(pendingLocations.size > 0 || pendingDeletes.size > 0) && (
              <Button
                size="sm" className="w-full mt-2"
                disabled={isSavingLocations || !activePeriod}
                onClick={handleSaveAllLocations}
              >
                {isSavingLocations
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Guardando…</>
                  : `Guardar ${pendingLocations.size + pendingDeletes.size} cambio(s) de ubicación`}
              </Button>
            )}
          </>
        )}
      </div>
      <Separator />
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Agregar guardias</p>
        <EmployeeCombobox key={comboKey} value={null} onSelect={() => { }} onSelectEmployee={handleAdd} placeholder="Buscar guardia…" />
        {pending.length > 0 && (
          <>
            <div className="max-h-36 overflow-y-auto mt-2 space-y-1 pr-1">
              {pending.map(p => (
                <div key={p.employeeId} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.fullName}</p>
                    <p className="text-xs text-muted-foreground">{p.idCard}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    onClick={() => setPending(prev => prev.filter(x => x.employeeId !== p.employeeId))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <Label className="text-xs">Válido desde *</Label>
                <Input type="date" className="h-8 text-sm mt-1" value={batchDate} min={today}
                  onChange={e => setBatchDate(e.target.value)} />
              </div>
              <Button size="sm" className="w-full" disabled={assignBatch.isPending || !batchDate} onClick={handleAssign}>
                {assignBatch.isPending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Asignando…</>
                  : `Asignar ${pending.length} guardia(s)`}
              </Button>
            </div>
          </>
        )}
      </div>
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Cerrar vigencia</DialogTitle></DialogHeader>
          <p className="text-sm">Cerrar la asignación de <strong>{removeTarget?.employeeFullName}</strong>:</p>
          <div>
            <Label className="text-xs">Válido hasta *</Label>
            <Input type="date" className="h-8 text-sm mt-1" value={removeDate} onChange={e => setRemoveDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={removeEmployee.isPending || !removeDate} onClick={handleRemove}>
              {removeEmployee.isPending ? 'Cerrando…' : 'Cerrar vigencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── GroupFormDialog ──────────────────────────────────────────────────────────

type GroupForm = {
  name: string;
  groupCode: string;
  description: string;
  colorCode: string;
  parentGroupId: number | '';
  groupLevelTypeId: number | '';
  isActive: boolean;
};

type FormMode = { kind: 'create'; defaultParentId?: number } | { kind: 'edit'; groupId: number; current: GroupForm };

function GroupFormDialog({
  mode, onClose,
  generalGroups,
}: {
  mode: FormMode | null;
  onClose: () => void;
  generalGroups: GuardRotationGroupDto[];
}) {
  const { data: refData } = useGuardRefTypes('GUARD_GROUP_LEVEL_TYPE');
  const levelTypes = refData?.status === 'success' ? refData.data : [];
  const { create, update } = useGuardGroupMutations(() => onClose());

  const [form, setForm] = useState<GroupForm>(() => {
    if (!mode) return { name: '', groupCode: '', description: '', colorCode: '', parentGroupId: '', groupLevelTypeId: '', isActive: true };
    if (mode.kind === 'create') return { name: '', groupCode: '', description: '', colorCode: '', parentGroupId: mode.defaultParentId ?? '', groupLevelTypeId: '', isActive: true };
    return mode.current;
  });

  const f = <K extends keyof GroupForm>(k: K, v: GroupForm[K]) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (mode?.kind === 'create') {
      const dto: CreateGuardRotationGroupDto = {
        name: form.name.trim(),
        groupCode: form.groupCode || undefined,
        description: form.description || undefined,
        colorCode: form.colorCode || undefined,
        parentGroupId: form.parentGroupId !== '' ? Number(form.parentGroupId) : undefined,
        groupLevelTypeId: form.groupLevelTypeId !== '' ? Number(form.groupLevelTypeId) : undefined,
      };
      create.mutate(dto);
    } else if (mode?.kind === 'edit') {
      const dto: UpdateGuardRotationGroupDto = {
        name: form.name.trim(),
        groupCode: form.groupCode || undefined,
        description: form.description || undefined,
        isActive: form.isActive,
        colorCode: form.colorCode || undefined,
        parentGroupId: form.parentGroupId !== '' ? Number(form.parentGroupId) : undefined,
        groupLevelTypeId: form.groupLevelTypeId !== '' ? Number(form.groupLevelTypeId) : undefined,
      };
      update.mutate({ id: mode.groupId, dto });
    }
  };

  const isSaving = create.isPending || update.isPending;

  return (
    <Dialog open={!!mode} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{mode?.kind === 'create' ? 'Nuevo grupo' : 'Editar grupo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Ej: Guardia Amarillo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código</Label>
              <Input value={form.groupCode} onChange={e => f('groupCode', e.target.value)}
                placeholder="G_EXCEL_HUACHI_LM" className="font-mono text-sm" />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={form.colorCode || '#3b82f6'}
                  onChange={e => f('colorCode', e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={form.colorCode} onChange={e => f('colorCode', e.target.value)}
                  placeholder="#3b82f6" className="font-mono text-sm" />
              </div>
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Input value={form.description} onChange={e => f('description', e.target.value)} placeholder="Descripción opcional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Grupo padre</Label>
              <select
                className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                value={form.parentGroupId}
                onChange={e => f('parentGroupId', e.target.value !== '' ? Number(e.target.value) : '')}
              >
                <option value="">Sin grupo padre</option>
                {generalGroups.map(g => <option key={g.groupId} value={g.groupId}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Nivel</Label>
              <select
                className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                value={form.groupLevelTypeId}
                onChange={e => f('groupLevelTypeId', e.target.value !== '' ? Number(e.target.value) : '')}
              >
                <option value="">Sin nivel</option>
                {levelTypes.map(t => <option key={t.typeId} value={t.typeId}>{t.name}</option>)}
              </select>
            </div>
          </div>
          {mode?.kind === 'edit' && (
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={v => f('isActive', v)} />
              <Label>Activo</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || !form.name.trim()}>
            {isSaving ? 'Guardando…' : mode?.kind === 'create' ? 'Crear' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── HierarchyView ────────────────────────────────────────────────────────────

function HierarchyView({
  onOpenForm,
}: {
  onOpenForm: (mode: FormMode) => void;
}) {
  const { data, isLoading } = useGeneralGroupsWithSubgroups();
  const groups: GuardRotationGroupWithSubgroupsDto[] =
    data?.status === 'success' ? (data.data ?? []) : [];

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [empPanel, setEmpPanel] = useState<LocationGroupDetailDto | null>(null);
  const [patternPanel, setPatternPanel] = useState<LocationGroupDetailDto | null>(null);

  const toggle = (id: number) =>
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toEditMode = (g: GuardRotationGroupDto): FormMode => ({
    kind: 'edit',
    groupId: g.groupId,
    current: {
      name: g.name, groupCode: g.groupCode ?? '', description: g.description ?? '',
      colorCode: g.colorCode ?? '', parentGroupId: g.parentGroupId ?? '',
      groupLevelTypeId: '', isActive: g.isActive,
    },
  });

  const toEditModeGeneral = (g: GuardRotationGroupWithSubgroupsDto): FormMode => ({
    kind: 'edit',
    groupId: g.groupId,
    current: {
      name: g.name, groupCode: g.groupCode ?? '', description: g.description ?? '',
      colorCode: g.colorCode ?? '', parentGroupId: '',
      groupLevelTypeId: '', isActive: g.isActive,
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Cargando jerarquía…
    </div>
  );

  if (groups.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-16">No hay grupos generales registrados.</p>
  );

  return (
    <div className="space-y-3">
      {groups.map(g => {
        const isOpen = expanded.has(g.groupId);
        return (
          <Card key={g.groupId} className={g.isActive ? '' : 'opacity-60'}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => toggle(g.groupId)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <ColorDot color={g.colorCode} />
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-semibold truncate">{g.name}</span>
                  {g.groupCode && <span className="text-xs font-mono text-muted-foreground">{g.groupCode}</span>}
                  {g.groupLevelTypeName && <Badge variant="outline" className="text-xs">{g.groupLevelTypeName}</Badge>}
                  {!g.isActive && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <button
                    onClick={() => setEmpPanel(toLocationDetail(g))}
                    className="hover:text-primary transition-colors flex items-center gap-0.5 focus:outline-none"
                    title="Ver listado de guardias"
                  >
                    <Users className="h-3 w-3 inline mr-0.5" />
                    <span>{g.employeeCount}</span>
                  </button>
                  <span><Layers className="h-3 w-3 inline mr-0.5" />{g.subgroupCount} subgrupos</span>
                  <div className="hidden sm:block">
                    <GroupActivePattern
                      groupId={g.groupId}
                      onAssign={() => setPatternPanel(toLocationDetail(g))}
                      variant="badge"
                    />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setEmpPanel(toLocationDetail(g))}>
                    <Users className="h-3 w-3 mr-1" />Guardias
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setPatternPanel(toLocationDetail(g))}>
                    <RotateCw className="h-3 w-3 mr-1" />Patrón
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => onOpenForm(toEditModeGeneral(g))}>Editar</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => onOpenForm({ kind: 'create', defaultParentId: g.groupId })}>
                    <Plus className="h-3 w-3 mr-1" />Subgrupo
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="pt-0 px-4 pb-4">
                {g.subgroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin subgrupos.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Patrón activo</TableHead>
                          <TableHead className="text-center">Guardias</TableHead>
                          <TableHead className="text-center">Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.subgroups.map(sub => (
                          <TableRow key={sub.groupId}>
                            <TableCell className="font-medium text-sm">{sub.name}</TableCell>
                            <TableCell className="font-mono text-xs">{sub.groupCode ?? '—'}</TableCell>
                            <TableCell>
                              <GroupActivePattern
                                groupId={sub.groupId}
                                onAssign={() => setPatternPanel(toLocationDetail(sub))}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => setEmpPanel(toLocationDetail(sub))}
                                className="hover:underline text-primary font-semibold text-sm focus:outline-none"
                                title="Ver listado de guardias"
                              >
                                {sub.employeeCount}
                              </button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={sub.isActive ? 'default' : 'secondary'} className="text-xs">
                                {sub.isActive ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button variant="outline" size="sm" className="h-7 text-xs"
                                  onClick={() => setEmpPanel(toLocationDetail(sub))}>
                                  <Users className="h-3 w-3 mr-1" />Guardias
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 text-xs"
                                  onClick={() => setPatternPanel(toLocationDetail(sub))}>
                                  <RotateCw className="h-3 w-3 mr-1" />Patrón
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs"
                                  onClick={() => onOpenForm(toEditMode(sub))}>Editar</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      <GroupPatternAssignmentDialog open={!!patternPanel} group={patternPanel} onClose={() => setPatternPanel(null)} />

      <Dialog open={!!empPanel} onOpenChange={v => { if (!v) setEmpPanel(null); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Gestión de Guardias</DialogTitle>
          </DialogHeader>
          {empPanel && <GroupEmployeesPanel group={empPanel} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── LocationGroupsView ───────────────────────────────────────────────────────

function LocationGroupsView({
  location, onBack, onOpenForm,
}: {
  location: LocationSummaryDto;
  onBack: () => void;
  onOpenForm: (mode: FormMode) => void;
}) {
  const { data, isLoading } = useGroupsByLocation(location.locationKey);
  const groups: LocationGroupDetailDto[] = data?.status === 'success' ? (data.data ?? []) : [];

  const [employeePanelGroup, setEmployeePanelGroup] = useState<LocationGroupDetailDto | null>(null);
  const [patternDialogGroup, setPatternDialogGroup] = useState<LocationGroupDetailDto | null>(null);

  const openEdit = (g: LocationGroupDetailDto) => onOpenForm({
    kind: 'edit',
    groupId: g.groupId,
    current: {
      name: g.groupName, groupCode: g.groupCode ?? '', description: g.description ?? '',
      colorCode: '', parentGroupId: '', groupLevelTypeId: '', isActive: g.isActive,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1 pl-1" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />Ubicaciones
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{location.locationName}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Badge variant="outline">{location.totalActiveGroups}/{location.totalGroups} activos</Badge>
          <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{location.totalEmployees} guardias</Badge>
          <Button size="sm" onClick={() => onOpenForm({ kind: 'create' })}>
            <Plus className="h-4 w-4 mr-1" />Nuevo grupo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /><span>Cargando grupos…</span>
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No hay grupos para esta ubicación.</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Patrón</TableHead>
                <TableHead className="text-center">Guardias</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(g => (
                <TableRow key={g.groupId}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{g.groupCode ?? '—'}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{g.groupName}</p>
                    {g.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{g.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <GroupActivePattern
                      groupId={g.groupId}
                      onAssign={() => setPatternDialogGroup(g)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => setEmployeePanelGroup(g)}
                      className="hover:underline text-primary font-semibold text-sm focus:outline-none"
                      title="Ver listado de guardias"
                    >
                      {g.assignedEmployees}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={g.isActive ? 'default' : 'secondary'}>{g.isActive ? 'Activo' : 'Inactivo'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEmployeePanelGroup(g)}>
                        <Users className="h-3.5 w-3.5 mr-1" />Guardias
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPatternDialogGroup(g)}>
                        <RotateCw className="h-3.5 w-3.5 mr-1" />Patrón
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>Editar</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <GroupPatternAssignmentDialog open={!!patternDialogGroup} group={patternDialogGroup} onClose={() => setPatternDialogGroup(null)} />

      <Dialog open={!!employeePanelGroup} onOpenChange={v => { if (!v) setEmployeePanelGroup(null); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Gestión de Guardias</DialogTitle>
          </DialogHeader>
          {employeePanelGroup && <GroupEmployeesPanel group={employeePanelGroup} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── LocationCard ─────────────────────────────────────────────────────────────

function LocationCard({ loc, onClick }: { loc: LocationSummaryDto; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base truncate">{loc.locationName}</CardTitle>
          </div>
          <Badge variant={loc.totalActiveGroups > 0 ? 'default' : 'secondary'} className="shrink-0">
            {loc.totalActiveGroups}/{loc.totalGroups}
          </Badge>
        </div>
        <p className="text-xs font-mono text-muted-foreground">{loc.locationKey}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted/50 py-2">
            <p className="text-lg font-bold">{loc.totalEmployees}</p>
            <p className="text-xs text-muted-foreground">Guardias</p>
          </div>
          <div className="rounded-md bg-muted/50 py-2">
            <p className="text-lg font-bold">{loc.totalGroups}</p>
            <p className="text-xs text-muted-foreground">Grupos</p>
          </div>
          <div className="rounded-md bg-muted/50 py-2">
            <p className="text-lg font-bold">{loc.totalPatterns}</p>
            <p className="text-xs text-muted-foreground">Patrones</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground gap-1">
          Ver grupos <ChevronRight className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function GuardRotationGroupsPage() {
  const { data: locData, isLoading: locLoading } = useLocationSummary();
  const { data: generalData } = useGeneralGroups();
  const locations: LocationSummaryDto[] = locData?.status === 'success' ? (locData.data ?? []) : [];
  const generalGroups: GuardRotationGroupDto[] = generalData?.status === 'success' ? (generalData.data ?? []) : [];

  const [selectedLocation, setSelectedLocation] = useState<LocationSummaryDto | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);

  const totalGroups = locations.reduce((s, l) => s + l.totalGroups, 0);
  const totalEmployees = locations.reduce((s, l) => s + l.totalEmployees, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Grupos de Rotación</h1>
        </div>
        <Button size="sm" onClick={() => setFormMode({ kind: 'create' })}>
          <Plus className="h-4 w-4 mr-1" />Nuevo grupo
        </Button>
      </div>

      {/* Stats */}
      {!locLoading && locations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Ubicaciones', value: locations.length, Icon: Building2 },
            { label: 'Total grupos', value: totalGroups, Icon: RotateCw },
            { label: 'Grupos activos', value: locations.reduce((s, l) => s + l.totalActiveGroups, 0), Icon: Shield },
            { label: 'Total guardias', value: totalEmployees, Icon: Users },
          ] as const).map(({ label, value, Icon }) => (
            <div key={label} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="jerarquia">
        <TabsList>
          <TabsTrigger value="jerarquia">
            <Layers className="h-3.5 w-3.5 mr-1.5" />Jerarquía
          </TabsTrigger>
          <TabsTrigger value="ubicacion">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />Por ubicación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jerarquia" className="mt-4">
          <HierarchyView onOpenForm={setFormMode} />
        </TabsContent>

        <TabsContent value="ubicacion" className="mt-4">
          {selectedLocation ? (
            <LocationGroupsView
              location={selectedLocation}
              onBack={() => setSelectedLocation(null)}
              onOpenForm={setFormMode}
            />
          ) : locLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /><span>Cargando ubicaciones…</span>
            </div>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No hay grupos registrados.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {locations.map(loc => (
                <LocationCard key={loc.locationKey} loc={loc} onClick={() => setSelectedLocation(loc)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Shared form dialog */}
      <GroupFormDialog
        key={formMode ? JSON.stringify(formMode) : 'closed'}
        mode={formMode}
        onClose={() => setFormMode(null)}
        generalGroups={generalGroups}
      />
    </div>
  );
}
