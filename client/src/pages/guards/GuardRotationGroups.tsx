import { useState } from 'react';
import {
  Users, Plus, MapPin, Shield, ChevronRight, ChevronLeft,
  Loader2, UserMinus, X, Building2, RotateCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox';
import {
  useLocationSummary,
  useGroupsByLocation,
  useGuardGroupEmployees,
  useGuardGroupMutations,
} from '@/hooks/guards/useGuards';
import type {
  LocationSummaryDto,
  LocationGroupDetailDto,
  GuardRotationGroupEmployeeDto,
  CreateGuardRotationGroupDto,
  UpdateGuardRotationGroupDto,
  RemoveEmployeeFromRotationGroupDto,
  AssignEmployeeToRotationGroupDto,
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

// ─── Employee Panel ────────────────────────────────────────────────────────────

type PendingEmployee = { employeeId: number; fullName: string; idCard: string };

function GroupEmployeesPanel({ group }: { group: LocationGroupDetailDto }) {
  const { data, isLoading } = useGuardGroupEmployees(group.groupId);
  const { assignBatch, removeEmployee } = useGuardGroupMutations();

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
    if (!emp) return;
    if (activeIds.has(emp.employeeId) || pendingIds.has(emp.employeeId)) return;
    setPending(prev => [...prev, {
      employeeId: emp.employeeId,
      fullName: emp.fullName ?? emp.employeeFullName ?? '',
      idCard: emp.idCard ?? '',
    }]);
    setComboKey(k => k + 1);
  };

  const handleAssign = () => {
    if (pending.length === 0) return;
    const assignments: AssignEmployeeToRotationGroupDto[] = pending.map(p => ({
      employeeId: p.employeeId,
      validFrom: batchDate,
    }));
    assignBatch.mutate({ groupId: group.groupId, assignments }, {
      onSuccess: () => setPending([]),
    });
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    const dto: RemoveEmployeeFromRotationGroupDto = {
      groupEmployeeId: removeTarget.groupEmployeeId,
      validTo: removeDate,
    };
    removeEmployee.mutate({ groupId: group.groupId, dto }, {
      onSuccess: () => setRemoveTarget(null),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">{group.groupName}</p>
        {group.groupCode && (
          <p className="text-xs text-muted-foreground font-mono">{group.groupCode}</p>
        )}
        {group.patternReadable && (
          <p className="text-xs text-muted-foreground mt-0.5">{group.patternReadable}</p>
        )}
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
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {active.map(e => (
              <div key={e.groupEmployeeId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5">
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
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
          Agregar guardias
        </p>
        <EmployeeCombobox
          key={comboKey}
          value={null}
          onSelect={() => {}}
          onSelectEmployee={handleAdd}
          placeholder="Buscar guardia…"
        />
        {pending.length > 0 && (
          <>
            <div className="max-h-36 overflow-y-auto mt-2 space-y-1 pr-1">
              {pending.map(p => (
                <div key={p.employeeId} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.fullName}</p>
                    <p className="text-xs text-muted-foreground">{p.idCard}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    onClick={() => setPending(prev => prev.filter(x => x.employeeId !== p.employeeId))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <Label className="text-xs">Válido desde *</Label>
                <Input
                  type="date" className="h-8 text-sm mt-1"
                  value={batchDate} min={today}
                  onChange={e => setBatchDate(e.target.value)}
                />
              </div>
              <Button
                size="sm" className="w-full"
                disabled={assignBatch.isPending || !batchDate}
                onClick={handleAssign}
              >
                {assignBatch.isPending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Asignando…</>
                  : `Asignar ${pending.length} guardia(s)`}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Cerrar vigencia dialog */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Cerrar vigencia</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Cerrar la asignación de <strong>{removeTarget?.employeeFullName}</strong>:
          </p>
          <div>
            <Label className="text-xs">Válido hasta *</Label>
            <Input
              type="date" className="h-8 text-sm mt-1"
              value={removeDate}
              onChange={e => setRemoveDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={removeEmployee.isPending || !removeDate}
              onClick={handleRemove}
            >
              {removeEmployee.isPending ? 'Cerrando…' : 'Cerrar vigencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Level 2: Groups of a location ────────────────────────────────────────────

function LocationGroupsView({
  location,
  onBack,
}: {
  location: LocationSummaryDto;
  onBack: () => void;
}) {
  const { data, isLoading } = useGroupsByLocation(location.locationKey);
  const { create, update } = useGuardGroupMutations();

  const groups: LocationGroupDetailDto[] =
    data?.status === 'success' ? (data.data ?? []) : [];

  const [employeePanelGroup, setEmployeePanelGroup] = useState<LocationGroupDetailDto | null>(null);
  const [formDialog, setFormDialog] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<LocationGroupDetailDto | null>(null);
  const [form, setForm] = useState<Partial<CreateGuardRotationGroupDto & { isActive: boolean }>>({ name: '' });

  const openCreate = () => {
    setForm({ name: '', groupCode: '', description: '' });
    setEditTarget(null);
    setFormDialog('create');
  };

  const openEdit = (g: LocationGroupDetailDto) => {
    setForm({ name: g.groupName, groupCode: g.groupCode ?? '', description: g.description ?? '', isActive: g.isActive });
    setEditTarget(g);
    setFormDialog('edit');
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;
    if (formDialog === 'create') {
      const dto: CreateGuardRotationGroupDto = {
        name: form.name!,
        groupCode: form.groupCode || undefined,
        description: form.description || undefined,
      };
      create.mutate(dto, {
        onSuccess: (r) => { if (r.status === 'success') setFormDialog(null); },
      });
    } else if (editTarget) {
      const dto: UpdateGuardRotationGroupDto = {
        name: form.name!,
        groupCode: form.groupCode || undefined,
        description: form.description || undefined,
        isActive: form.isActive ?? editTarget.isActive,
      };
      update.mutate({ id: editTarget.groupId, dto }, {
        onSuccess: (r) => { if (r.status === 'success') setFormDialog(null); },
      });
    }
  };

  const isSaving = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      {/* Breadcrumb + stats */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1 pl-1" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Ubicaciones
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{location.locationName}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Badge variant="outline">{location.totalActiveGroups}/{location.totalGroups} activos</Badge>
          <Badge variant="secondary">
            <Users className="h-3 w-3 mr-1" />
            {location.totalEmployees} guardias
          </Badge>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo grupo
          </Button>
        </div>
      </div>

      {/* Groups table */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando grupos…</span>
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No hay grupos para esta ubicación.
        </p>
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
                    {g.patternName && (
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{g.patternName}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <PatternChips sequence={g.patternSequence} />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{g.assignedEmployees}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={g.isActive ? 'default' : 'secondary'}>
                      {g.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEmployeePanelGroup(g)}>
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Guardias
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Employee panel dialog */}
      <Dialog open={!!employeePanelGroup} onOpenChange={(v) => { if (!v) setEmployeePanelGroup(null); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gestión de Guardias
            </DialogTitle>
          </DialogHeader>
          {employeePanelGroup && <GroupEmployeesPanel group={employeePanelGroup} />}
        </DialogContent>
      </Dialog>

      {/* Create / Edit group dialog */}
      <Dialog open={!!formDialog} onOpenChange={(v) => { if (!v) setFormDialog(null); }}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {formDialog === 'create' ? 'Nuevo grupo' : 'Editar grupo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={form.name ?? ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Guardia Turno A"
              />
            </div>
            <div>
              <Label>Código de grupo</Label>
              <Input
                value={form.groupCode ?? ''}
                onChange={e => setForm(f => ({ ...f, groupCode: e.target.value }))}
                placeholder="Ej: G_EXCEL_HUACHI_LMTNTML"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripción opcional"
              />
            </div>
            {formDialog === 'edit' && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isActive ?? true}
                  onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
                />
                <Label>Activo</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog(null)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name?.trim()}>
              {isSaving ? 'Guardando…' : formDialog === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Level 1: Location summary cards ──────────────────────────────────────────

function LocationCard({ loc, onClick }: { loc: LocationSummaryDto; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
      onClick={onClick}
    >
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
  const { data, isLoading } = useLocationSummary();
  const [selectedLocation, setSelectedLocation] = useState<LocationSummaryDto | null>(null);

  const locations: LocationSummaryDto[] =
    data?.status === 'success' ? (data.data ?? []) : [];

  if (selectedLocation) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <LocationGroupsView
          location={selectedLocation}
          onBack={() => setSelectedLocation(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Grupos de Rotación</h1>
        </div>
        {!isLoading && locations.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{locations.length} ubicaciones</span>
          </div>
        )}
      </div>

      {!isLoading && locations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Ubicaciones', value: locations.length, Icon: Building2 },
            { label: 'Total grupos', value: locations.reduce((s, l) => s + l.totalGroups, 0), Icon: RotateCw },
            { label: 'Grupos activos', value: locations.reduce((s, l) => s + l.totalActiveGroups, 0), Icon: Shield },
            { label: 'Total guardias', value: locations.reduce((s, l) => s + l.totalEmployees, 0), Icon: Users },
          ] as const).map(({ label, value, Icon }) => (
            <div key={label} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando ubicaciones…</span>
        </div>
      ) : locations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">
          No hay grupos registrados.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {locations.map(loc => (
            <LocationCard key={loc.locationKey} loc={loc} onClick={() => setSelectedLocation(loc)} />
          ))}
        </div>
      )}
    </div>
  );
}
