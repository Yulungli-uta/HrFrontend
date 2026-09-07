import { useEffect, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useLocationRotationPeriods, useLocationRotationAssignments,
  useLocationRotationMutations, useGuardLocationsAssignable,
} from '@/hooks/guards/useGuards';
import type { LocationGroupDetailDto, GuardLocationRotationAssignmentDto } from '@/types/guards';

type Props = {
  open: boolean;
  group: LocationGroupDetailDto | null;
  onClose: () => void;
};

// Un grupo no tiene una ubicación fija propia (ver GuardRotationGroup): la ubicación se
// asigna dentro de un periodo de rotación de ubicaciones (HR.tbl_GuardLocationRotationPeriods).
// Este diálogo evita que el usuario tenga que ir a la pantalla separada "Rotación de
// Ubicaciones" solo para asignarle una ubicación al grupo dentro del periodo vigente hoy.
export function GroupLocationAssignmentDialog({ open, group, onClose }: Props) {
  const { data: periodsResp } = useLocationRotationPeriods();
  const periods = periodsResp?.status === 'success' ? periodsResp.data : [];

  const today = new Date().toISOString().slice(0, 10);
  const activePeriod = periods.find(p => p.isActive && p.startDate <= today && p.endDate >= today) ?? null;

  const { data: assignmentsResp, isLoading: loadingAssignments } = useLocationRotationAssignments(activePeriod?.locationRotationPeriodId ?? null);
  const assignments = assignmentsResp?.status === 'success' ? assignmentsResp.data : [];
  const activeAssignment = assignments.find(a => a.groupId === group?.groupId && a.isActive) ?? null;

  const { data: locData } = useGuardLocationsAssignable();
  const locations = locData?.status === 'success' ? locData.data : [];

  const { createAssignment, updateAssignment } = useLocationRotationMutations(() => { setEditing(false); onClose(); });

  const [editing, setEditing] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setEditing(false);
    setLocationId('');
    setNotes('');
  }, [open, group?.groupId]);

  const handleStartEdit = (a: GuardLocationRotationAssignmentDto) => {
    setEditing(true);
    setLocationId(String(a.locationId));
    setNotes(a.notes ?? '');
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setLocationId('');
    setNotes('');
  };

  const handleSave = () => {
    if (!group || !activePeriod || !locationId) return;
    if (activeAssignment) {
      updateAssignment.mutate({
        id: activeAssignment.locationRotationAssignmentId,
        dto: {
          locationId: Number(locationId),
          priorityTypeId: activeAssignment.priorityTypeId ?? undefined,
          isFixedLocation: activeAssignment.isFixedLocation,
          isFixedSchedule: activeAssignment.isFixedSchedule,
          notes: notes || undefined,
          isActive: true,
        },
      });
    } else {
      createAssignment.mutate({
        locationRotationPeriodId: activePeriod.locationRotationPeriodId,
        groupId: group.groupId,
        locationId: Number(locationId),
        isFixedLocation: false,
        isFixedSchedule: false,
        notes: notes || undefined,
      });
    }
  };

  const handleRemove = () => {
    if (!activeAssignment) return;
    updateAssignment.mutate({
      id: activeAssignment.locationRotationAssignmentId,
      dto: {
        locationId: activeAssignment.locationId,
        priorityTypeId: activeAssignment.priorityTypeId ?? undefined,
        isFixedLocation: activeAssignment.isFixedLocation,
        isFixedSchedule: activeAssignment.isFixedSchedule,
        notes: activeAssignment.notes ?? undefined,
        isActive: false,
      },
    });
  };

  const isSaving = createAssignment.isPending || updateAssignment.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Ubicación del grupo
          </DialogTitle>
        </DialogHeader>

        {group && (
          <div className="text-sm space-y-0.5 pb-1">
            <p className="font-semibold">{group.groupName}</p>
            {group.groupCode && <p className="text-xs text-muted-foreground font-mono">{group.groupCode}</p>}
          </div>
        )}

        <Separator />

        {!activePeriod ? (
          <p className="text-sm text-muted-foreground">
            No hay un periodo de rotación de ubicaciones activo que cubra la fecha de hoy.
            Crea o ajusta uno primero en <strong>Rotación de Ubicaciones</strong>.
          </p>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Ubicación actual · {activePeriod.name}
              </p>
              {loadingAssignments ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                </div>
              ) : activeAssignment ? (
                <div className="rounded-md border px-3 py-2.5 bg-muted/30 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{activeAssignment.locationName}</p>
                      {activeAssignment.locationCode && (
                        <p className="text-xs font-mono text-muted-foreground">{activeAssignment.locationCode}</p>
                      )}
                      {activeAssignment.notes && (
                        <p className="text-xs text-muted-foreground italic">{activeAssignment.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="default" className="text-xs">Activa</Badge>
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2" disabled={isSaving} onClick={() => handleStartEdit(activeAssignment)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive text-xs h-7 px-2" disabled={isSaving} onClick={handleRemove}>
                        Quitar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sin ubicación asignada en este periodo</p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {editing ? 'Editar ubicación' : (activeAssignment ? 'Cambiar ubicación' : 'Asignar ubicación')}
                </p>
                {editing && (
                  <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={handleCancelEdit} disabled={isSaving}>
                    Cancelar edición
                  </Button>
                )}
              </div>

              <div>
                <Label className="text-xs">Ubicación *</Label>
                <select
                  className="w-full h-9 border rounded-md px-3 text-sm bg-background mt-1"
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                >
                  <option value="">Seleccionar ubicación…</option>
                  {locations.map(l => (
                    <option key={l.locationId} value={l.locationId}>
                      {l.locationCode ? `[${l.locationCode}] ` : ''}{l.locationName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <input
                  className="w-full h-8 border rounded-md px-3 text-sm bg-background mt-1"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observaciones opcionales"
                />
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          {activePeriod && (
            <Button onClick={handleSave} disabled={isSaving || !locationId}>
              {isSaving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Guardando…</>
                : <><MapPin className="h-3.5 w-3.5 mr-2" />{activeAssignment ? 'Guardar cambios' : 'Asignar ubicación'}</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
