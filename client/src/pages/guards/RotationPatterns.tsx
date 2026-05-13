import { useState } from 'react';
import { RotateCw, Plus, Sun, Moon } from 'lucide-react';
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
  UpsertRotationPatternDetailsDto,
} from '@/types/guards';

type DialogMode = 'create' | 'details';

type DetailRow = {
  dayOrder: number;
  scheduleId: number | null;
  scheduleLabel: string;
  isRestDay: boolean;
  notes: string;
};

export default function RotationPatternsPage() {
  const {
    items: patterns, isLoading, page, pageSize, totalCount,
    totalPages, hasPreviousPage, hasNextPage, goToPage, setPageSize,
  } = useRotationPatternsPaged(20);
  const { create, setDetails } = useRotationPatternMutations();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>('create');
  const [selected, setSelected] = useState<RotationPatternDto | null>(null);
  const [form, setForm] = useState<Partial<CreateRotationPatternDto>>({
    name: '', cycleDays: 7, patternTypeId: 1,
  });
  const [detailsRows, setDetailsRows] = useState<DetailRow[]>([]);

  const openCreate = () => {
    setForm({ name: '', cycleDays: 7, patternTypeId: 1 });
    setMode('create');
    setSelected(null);
    setOpen(true);
  };

  const openDetails = (p: RotationPatternDto) => {
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
    setMode('details');
    setOpen(true);
  };

  const handleCreate = () => {
    if (!form.name?.trim() || !form.cycleDays) return;
    create.mutate(form as CreateRotationPatternDto, {
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

  const isSaving = create.isPending || setDetails.isPending;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCw className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Patrones de Rotación</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo patrón
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando patrones…</p>
      ) : patterns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay patrones registrados.</p>
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {patterns.map(p => (
            <Card key={p.patternId}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Badge variant={p.isActive ? 'default' : 'secondary'}>
                    {p.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ciclo:</span>
                  <span>{p.cycleDays} días</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Detalles:</span>
                  <span>{p.details.length} días configurados</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.details.slice(0, 14).map(d => (
                    <div
                      key={d.patternDetailId}
                      title={d.isRestDay ? 'Descanso' : (d.scheduleDescription ?? 'Trabajo')}
                      className={`w-6 h-6 rounded text-xs flex items-center justify-center
                        ${d.isRestDay ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-primary'}`}
                    >
                      {d.isRestDay ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    </div>
                  ))}
                  {p.details.length > 14 && (
                    <span className="text-xs text-muted-foreground self-center">…</span>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => openDetails(p)}>
                  Configurar días
                </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Nuevo patrón de rotación' : `Configurar días: ${selected?.name}`}
            </DialogTitle>
          </DialogHeader>

          {mode === 'create' ? (
            <>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej: Rotación 4x4"
                  />
                </div>
                <div>
                  <Label>Días del ciclo *</Label>
                  <Input
                    type="number" min={1} max={365} step={1}
                    value={form.cycleDays ?? 7}
                    onKeyDown={e => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                    onChange={e => setForm(f => ({ ...f, cycleDays: parseInt(e.target.value, 10) || 1 }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Número de días antes de que el ciclo se repita (ej: 7 = semana, 28 = 4 semanas)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={isSaving || !form.name?.trim()}>
                  {isSaving ? 'Guardando…' : 'Crear patrón'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Día</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead className="w-24 text-center">Descanso</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailsRows.map((row, idx) => (
                    <TableRow key={row.dayOrder}>
                      <TableCell className="font-medium text-center">{row.dayOrder}</TableCell>
                      <TableCell className="py-1">
                        <ScheduleCombobox
                          value={row.scheduleId}
                          label={row.scheduleLabel || null}
                          disabled={row.isRestDay}
                          placeholder="— Sin horario —"
                          onSelect={(id, s) => {
                            const rows = [...detailsRows];
                            const label = s
                              ? `${s.description} · ${s.entryTime?.slice(0,5) ?? ''}–${s.exitTime?.slice(0,5) ?? ''}`
                              : '';
                            rows[idx] = { ...rows[idx], scheduleId: id, scheduleLabel: label };
                            setDetailsRows(rows);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Switch
                          checked={row.isRestDay}
                          onCheckedChange={v => {
                            const rows = [...detailsRows];
                            rows[idx] = {
                              ...rows[idx],
                              isRestDay: v,
                              scheduleId: v ? null : rows[idx].scheduleId,
                              scheduleLabel: v ? '' : rows[idx].scheduleLabel,
                            };
                            setDetailsRows(rows);
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          className="h-8 text-sm"
                          value={row.notes}
                          onChange={e => {
                            const rows = [...detailsRows];
                            rows[idx] = { ...rows[idx], notes: e.target.value };
                            setDetailsRows(rows);
                          }}
                          placeholder="Observación…"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
