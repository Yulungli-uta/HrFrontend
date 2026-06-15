import { useState } from 'react';
import { Shield, Plus, Loader2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSpecialRulesPaged, useSpecialRulesMutations, useGuardLocationsAssignable } from '@/hooks/guards/useGuards';
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox';
import type {
  GuardEmployeeSpecialRuleDto,
  CreateGuardEmployeeSpecialRuleDto,
  UpdateGuardEmployeeSpecialRuleDto,
} from '@/types/guards';

// ─── Rule form dialog ──────────────────────────────────────────────────────────

type RuleForm = {
  employeeId: number | '';
  fixedLocationId: number | '';
  noNightShift: boolean;
  onlyWeekDays: boolean;
  weekendPriority: boolean;
  nightPriority: boolean;
  reason: string;
  validFrom: string;
  validTo: string;
  requiresApproval: boolean;
  isActive: boolean;
};

function RuleFormDialog({
  open, onClose, editTarget,
}: {
  open: boolean;
  onClose: () => void;
  editTarget: GuardEmployeeSpecialRuleDto | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: locData } = useGuardLocationsAssignable();
  const locations = locData?.status === 'success' ? locData.data : [];
  const { create, update } = useSpecialRulesMutations(() => onClose());

  const [form, setForm] = useState<RuleForm>(() => editTarget
    ? {
        employeeId: editTarget.employeeId,
        fixedLocationId: editTarget.fixedLocationId ?? '',
        noNightShift: editTarget.noNightShift,
        onlyWeekDays: editTarget.onlyWeekDays,
        weekendPriority: editTarget.weekendPriority,
        nightPriority: editTarget.nightPriority,
        reason: editTarget.reason ?? '',
        validFrom: editTarget.validFrom,
        validTo: editTarget.validTo ?? '',
        requiresApproval: editTarget.requiresApproval,
        isActive: editTarget.isActive,
      }
    : {
        employeeId: '', fixedLocationId: '',
        noNightShift: false, onlyWeekDays: false, weekendPriority: false, nightPriority: false,
        reason: '', validFrom: today, validTo: '', requiresApproval: false, isActive: true,
      }
  );

  const f = <K extends keyof RuleForm>(k: K, v: RuleForm[K]) => setForm(p => ({ ...p, [k]: v }));
  const [empName, setEmpName] = useState(editTarget?.employeeFullName ?? '');
  const isSaving = create.isPending || update.isPending;

  const handleSave = () => {
    if (!form.validFrom) return;
    if (editTarget) {
      const dto: UpdateGuardEmployeeSpecialRuleDto = {
        fixedLocationId: form.fixedLocationId !== '' ? Number(form.fixedLocationId) : undefined,
        noNightShift: form.noNightShift, onlyWeekDays: form.onlyWeekDays,
        weekendPriority: form.weekendPriority, nightPriority: form.nightPriority,
        reason: form.reason || undefined,
        validFrom: form.validFrom, validTo: form.validTo || undefined,
        requiresApproval: form.requiresApproval, isActive: form.isActive,
      };
      update.mutate({ id: editTarget.specialRuleId, dto });
    } else {
      if (form.employeeId === '') return;
      const dto: CreateGuardEmployeeSpecialRuleDto = {
        employeeId: Number(form.employeeId),
        fixedLocationId: form.fixedLocationId !== '' ? Number(form.fixedLocationId) : undefined,
        noNightShift: form.noNightShift, onlyWeekDays: form.onlyWeekDays,
        weekendPriority: form.weekendPriority, nightPriority: form.nightPriority,
        reason: form.reason || undefined,
        validFrom: form.validFrom, validTo: form.validTo || undefined,
        requiresApproval: form.requiresApproval,
      };
      create.mutate(dto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{editTarget ? 'Editar regla especial' : 'Nueva regla especial'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {!editTarget && (
            <div>
              <Label>Guardia *</Label>
              <EmployeeCombobox
                value={form.employeeId !== '' ? Number(form.employeeId) : null}
                onSelect={(id) => f('employeeId', id ?? '')}
                onSelectEmployee={(emp) => {
                  if (emp) setEmpName(emp.fullName ?? '');
                }}
                placeholder="Buscar guardia…"
              />
            </div>
          )}
          {editTarget && (
            <div className="rounded-md border px-3 py-2 bg-muted/30">
              <p className="text-sm font-medium">{editTarget.employeeFullName}</p>
              <p className="text-xs text-muted-foreground">{editTarget.employeeIdCard}</p>
            </div>
          )}

          <div>
            <Label>Ubicación fija (opcional)</Label>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={form.fixedLocationId}
              onChange={e => f('fixedLocationId', e.target.value !== '' ? Number(e.target.value) : '')}
            >
              <option value="">Sin ubicación fija</option>
              {locations.map(l => (
                <option key={l.locationId} value={l.locationId}>
                  {l.locationCode ? `[${l.locationCode}] ` : ''}{l.locationName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.noNightShift} onCheckedChange={v => f('noNightShift', v)} />
              <Label className="text-sm">Sin noche</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.onlyWeekDays} onCheckedChange={v => f('onlyWeekDays', v)} />
              <Label className="text-sm">Solo días hábiles</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.weekendPriority} onCheckedChange={v => f('weekendPriority', v)} />
              <Label className="text-sm">Prioridad fin de semana</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.nightPriority} onCheckedChange={v => f('nightPriority', v)} />
              <Label className="text-sm">Prioridad noche</Label>
            </div>
          </div>

          <div>
            <Label>Motivo</Label>
            <Input value={form.reason} onChange={e => f('reason', e.target.value)} placeholder="Motivo de la regla" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Válido desde *</Label>
              <Input type="date" value={form.validFrom} onChange={e => f('validFrom', e.target.value)} />
            </div>
            <div>
              <Label>Válido hasta</Label>
              <Input type="date" value={form.validTo} min={form.validFrom} onChange={e => f('validTo', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.requiresApproval} onCheckedChange={v => f('requiresApproval', v)} />
            <Label className="text-sm">Requiere aprobación</Label>
          </div>

          {editTarget && (
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => f('isActive', v)} />
              <Label className="text-sm">Activo</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || (!editTarget && form.employeeId === '') || !form.validFrom}>
            {isSaving ? 'Guardando…' : editTarget ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function GuardEmployeeSpecialRulesPage() {
  const { items, page, pageSize, totalCount, totalPages, setPage, searchValue, setSearch, isLoading } =
    useSpecialRulesPaged(20);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GuardEmployeeSpecialRuleDto | null>(null);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (r: GuardEmployeeSpecialRuleDto) => { setEditTarget(r); setFormOpen(true); };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Reglas Especiales de Guardias</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />Nueva regla
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9" placeholder="Buscar por nombre o CI…"
          value={searchValue} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />Cargando…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">No hay reglas registradas.</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guardia</TableHead>
                  <TableHead>Reglas activas</TableHead>
                  <TableHead>Ubicación fija</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(r => (
                  <TableRow key={r.specialRuleId}>
                    <TableCell>
                      <p className="text-sm font-medium">{r.employeeFullName}</p>
                      <p className="text-xs text-muted-foreground">{r.employeeIdCard}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.noNightShift && <Badge variant="outline" className="text-xs">Sin noche</Badge>}
                        {r.onlyWeekDays && <Badge variant="outline" className="text-xs">Solo hábiles</Badge>}
                        {r.weekendPriority && <Badge variant="outline" className="text-xs">Prio. fin semana</Badge>}
                        {r.nightPriority && <Badge variant="outline" className="text-xs">Prio. noche</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.fixedLocationName
                        ? <p className="text-sm">{r.fixedLocationName}</p>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {r.validFrom}{r.validTo ? ` → ${r.validTo}` : ' →'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.isActive ? 'default' : 'secondary'}>
                        {r.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Editar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{totalCount} reglas</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
              <span className="flex items-center px-2">Pág {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
            </div>
          </div>
        </>
      )}

      <RuleFormDialog open={formOpen} onClose={() => setFormOpen(false)} editTarget={editTarget} />
    </div>
  );
}
