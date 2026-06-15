import { useState, useEffect } from 'react';
import { UserPlus, Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox';
import { ScheduleCombobox } from '@/components/ui/ScheduleCombobox';
import { useQuery } from '@tanstack/react-query';
import { usePlanningMutations } from '@/hooks/guards/useGuards';
import { GuardShiftPlanningAPI, GuardServiceLocationsAPI, GuardRotationGroupsAPI } from '@/lib/api/services/guards';
import { TiposReferenciaAPI } from '@/lib/api/services/catalogs';
import type { GuardShiftCalendarItemDto, GuardServiceLocationDto, GuardRotationGroupDto } from '@/types/guards';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractArray<T>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res?.data)) return res.data as T[];
  return [];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  /** Fecha preseleccionada (desde el tablero, opcional) */
  preselectedDate?: string;
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function ManualShiftAssignDialog({ open, onClose, preselectedDate }: Props) {
  const { create } = usePlanningMutations(() => handleClose());

  const [employeeId,  setEmployeeId]  = useState<number | null>(null);
  const [workDate,    setWorkDate]    = useState(preselectedDate ?? today());
  const [scheduleId,  setScheduleId]  = useState<number | null>(null);
  const [locationId,  setLocationId]  = useState<number | null>(null);
  const [groupId,     setGroupId]     = useState<number | null>(null);
  const [notes,       setNotes]       = useState('');
  const [overrideConflict, setOverrideConflict] = useState(false);

  // Validación de doble turno
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflicts,       setConflicts]       = useState<GuardShiftCalendarItemDto[]>([]);
  const [conflictChecked, setConflictChecked] = useState(false);

  // Catálogos
  const { data: locationsResp } = useQuery({
    queryKey: ['guards', 'locations', 'assignable'],
    queryFn:  () => GuardServiceLocationsAPI.getAssignable(),
    staleTime: 60_000,
  });
  const { data: groupsResp } = useQuery({
    queryKey: ['guards', 'rotation-groups', 'all'],
    queryFn:  () => GuardRotationGroupsAPI.getAll(),
    staleTime: 60_000,
  });

  // typeIds desde ref_Types
  const { data: sourceTypes } = useQuery({
    queryKey: ['refTypes', 'GUARD_PLANNING_SOURCE'],
    queryFn:  () => TiposReferenciaAPI.byCategory('GUARD_PLANNING_SOURCE'),
    staleTime: 300_000,
  });
  const { data: statusTypes } = useQuery({
    queryKey: ['refTypes', 'GUARD_PLANNING_STATUS'],
    queryFn:  () => TiposReferenciaAPI.byCategory('GUARD_PLANNING_STATUS'),
    staleTime: 300_000,
  });

  const locations: GuardServiceLocationDto[] = extractArray(locationsResp);
  const groups:    GuardRotationGroupDto[]   = extractArray(groupsResp);

  const manualSourceTypeId = extractArray<any>(sourceTypes).find(
    t => t.name === 'MANUAL'
  )?.typeId ?? null;

  const plannedStatusTypeId = extractArray<any>(statusTypes).find(
    t => t.name === 'PLANNED'
  )?.typeId ?? null;

  // Sincronizar fecha preseleccionada cuando se abre
  useEffect(() => {
    if (open) setWorkDate(preselectedDate ?? today());
  }, [open, preselectedDate]);

  // Verificar conflicto de doble turno al cambiar empleado o fecha
  useEffect(() => {
    if (!employeeId || !workDate) {
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
      employeeId,
      startDate: workDate,
      endDate:   workDate,
    }).then(res => {
      if (cancelled) return;
      const items: GuardShiftCalendarItemDto[] = extractArray(res);
      const activos = items.filter(i => i.status !== 'CANCELLED' && i.status !== 'Cancelado');
      setConflicts(activos);
      setConflictChecked(true);
    }).catch(() => {
      if (!cancelled) setConflictChecked(true);
    }).finally(() => {
      if (!cancelled) setConflictLoading(false);
    });

    return () => { cancelled = true; };
  }, [employeeId, workDate]);

  const handleClose = () => {
    setEmployeeId(null);
    setWorkDate(preselectedDate ?? today());
    setScheduleId(null);
    setLocationId(null);
    setGroupId(null);
    setNotes('');
    setConflicts([]);
    setConflictChecked(false);
    setOverrideConflict(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!employeeId || !locationId || !scheduleId || !workDate) return;
    if (!manualSourceTypeId || !plannedStatusTypeId) return;

    create.mutate({
      employeeId,
      locationId,
      workDate,
      scheduleId,
      groupId:             groupId ?? undefined,
      notes:               notes.trim() || undefined,
      planningSourceTypeId: manualSourceTypeId,
      statusTypeId:         plannedStatusTypeId,
    });
  };

  const isSaving    = create.isPending;
  const hasConflict = conflicts.length > 0;
  const typesReady  = !!manualSourceTypeId && !!plannedStatusTypeId;

  const canSubmit =
    !!employeeId &&
    !!locationId &&
    !!scheduleId &&
    !!workDate &&
    typesReady &&
    (!hasConflict || overrideConflict) &&
    !conflictLoading;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Asignar guardia manualmente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* Guardia */}
          <div>
            <Label className="text-xs">Guardia *</Label>
            <div className="mt-1">
              <EmployeeCombobox
                value={employeeId}
                onSelect={v => { setEmployeeId(v); setOverrideConflict(false); }}
                placeholder="Buscar guardia…"
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <Label htmlFor="workDate" className="text-xs">Fecha de trabajo *</Label>
            <Input
              id="workDate"
              type="date"
              value={workDate}
              onChange={e => { setWorkDate(e.target.value); setOverrideConflict(false); }}
              className="mt-1"
            />
          </div>

          {/* Verificación de doble turno */}
          {employeeId && conflictLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verificando turnos del guardia en esa fecha…
            </div>
          )}

          {employeeId && conflictChecked && !hasConflict && !conflictLoading && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              El guardia no tiene turnos asignados ese día.
            </div>
          )}

          {/* Alerta de doble turno */}
          {hasConflict && !conflictLoading && (
            <Alert variant="destructive" className="py-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Conflicto: doble turno detectado</AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-1">
                <p>
                  El guardia ya tiene{' '}
                  {conflicts.length === 1 ? 'un turno asignado' : `${conflicts.length} turnos asignados`}{' '}
                  el <strong>{workDate}</strong>:
                </p>
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
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
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

          {/* Turno — solo horarios rotativos */}
          <div>
            <Label className="text-xs">Turno rotativo *</Label>
            <div className="mt-1">
              <ScheduleCombobox
                value={scheduleId}
                label={null}
                placeholder="Seleccionar turno rotativo…"
                onSelect={id => setScheduleId(id)}
                onlyRotating
              />
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <Label htmlFor="locationId" className="text-xs">Ubicación *</Label>
            <select
              id="locationId"
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={locationId ?? ''}
              onChange={e => setLocationId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Seleccionar ubicación —</option>
              {locations.map(l => (
                <option key={l.locationId} value={l.locationId}>
                  {l.locationCode ? `[${l.locationCode}] ` : ''}{l.locationName}
                </option>
              ))}
            </select>
          </div>

          {/* Grupo (opcional) */}
          <div>
            <Label htmlFor="groupId" className="text-xs">Grupo (opcional)</Label>
            <select
              id="groupId"
              className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
              value={groupId ?? ''}
              onChange={e => setGroupId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Sin grupo —</option>
              {groups.map(g => (
                <option key={g.groupId} value={g.groupId}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              className="mt-1"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones sobre esta asignación…"
            />
          </div>

          {/* Advertencia si los typeIds aún no cargaron */}
          {!typesReady && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Cargando configuración del sistema…
            </p>
          )}

          {/* Ciclo de vida del estado */}
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Ciclo de vida del turno asignado
            </p>
            <ol className="text-[11px] text-blue-700 dark:text-blue-400 space-y-1 pl-1">
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 font-bold">1.</span>
                <span>Se crea en estado <strong>PLANNED</strong> — el guardia tiene turno asignado.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 font-bold">2.</span>
                <span>Si se aprueba un reemplazo pasa a <strong>REPLACED</strong> — el reemplazante cubre el turno.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 font-bold">3.</span>
                <span>Al cierre del día el job cruza con las picadas: <strong>COMPLETED</strong> si asistió, <strong>ABSENT</strong> si no hubo registro.</span>
              </li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !canSubmit}>
            {isSaving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Guardando…</>
              : 'Asignar turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
