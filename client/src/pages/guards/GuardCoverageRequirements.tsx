import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCoverageRequirementsPaged, useCoverageMutations } from '@/hooks/guards/useGuards';
import { DataPagination } from '@/components/ui/DataPagination';
import type {
  GuardShiftCoverageRequirementDto,
  CreateCoverageRequirementDto,
  UpdateCoverageRequirementDto,
} from '@/types/guards';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type DialogMode = 'create' | 'edit';

export default function GuardCoverageRequirementsPage() {
  const {
    items: requirements, isLoading, page, pageSize, totalCount,
    totalPages, hasPreviousPage, hasNextPage, goToPage, setPageSize,
  } = useCoverageRequirementsPaged(20);
  const { create, update } = useCoverageMutations();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>('create');
  const [selected, setSelected] = useState<GuardShiftCoverageRequirementDto | null>(null);
  const [form, setForm] = useState({
    locationId: '',
    scheduleId: '',
    dayOfWeek: 1,
    requiredGuards: 1,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    isActive: true,
    notes: '',
  });

  const openCreate = () => {
    setForm({
      locationId: '', scheduleId: '', dayOfWeek: 1, requiredGuards: 1,
      validFrom: new Date().toISOString().split('T')[0], validTo: '',
      isActive: true, notes: '',
    });
    setMode('create');
    setSelected(null);
    setOpen(true);
  };

  const openEdit = (r: GuardShiftCoverageRequirementDto) => {
    setForm({
      locationId: String(r.locationId),
      scheduleId: String(r.scheduleId),
      dayOfWeek: r.dayOfWeek,
      requiredGuards: r.requiredGuards,
      validFrom: r.validFrom,
      validTo: r.validTo ?? '',
      isActive: r.isActive,
      notes: r.notes ?? '',
    });
    setMode('edit');
    setSelected(r);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.locationId || !form.scheduleId) return;
    if (mode === 'create') {
      const dto: CreateCoverageRequirementDto = {
        locationId: Number(form.locationId),
        scheduleId: Number(form.scheduleId),
        dayOfWeek: form.dayOfWeek,
        requiredGuards: form.requiredGuards,
        validFrom: form.validFrom,
        validTo: form.validTo || undefined,
        notes: form.notes || undefined,
      };
      create.mutate(dto, { onSuccess: (r) => { if (r.status === 'success') setOpen(false); } });
    } else if (selected) {
      const dto: UpdateCoverageRequirementDto = {
        dayOfWeek: form.dayOfWeek,
        requiredGuards: form.requiredGuards,
        validFrom: form.validFrom,
        validTo: form.validTo || undefined,
        isActive: form.isActive,
        notes: form.notes || undefined,
      };
      update.mutate({ id: selected.requirementId, dto }, { onSuccess: (r) => { if (r.status === 'success') setOpen(false); } });
    }
  };

  const isSaving = create.isPending || update.isPending;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Requisitos de Cobertura</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo requisito
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Requisitos configurados
            {totalCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({totalCount})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Cargando requisitos…</p>
          ) : requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hay requisitos de cobertura configurados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Guardias req.</TableHead>
                  <TableHead>Válido desde</TableHead>
                  <TableHead>Válido hasta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.map(r => (
                  <TableRow key={r.requirementId}>
                    <TableCell>{r.locationName}</TableCell>
                    <TableCell className="text-sm">{r.scheduleDescription}</TableCell>
                    <TableCell>{DAY_NAMES[r.dayOfWeek] ?? r.dayOfWeekName}</TableCell>
                    <TableCell className="text-center font-bold">{r.requiredGuards}</TableCell>
                    <TableCell className="font-mono text-sm">{r.validFrom}</TableCell>
                    <TableCell className="font-mono text-sm">{r.validTo ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? 'default' : 'secondary'}>
                        {r.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Editar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
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
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Nuevo requisito de cobertura' : 'Editar requisito'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {mode === 'create' && (
              <>
                <div>
                  <Label>ID Ubicación *</Label>
                  <Input type="number" value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))} />
                </div>
                <div>
                  <Label>ID Horario *</Label>
                  <Input type="number" value={form.scheduleId} onChange={e => setForm(f => ({ ...f, scheduleId: e.target.value }))} />
                </div>
              </>
            )}
            <div>
              <Label>Día de la semana</Label>
              <select
                className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                value={form.dayOfWeek}
                onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}
              >
                {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div>
              <Label>Guardias requeridos</Label>
              <Input type="number" min={1} value={form.requiredGuards} onChange={e => setForm(f => ({ ...f, requiredGuards: Number(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Válido desde</Label>
                <Input type="date" value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))} />
              </div>
              <div>
                <Label>Válido hasta</Label>
                <Input type="date" value={form.validTo} onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))} />
              </div>
            </div>
            {mode === 'edit' && (
              <div className="flex items-center justify-between">
                <Label>Activo</Label>
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </div>
            )}
            <div>
              <Label>Notas</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
