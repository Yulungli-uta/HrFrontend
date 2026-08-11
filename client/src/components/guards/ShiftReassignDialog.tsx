import { useState, useEffect } from 'react';
import { CalendarClock, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScheduleCombobox } from '@/components/ui/ScheduleCombobox';
import { useQuery } from '@tanstack/react-query';
import { useShiftChangeMutations } from '@/hooks/guards/useGuards';
import { GuardShiftPlanningAPI, GuardServiceLocationsAPI } from '@/lib/api/services/guards';
import type { GuardShiftPlanningDetailDto, GuardShiftCalendarItemDto, GuardServiceLocationDto } from '@/types/guards';

function extractArray<T>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res?.data)) return res.data as T[];
  return [];
}

type Props = {
  open: boolean;
  detail: GuardShiftPlanningDetailDto | null;
  onClose: () => void;
};

export function ShiftReassignDialog({ open, detail, onClose }: Props) {
  const { createReassignment } = useShiftChangeMutations(() => onClose());

  const [newWorkDate, setNewWorkDate] = useState('');
  const [newLocationId, setNewLocationId] = useState<number | null>(null);
  const [newScheduleId, setNewScheduleId] = useState<number | null>(null);
  const [newScheduleLabel, setNewScheduleLabel] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [overrideConflict, setOverrideConflict] = useState(false);

  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflicts, setConflicts] = useState<GuardShiftCalendarItemDto[]>([]);
  const [conflictChecked, setConflictChecked] = useState(false);

  const { data: locationsResp } = useQuery({
    queryKey: ['guards', 'locations', 'assignable'],
    queryFn: () => GuardServiceLocationsAPI.getAssignable(),
    staleTime: 60_000,
    enabled: open,
  });
  const locations: GuardServiceLocationDto[] = extractArray(locationsResp);

  // Precargar la fecha/ubicación/horario actuales al abrir
  useEffect(() => {
    if (open && detail) {
      setNewWorkDate(detail.workDate);
      setNewLocationId(detail.locationId);
      setNewScheduleId(detail.scheduleId);
      setNewScheduleLabel(
        `${detail.scheduleCode ? `[${detail.scheduleCode}] ` : ''}${detail.scheduleName}`
      );
    }
  }, [open, detail]);

  // Verificar conflicto de doble turno del mismo guardia en la fecha destino
  useEffect(() => {
    if (!detail || !newWorkDate) {
      setConflicts([]);
      setConflictChecked(false);
      setOverrideConflict(false);
      return;
    }

    let cancelled = false;
    setConflictLoading(true);
    setConflicts([]);
    setConflictChecked(false);
    setOverrideConflict(false);

    GuardShiftPlanningAPI.getCalendar({
      employeeId: detail.employeeId,
      startDate: newWorkDate,
      endDate: newWorkDate,
    }).then(res => {
      if (cancelled) return;
      const items: GuardShiftCalendarItemDto[] = extractArray(res);
      const others = items.filter(
        i => i.planningId !== detail.planningId && i.status !== 'CANCELLED' && i.status !== 'Cancelado'
      );
      setConflicts(others);
      setConflictChecked(true);
    }).catch(() => {
      if (!cancelled) setConflictChecked(true);
    }).finally(() => {
      if (!cancelled) setConflictLoading(false);
    });

    return () => { cancelled = true; };
  }, [detail, newWorkDate]);

  const handleClose = () => {
    setNewWorkDate('');
    setNewLocationId(null);
    setNewScheduleId(null);
    setNewScheduleLabel(null);
    setReason('');
    setConflicts([]);
    setConflictChecked(false);
    setOverrideConflict(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!detail || !newWorkDate || !newLocationId || !newScheduleId || !reason.trim()) return;
    createReassignment.mutate({
      planningId: detail.planningId,
      newWorkDate,
      newLocationId,
      newScheduleId,
      reason: reason.trim(),
    });
  };

  const isSaving = createReassignment.isPending;
  const hasConflict = conflicts.length > 0;

  const canSubmit =
    !!newWorkDate &&
    !!newLocationId &&
    !!newScheduleId &&
    reason.trim().length > 0 &&
    (!hasConflict || overrideConflict) &&
    !conflictLoading;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Reasignar turno
          </DialogTitle>
        </DialogHeader>

        {detail && (
          <div className="bg-muted rounded-md p-3 text-sm space-y-1">
            <div><span className="text-muted-foreground">Guardia:</span> {detail.employeeFullName}</div>
            <div><span className="text-muted-foreground">Turno actual:</span> {detail.workDate} — {detail.scheduleCode ? `[${detail.scheduleCode}] ` : ''}{detail.scheduleName} — {detail.locationName}</div>
          </div>
        )}

        <div className="space-y-4 py-1">
          <div>
            <Label htmlFor="newWorkDate" className="text-xs">Nueva fecha *</Label>
            <Input
              id="newWorkDate"
              type="date"
              value={newWorkDate}
              onChange={e => { setNewWorkDate(e.target.value); setOverrideConflict(false); }}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Nuevo turno *</Label>
            <div className="mt-1">
              <ScheduleCombobox
                value={newScheduleId}
                label={newScheduleLabel}
                placeholder="Seleccionar turno rotativo…"
                onSelect={(id, schedule) => {
                  setNewScheduleId(id);
                  setNewScheduleLabel(schedule ? null : null);
                }}
                onlyRotating
              />
            </div>
          </div>

          <div>
            <Label htmlFor="newLocationId" className="text-xs">Nueva ubicación *</Label>
            <select
              id="newLocationId"
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={newLocationId ?? ''}
              onChange={e => setNewLocationId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Seleccionar ubicación —</option>
              {locations.map(l => (
                <option key={l.locationId} value={l.locationId}>
                  {l.locationCode ? `[${l.locationCode}] ` : ''}{l.locationName}
                </option>
              ))}
            </select>
          </div>

          {conflictLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verificando disponibilidad del guardia en esa fecha…
            </div>
          )}

          {conflictChecked && !hasConflict && !conflictLoading && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              El guardia no tiene otro turno asignado esa fecha.
            </div>
          )}

          {hasConflict && !conflictLoading && (
            <Alert variant="destructive" className="py-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Conflicto de doble turno</AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-1">
                <p>El guardia ya tiene {conflicts.length === 1 ? 'un turno asignado' : `${conflicts.length} turnos asignados`} el <strong>{newWorkDate}</strong>:</p>
                <ul className="mt-1.5 space-y-0.5 pl-1">
                  {conflicts.map(c => (
                    <li key={c.planningId} className="flex items-start gap-1">
                      <span className="shrink-0">•</span>
                      <span>
                        {c.scheduleCode ? <strong>[{c.scheduleCode}]</strong> : null}{' '}
                        {c.scheduleDescription} — {c.locationName}
                      </span>
                    </li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={overrideConflict}
                    onChange={e => setOverrideConflict(e.target.checked)}
                  />
                  <span>Entiendo el conflicto y deseo continuar de todas formas</span>
                </label>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label className="text-xs">Motivo *</Label>
            <Textarea
              className="mt-1"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Indique el motivo de la reasignación…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !canSubmit}>
            {isSaving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Reasignando…</>
              : 'Reasignar turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
