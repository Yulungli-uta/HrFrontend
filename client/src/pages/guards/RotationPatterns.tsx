import { useState } from 'react';
import { RotateCw, Plus, Sun, Moon, ChevronRight, ChevronLeft, Pencil, Info } from 'lucide-react';
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
import { ScheduleCombobox } from '@/components/ui/ScheduleCombobox';
import { useRotationPatternsPaged, useRotationPatternMutations } from '@/hooks/guards/useGuards';
import { DataPagination } from '@/components/ui/DataPagination';
import type {
  RotationPatternDto,
  CreateRotationPatternDto,
  UpdateRotationPatternDto,
  UpsertRotationPatternDetailsDto,
} from '@/types/guards';

type DialogMode = 'create-header' | 'create-details' | 'edit-header' | 'edit-details';

type DetailRow = {
  dayOrder: number;
  scheduleId: number | null;
  scheduleLabel: string;
  isRestDay: boolean;
  notes: string;
};

function buildDefaultDetails(cycleDays: number): DetailRow[] {
  return Array.from({ length: cycleDays }, (_, i) => ({
    dayOrder: i + 1,
    scheduleId: null,
    scheduleLabel: '',
    isRestDay: false,
    notes: '',
  }));
}

// ── Progress wizard ────────────────────────────────────────────────────────────

function WizardSteps({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <StepDot n={1} label="Datos del patrón" active={current === 1} done={current === 2} />
      <div className="h-px flex-1 bg-border" />
      <StepDot n={2} label="Configurar días" active={current === 2} done={false} />
    </div>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[72px]">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
        ${done ? 'bg-green-500 border-green-500 text-white' : active ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
        {done ? '✓' : n}
      </div>
      <span className={`text-[10px] text-center leading-tight ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}

// ── Hint box ───────────────────────────────────────────────────────────────────

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ── Day summary ────────────────────────────────────────────────────────────────

function DaySummary({ rows }: { rows: DetailRow[] }) {
  const work = rows.filter(r => !r.isRestDay).length;
  const rest = rows.filter(r => r.isRestDay).length;
  const withSchedule = rows.filter(r => !r.isRestDay && r.scheduleId).length;
  return (
    <div className="flex gap-3 text-xs text-muted-foreground mb-2">
      <span className="flex items-center gap-1">
        <Sun className="h-3 w-3 text-amber-500" /> {work} trabajo
        {withSchedule < work && <span className="text-orange-500 ml-1">({work - withSchedule} sin horario)</span>}
      </span>
      <span className="flex items-center gap-1">
        <Moon className="h-3 w-3 text-indigo-400" /> {rest} descanso
      </span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function RotationPatternsPage() {
  const {
    items: patterns, isLoading, page, pageSize, totalCount,
    totalPages, hasPreviousPage, hasNextPage, goToPage, setPageSize,
  } = useRotationPatternsPaged(20);
  const { create, update, setDetails } = useRotationPatternMutations();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>('create-header');
  const [selected, setSelected] = useState<RotationPatternDto | null>(null);
  const [headerForm, setHeaderForm] = useState({
    name: '', cycleDays: 7, patternTypeId: 1, patternCode: '', description: '', isActive: true,
  });
  const [detailsRows, setDetailsRows] = useState<DetailRow[]>([]);

  const openCreate = () => {
    setHeaderForm({ name: '', cycleDays: 7, patternTypeId: 1, patternCode: '', description: '', isActive: true });
    setDetailsRows([]);
    setMode('create-header');
    setSelected(null);
    setOpen(true);
  };

  const openEditHeader = (p: RotationPatternDto) => {
    setHeaderForm({
      name: p.name,
      cycleDays: p.cycleDays,
      patternTypeId: 1,
      patternCode: p.patternCode ?? '',
      description: p.description ?? '',
      isActive: p.isActive,
    });
    setSelected(p);
    setMode('edit-header');
    setOpen(true);
  };

  const openEditDetails = (p: RotationPatternDto) => {
    setSelected(p);
    setDetailsRows(
      Array.from({ length: p.cycleDays }, (_, i) => {
        const existing = p.details.find(d => d.dayOrder === i + 1);
        const labelParts = [
          existing?.scheduleDescription,
          existing?.scheduleCode ? `(${existing.scheduleCode})` : null,
        ].filter(Boolean);
        return {
          dayOrder: i + 1,
          scheduleId: existing?.scheduleId ?? null,
          scheduleLabel: labelParts.join(' '),
          isRestDay: existing?.isRestDay ?? false,
          notes: existing?.notes ?? '',
        };
      })
    );
    setMode('edit-details');
    setOpen(true);
  };

  const handleAdvanceToDetails = () => {
    if (!headerForm.name?.trim() || headerForm.cycleDays < 1) return;
    setDetailsRows(buildDefaultDetails(headerForm.cycleDays));
    setMode('create-details');
  };

  const handleCreate = () => {
    if (!headerForm.name?.trim()) return;
    const dto: CreateRotationPatternDto = {
      name: headerForm.name,
      patternCode: headerForm.patternCode || undefined,
      description: headerForm.description || undefined,
      cycleDays: headerForm.cycleDays,
      patternTypeId: headerForm.patternTypeId,
      details: detailsRows.map(r => ({
        dayOrder: r.dayOrder,
        scheduleId: r.isRestDay ? undefined : (r.scheduleId ?? undefined),
        isRestDay: r.isRestDay,
        notes: r.notes || undefined,
      })),
    };
    create.mutate(dto, {
      onSuccess: (r) => { if (r.status === 'success') setOpen(false); },
    });
  };

  const handleUpdateHeader = () => {
    if (!selected || !headerForm.name?.trim()) return;
    const dto: UpdateRotationPatternDto = {
      name: headerForm.name,
      patternCode: headerForm.patternCode || undefined,
      description: headerForm.description || undefined,
      isActive: headerForm.isActive,
    };
    update.mutate({ id: selected.patternId, dto }, {
      onSuccess: (r) => { if (r.status === 'success') setOpen(false); },
    });
  };

  const handleSaveDetails = () => {
    if (!selected) return;
    const dto: UpsertRotationPatternDetailsDto = {
      details: detailsRows.map(r => ({
        dayOrder: r.dayOrder,
        scheduleId: r.isRestDay ? undefined : (r.scheduleId ?? undefined),
        isRestDay: r.isRestDay,
        notes: r.notes || undefined,
      })),
    };
    setDetails.mutate({ id: selected.patternId, dto }, {
      onSuccess: (r) => { if (r.status === 'success') setOpen(false); },
    });
  };

  const isSaving = create.isPending || update.isPending || setDetails.isPending;

  const dialogTitle = () => {
    if (mode === 'create-header') return 'Nuevo patrón de rotación';
    if (mode === 'create-details') return `Configurar días — ${headerForm.name}`;
    if (mode === 'edit-header') return `Editar patrón — ${selected?.name}`;
    return `Días del ciclo — ${selected?.name}`;
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCw className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Patrones de Rotación</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo patrón
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando patrones…</p>
      ) : patterns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay patrones registrados.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {patterns.map(p => (
              <Card key={p.patternId} className={!p.isActive ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{p.name}</CardTitle>
                      {p.patternCode && (
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{p.patternCode}</p>
                      )}
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>
                      )}
                    </div>
                    <Badge variant={p.isActive ? 'default' : 'secondary'} className="shrink-0">
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ciclo:</span>
                    <span className="font-medium">{p.cycleDays} días</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Configurados:</span>
                    <span className={p.details.length < p.cycleDays ? 'text-orange-500 font-medium' : 'text-green-600 font-medium'}>
                      {p.details.length}/{p.cycleDays} días
                    </span>
                  </div>

                  {/* Visualización del ciclo */}
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: p.cycleDays }, (_, i) => {
                      const d = p.details.find(x => x.dayOrder === i + 1);
                      return (
                        <div
                          key={i}
                          title={d ? (d.isRestDay ? 'Descanso' : (d.scheduleDescription ?? 'Trabajo')) : `Día ${i + 1} — sin configurar`}
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center border
                            ${!d ? 'bg-muted border-muted text-muted-foreground' :
                              d.isRestDay ? 'bg-indigo-100 border-indigo-200 text-indigo-600' :
                              'bg-amber-100 border-amber-200 text-amber-700'}`}
                        >
                          {!d ? '?' : d.isRestDay ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                        </div>
                      );
                    }).slice(0, 28)}
                    {p.cycleDays > 28 && (
                      <span className="text-xs text-muted-foreground self-center">…</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline" size="sm" className="flex-1"
                      onClick={() => openEditDetails(p)}
                    >
                      <RotateCw className="h-3.5 w-3.5 mr-1" />
                      Configurar días
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                      title="Editar datos del patrón"
                      onClick={() => openEditHeader(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
        </>
      )}

      {/* ── Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{dialogTitle()}</DialogTitle>
          </DialogHeader>

          {/* ── PASO 1: Cabecera (crear) ── */}
          {mode === 'create-header' && (
            <>
              <WizardSteps current={1} />
              <Hint>
                Un patrón define el ciclo de trabajo repetitivo de un grupo. Ejemplo: 4 días trabajando + 4 días libres = ciclo de 8 días.
                Luego asignarás un horario rotativo a cada día activo.
              </Hint>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Nombre del patrón *</Label>
                  <Input
                    value={headerForm.name}
                    onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej: Rotación 4×4, Turno semanal, etc."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Código interno</Label>
                  <Input
                    value={headerForm.patternCode}
                    onChange={e => setHeaderForm(f => ({ ...f, patternCode: e.target.value }))}
                    placeholder="Ej: ROT_4X4 (opcional, para reportes)"
                    className="font-mono text-sm mt-1"
                  />
                </div>
                <div>
                  <Label>Días del ciclo *</Label>
                  <Input
                    type="number" min={1} max={365} step={1}
                    value={headerForm.cycleDays}
                    onKeyDown={e => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                    onChange={e => setHeaderForm(f => ({ ...f, cycleDays: parseInt(e.target.value, 10) || 1 }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total de días antes de que el ciclo se repita.
                    Ej: 7 = semana completa · 8 = 4×4 · 28 = 4 semanas
                  </p>
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={headerForm.description}
                    onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descripción opcional"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleAdvanceToDetails}
                  disabled={!headerForm.name?.trim() || headerForm.cycleDays < 1}
                >
                  Configurar días <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── PASO 2: Detalles (crear) ── */}
          {mode === 'create-details' && (
            <>
              <WizardSteps current={2} />
              <Hint>
                Asigna un <strong>horario rotativo</strong> a cada día activo. Los días de descanso no requieren horario.
                Solo aparecen horarios marcados como rotativos (campo <em>isRotating</em>).
              </Hint>
              <DaySummary rows={detailsRows} />
              <DetailsTable
                rows={detailsRows}
                onChange={setDetailsRows}
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setMode('create-header')} disabled={isSaving}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={isSaving}>
                  {isSaving ? 'Guardando…' : 'Crear patrón'}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Editar cabecera ── */}
          {mode === 'edit-header' && selected && (
            <>
              <Hint>
                Solo puedes modificar el nombre, código, descripción y estado activo.
                El número de días del ciclo (<strong>{selected.cycleDays} días</strong>) no puede cambiarse una vez creado el patrón.
              </Hint>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={headerForm.name}
                    onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Código interno</Label>
                  <Input
                    value={headerForm.patternCode}
                    onChange={e => setHeaderForm(f => ({ ...f, patternCode: e.target.value }))}
                    className="font-mono text-sm mt-1"
                    placeholder="Ej: ROT_4X4"
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={headerForm.description}
                    onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))}
                    className="mt-1"
                    placeholder="Descripción opcional"
                  />
                </div>
                <div className="bg-muted/50 rounded-md px-3 py-2 text-sm text-muted-foreground">
                  Ciclo: <strong className="text-foreground">{selected.cycleDays} días</strong> — no modificable
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Activo</Label>
                    <p className="text-xs text-muted-foreground">Los patrones inactivos no generan turnos</p>
                  </div>
                  <Switch
                    checked={headerForm.isActive}
                    onCheckedChange={v => setHeaderForm(f => ({ ...f, isActive: v }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleUpdateHeader} disabled={isSaving || !headerForm.name?.trim()}>
                  {isSaving ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Editar días ── */}
          {mode === 'edit-details' && selected && (
            <>
              <Hint>
                Solo se muestran <strong>horarios rotativos</strong>. Asegúrate de que los horarios estén marcados
                con <em>isRotating = true</em> en el catálogo de horarios.
              </Hint>
              <DaySummary rows={detailsRows} />
              <DetailsTable
                rows={detailsRows}
                onChange={setDetailsRows}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleSaveDetails} disabled={isSaving}>
                  {isSaving ? 'Guardando…' : 'Guardar días'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tabla de días reutilizable ─────────────────────────────────────────────────

function DetailsTable({
  rows,
  onChange,
}: {
  rows: DetailRow[];
  onChange: (rows: DetailRow[]) => void;
}) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-14 text-center">Día</TableHead>
            <TableHead>Horario rotativo</TableHead>
            <TableHead className="w-28 text-center">Descanso</TableHead>
            <TableHead>Notas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow
              key={row.dayOrder}
              className={row.isRestDay ? 'bg-indigo-50/60' : ''}
            >
              <TableCell className="text-center font-bold text-sm py-1.5">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs
                  ${row.isRestDay ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-700'}`}>
                  {row.dayOrder}
                </span>
              </TableCell>
              <TableCell className="py-1.5">
                {row.isRestDay ? (
                  <span className="text-xs text-indigo-500 flex items-center gap-1">
                    <Moon className="h-3 w-3" /> Día de descanso
                  </span>
                ) : (
                  <ScheduleCombobox
                    value={row.scheduleId}
                    label={row.scheduleLabel || null}
                    onlyRotating
                    placeholder="Seleccionar horario rotativo…"
                    onSelect={(id, s) => {
                      const updated = [...rows];
                      const label = s
                        ? `${s.description} · ${s.entryTime?.slice(0, 5) ?? ''}–${s.exitTime?.slice(0, 5) ?? ''}`
                        : '';
                      updated[idx] = { ...updated[idx], scheduleId: id, scheduleLabel: label };
                      onChange(updated);
                    }}
                  />
                )}
              </TableCell>
              <TableCell className="text-center py-1.5">
                <Switch
                  checked={row.isRestDay}
                  onCheckedChange={v => {
                    const updated = [...rows];
                    updated[idx] = {
                      ...updated[idx],
                      isRestDay: v,
                      scheduleId: v ? null : updated[idx].scheduleId,
                      scheduleLabel: v ? '' : updated[idx].scheduleLabel,
                    };
                    onChange(updated);
                  }}
                />
              </TableCell>
              <TableCell className="py-1.5">
                <Input
                  className="h-7 text-xs"
                  value={row.notes}
                  onChange={e => {
                    const updated = [...rows];
                    updated[idx] = { ...updated[idx], notes: e.target.value };
                    onChange(updated);
                  }}
                  placeholder="Observación…"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
