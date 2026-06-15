import { useState, useEffect } from 'react';
import { ArrowLeftRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox';
import { ScheduleCombobox } from '@/components/ui/ScheduleCombobox';
import { useShiftChangeMutations } from '@/hooks/guards/useGuards';
import { GuardShiftPlanningAPI } from '@/lib/api/services/guards';
import type { GuardShiftPlanningDetailDto, GuardShiftCalendarItemDto } from '@/types/guards';

// Tipos que requieren seleccionar un horario para el reemplazante
const TYPES_NEED_SCHEDULE = new Set(['SCHEDULE_CHANGE', 'COVERAGE']);

const CHANGE_TYPES = [
  { id: 1, label: 'Reemplazo de turno',   value: 'REPLACEMENT'     },
  { id: 2, label: 'Intercambio de turno', value: 'SWAP'            },
  { id: 3, label: 'Cambio de horario',    value: 'SCHEDULE_CHANGE' },
  { id: 4, label: 'Cobertura adicional',  value: 'COVERAGE'        },
  { id: 5, label: 'Cambio por emergencia',value: 'EMERGENCY'       },
];

type Props = {
  open: boolean;
  detail: GuardShiftPlanningDetailDto | null;
  onClose: () => void;
};

export function ShiftReplacementDialog({ open, detail, onClose }: Props) {
  const { createReplacement } = useShiftChangeMutations(() => onClose());

  const [replacementEmployeeId, setReplacementEmployeeId] = useState<number | null>(null);
  const [changeTypeId,          setChangeTypeId]          = useState<number>(1);
  const [newScheduleId,         setNewScheduleId]         = useState<number | null>(null);
  const [reason,                setReason]                = useState('');
  const [overrideConflict,      setOverrideConflict]      = useState(false);

  // Estado de validación de doble turno
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflicts,       setConflicts]       = useState<GuardShiftCalendarItemDto[]>([]);
  const [conflictChecked, setConflictChecked] = useState(false);

  const changeTypeValue = CHANGE_TYPES.find(t => t.id === changeTypeId)?.value ?? 'REPLACEMENT';
  const needsSchedule   = TYPES_NEED_SCHEDULE.has(changeTypeValue);

  // Verificar conflicto de doble turno al cambiar el reemplazante o la fecha
  useEffect(() => {
    if (!replacementEmployeeId || !detail?.workDate) {
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
      employeeId: replacementEmployeeId,
      startDate:  detail.workDate,
      endDate:    detail.workDate,
    }).then(res => {
      if (cancelled) return;
      const items: GuardShiftCalendarItemDto[] = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data) ? (res as any).data : [];

      // Excluir el propio planning que se está reemplazando
      const others = items.filter(
        i => i.planningId !== detail.planningId && i.status !== 'Cancelado'
      );
      setConflicts(others);
      setConflictChecked(true);
    }).catch(() => {
      if (!cancelled) setConflictChecked(true);
    }).finally(() => {
      if (!cancelled) setConflictLoading(false);
    });

    return () => { cancelled = true; };
  }, [replacementEmployeeId, detail?.workDate, detail?.planningId]);

  const handleSubmit = () => {
    if (!detail || !replacementEmployeeId || !reason.trim()) return;
    createReplacement.mutate({
      planningId: detail.planningId,
      replacementEmployeeId,
      changeTypeId,
      reason: reason.trim(),
      newScheduleId: newScheduleId ?? undefined,
    });
  };

  const handleClose = () => {
    setReplacementEmployeeId(null);
    setChangeTypeId(1);
    setNewScheduleId(null);
    setReason('');
    setConflicts([]);
    setConflictChecked(false);
    setOverrideConflict(false);
    onClose();
  };

  const isSaving    = createReplacement.isPending;
  const hasConflict = conflicts.length > 0;

  // Puede enviar si: tiene reemplazante, motivo, y (sin conflicto O el usuario aceptó continuar)
  const canSubmit =
    !!replacementEmployeeId &&
    reason.trim().length > 0 &&
    (!hasConflict || overrideConflict) &&
    !conflictLoading;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Solicitar reemplazo / cambio de turno
          </DialogTitle>
        </DialogHeader>

        {/* Resumen del turno original */}
        {detail && (
          <div className="bg-muted rounded-md p-3 text-sm space-y-1">
            <div><span className="text-muted-foreground">Guardia:</span> {detail.employeeFullName}</div>
            <div><span className="text-muted-foreground">Fecha:</span> {detail.workDate}</div>
            <div>
              <span className="text-muted-foreground">Turno:</span>{' '}
              {detail.scheduleCode ? `[${detail.scheduleCode}] ` : ''}{detail.scheduleName}
            </div>
            <div><span className="text-muted-foreground">Ubicación:</span> {detail.locationName}</div>
          </div>
        )}

        <div className="space-y-4 py-1">

          {/* Tipo de cambio */}
          <div>
            <Label className="text-xs">Tipo de cambio *</Label>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={changeTypeId}
              onChange={e => {
                setChangeTypeId(Number(e.target.value));
                setNewScheduleId(null);
              }}
            >
              {CHANGE_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Reemplazante */}
          <div>
            <Label className="text-xs">Reemplazante *</Label>
            <div className="mt-1">
              <EmployeeCombobox
                value={replacementEmployeeId}
                onSelect={v => {
                  setReplacementEmployeeId(v);
                  setOverrideConflict(false);
                }}
                placeholder="Buscar empleado reemplazante…"
              />
            </div>
          </div>

          {/* Indicador de verificación de conflicto */}
          {replacementEmployeeId && conflictLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verificando turnos del reemplazante…
            </div>
          )}

          {/* Sin conflicto */}
          {replacementEmployeeId && conflictChecked && !hasConflict && !conflictLoading && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              El reemplazante no tiene turnos asignados ese día.
            </div>
          )}

          {/* Alerta de doble turno */}
          {hasConflict && !conflictLoading && (
            <Alert variant="destructive" className="py-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Conflicto de doble turno</AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-1">
                <p>El reemplazante ya tiene {conflicts.length === 1 ? 'un turno asignado' : `${conflicts.length} turnos asignados`} el <strong>{detail?.workDate}</strong>:</p>
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

          {/* Nuevo horario — solo para tipos que lo requieren */}
          {needsSchedule && (
            <div>
              <Label className="text-xs">
                Turno asignado al reemplazante *
              </Label>
              <p className="text-[11px] text-muted-foreground mb-1">
                El reemplazante trabajará en este turno en lugar del original.
              </p>
              <ScheduleCombobox
                value={newScheduleId}
                label={null}
                placeholder="Seleccionar turno…"
                onSelect={id => setNewScheduleId(id)}
              />
            </div>
          )}

          {/* Motivo */}
          <div>
            <Label className="text-xs">Motivo *</Label>
            <Textarea
              className="mt-1"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Indique el motivo del cambio…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !canSubmit}>
            {isSaving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Enviando…</>
              : 'Solicitar cambio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
