import { useState } from 'react';
import { RotateCw, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRotationPatterns, useGroupPatterns, useGroupPatternMutations } from '@/hooks/guards/useGuards';
import type { LocationGroupDetailDto, RotationPatternDto, RotationPatternDetailDto } from '@/types/guards';

const today = new Date().toISOString().slice(0, 10);

const SEQ_COLORS: Record<string, string> = {
  L: 'bg-slate-100 text-slate-500',
  M: 'bg-yellow-100 text-yellow-700',
  T: 'bg-orange-100 text-orange-700',
  N: 'bg-indigo-100 text-indigo-700',
};

function detailLetter(d: RotationPatternDetailDto): string {
  if (d.isRestDay) return 'L';
  const code = (d.scheduleCode ?? '').toUpperCase();
  if (code.includes('M')) return 'M';
  if (code.includes('T')) return 'T';
  if (code.includes('N')) return 'N';
  return code.slice(0, 1) || '?';
}

function PatternDayChips({ pattern }: { pattern: RotationPatternDto }) {
  return (
    <div className="mt-1.5 space-y-1">
      <p className="text-[10px] text-muted-foreground">{pattern.cycleDays} días de ciclo</p>
      <div className="flex flex-wrap gap-0.5">
        {pattern.details.map(d => {
          const letter = detailLetter(d);
          return (
            <span
              key={d.dayOrder}
              title={d.isRestDay ? 'Libre' : (d.scheduleDescription ?? d.scheduleCode ?? `Día ${d.dayOrder}`)}
              className={`w-6 h-6 rounded text-[10px] flex flex-col items-center justify-center font-semibold ${SEQ_COLORS[letter] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {letter}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  group: LocationGroupDetailDto | null;
  onClose: () => void;
};

export function GroupPatternAssignmentDialog({ open, group, onClose }: Props) {
  const { data: patternsResp } = useRotationPatterns();
  const { data: currentResp, isLoading: loadingCurrent } = useGroupPatterns(group?.groupId ?? null);
  const { assign, remove } = useGroupPatternMutations(() => onClose());

  const [form, setForm] = useState({
    patternId: '',
    startCycleDate: today,
    validFrom: today,
    validTo: '',
    notes: '',
  });

  const patterns = patternsResp?.status === 'success' ? patternsResp.data : [];
  const currentPatterns = currentResp?.status === 'success' ? currentResp.data : [];
  const activePattern = currentPatterns.find(p => p.isActive);
  const selectedPattern = patterns.find(p => String(p.patternId) === form.patternId) ?? null;

  const handleAssign = () => {
    if (!group || !form.patternId || !form.startCycleDate || !form.validFrom) return;
    assign.mutate({
      groupId: group.groupId,
      dto: {
        patternId: Number(form.patternId),
        startCycleDate: form.startCycleDate,
        validFrom: form.validFrom,
        validTo: form.validTo || undefined,
        notes: form.notes || undefined,
      },
    });
  };

  const handleRemove = (groupPatternId: number) => {
    if (!group) return;
    remove.mutate({ groupId: group.groupId, groupPatternId });
  };

  const isSaving = assign.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCw className="h-4 w-4" />
            Patrón de rotación
          </DialogTitle>
        </DialogHeader>

        {group && (
          <div className="text-sm space-y-0.5 pb-1">
            <p className="font-semibold">{group.groupName}</p>
            {group.groupCode && <p className="text-xs text-muted-foreground font-mono">{group.groupCode}</p>}
          </div>
        )}

        <Separator />

        {/* Patrón activo actual */}
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Patrón activo</p>
          {loadingCurrent ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : activePattern ? (
            <div className="rounded-md border px-3 py-2.5 bg-muted/30 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{activePattern.patternName}</p>
                  <p className="text-xs text-muted-foreground">
                    Vigente desde {activePattern.validFrom} · Inicio ciclo: {activePattern.startCycleDate}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="default" className="text-xs">Activo</Badge>
                  <Button
                    variant="ghost" size="sm" className="text-destructive text-xs h-7 px-2"
                    disabled={isSaving}
                    onClick={() => handleRemove(activePattern.groupPatternId)}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
              {activePattern.patternCode && (
                <p className="text-[10px] font-mono text-muted-foreground">{activePattern.patternCode}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sin patrón asignado</p>
          )}
        </div>

        <Separator />

        {/* Formulario nuevo patrón */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Asignar nuevo patrón</p>

          {/* Selector de patrón con preview */}
          <div>
            <Label className="text-xs">Patrón *</Label>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={form.patternId}
              onChange={e => setForm(f => ({ ...f, patternId: e.target.value }))}
            >
              <option value="">Seleccionar patrón…</option>
              {patterns.map(p => (
                <option key={p.patternId} value={p.patternId}>
                  {p.name} — {p.cycleDays} días
                </option>
              ))}
            </select>

            {/* Preview del patrón seleccionado */}
            {selectedPattern && (
              <div className="mt-2 rounded-md border px-3 py-2 bg-muted/20">
                {selectedPattern.description && (
                  <p className="text-xs text-muted-foreground mb-1">{selectedPattern.description}</p>
                )}
                <PatternDayChips pattern={selectedPattern} />
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><span className="w-3 h-3 rounded bg-slate-100 inline-block" /> Libre</span>
                  <span className="flex items-center gap-0.5"><span className="w-3 h-3 rounded bg-yellow-100 inline-block" /> Mañana</span>
                  <span className="flex items-center gap-0.5"><span className="w-3 h-3 rounded bg-orange-100 inline-block" /> Tarde</span>
                  <span className="flex items-center gap-0.5"><span className="w-3 h-3 rounded bg-indigo-100 inline-block" /> Noche</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Inicio de ciclo *</Label>
              <Input
                type="date" className="h-8 text-sm mt-1"
                value={form.startCycleDate}
                onChange={e => setForm(f => ({ ...f, startCycleDate: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Fecha desde la cual contar el ciclo</p>
            </div>
            <div>
              <Label className="text-xs">Válido desde *</Label>
              <Input
                type="date" className="h-8 text-sm mt-1"
                value={form.validFrom}
                onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Inicio de vigencia del patrón</p>
            </div>
          </div>

          <div>
            <Label className="text-xs">Válido hasta <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              type="date" className="h-8 text-sm mt-1"
              value={form.validTo}
              onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Dejar vacío si la vigencia es indefinida</p>
          </div>

          <div>
            <Label className="text-xs">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              className="h-8 text-sm mt-1"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observaciones opcionales"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button
            onClick={handleAssign}
            disabled={isSaving || !form.patternId || !form.startCycleDate || !form.validFrom}
          >
            {assign.isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Asignando…</>
              : <><RotateCw className="h-3.5 w-3.5 mr-2" />Asignar patrón</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
