// src/components/selfService/InternalRequestDetailDialog.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, Pencil, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { EmployeeInternalRequestsAPI } from '@/lib/api/services/employeeSelfService';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { HistoryTimeline } from '@/components/shared/HistoryTimeline';

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', DEVUELTO: 'Devuelto',
  APROBADO: 'Aprobado', RECHAZADO: 'Rechazado', ANULADO: 'Anulado', COMPLETADO: 'Completado',
};

function statusTone(status: string): 'success' | 'warning' | 'destructive' | 'primary' | 'muted' {
  if (['APROBADO', 'COMPLETADO'].includes(status)) return 'success';
  if (['PENDIENTE', 'DEVUELTO'].includes(status)) return 'warning';
  if (status === 'EN_REVISION') return 'primary';
  if (['RECHAZADO', 'ANULADO'].includes(status)) return 'destructive';
  return 'muted';
}

const EDITABLE_STATUSES = ['PENDIENTE', 'DEVUELTO'];
const CANCELLABLE_STATUSES = ['PENDIENTE', 'EN_REVISION', 'DEVUELTO'];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: number | null;
  onChanged?: () => void;
};

export function InternalRequestDetailDialog({ open, onOpenChange, requestId, onChanged }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const setEditOpen = (editOpen: boolean) => setMode(editOpen ? 'edit' : 'view');
  const { setIsFormDirty, handleOpenChange: handleEditOpenChange, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard(setEditOpen);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-internal-request', requestId],
    queryFn: () => EmployeeInternalRequestsAPI.getMyById(requestId!),
    enabled: open && !!requestId,
  });

  const request = data?.status === 'success' ? data.data : null;

  const startEdit = () => {
    if (!request) return;
    setSubject(request.subject);
    setDescription(request.description ?? '');
    setIsFormDirty(false);
    setMode('edit');
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error('Solicitud no encontrada.');
      const res = await EmployeeInternalRequestsAPI.updateMy(request.requestId, {
        subject, description: description || null, rowVersion: request.rowVersion,
      });
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-internal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-internal-request', requestId] });
      toast({ title: 'Solicitud actualizada' });
      setIsFormDirty(false);
      setMode('view');
      onChanged?.();
    },
    onError: (err: unknown) => {
      toast({ variant: 'destructive', title: 'No se pudo actualizar', description: parseApiError(err) });
    },
  });

  const handleCancel = async () => {
    if (!request || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      const res = await EmployeeInternalRequestsAPI.cancelMy(request.requestId, {
        reason: cancelReason, rowVersion: request.rowVersion,
      });
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      queryClient.invalidateQueries({ queryKey: ['my-internal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-internal-request', requestId] });
      toast({ title: 'Solicitud anulada' });
      setCancelReason('');
      onChanged?.();
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo anular', description: parseApiError(err) });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setMode('view'); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error || !request ? (
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{parseApiError(error) || 'No se encontró la solicitud.'}</p>
              <Button onClick={() => refetch()}>Reintentar</Button>
            </div>
          ) : mode === 'edit' ? (
            <>
              <DialogHeader>
                <DialogTitle>Editar solicitud</DialogTitle>
                <DialogDescription>Solo puedes editar mientras esté Pendiente o Devuelta.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto</Label>
                  <Input id="subject" value={subject} onChange={(e) => { setSubject(e.target.value); setIsFormDirty(true); }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" rows={4} value={description}
                    onChange={(e) => { setDescription(e.target.value); setIsFormDirty(true); }} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handleEditOpenChange(false)} disabled={updateMutation.isPending}>Cancelar</Button>
                  <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !subject.trim()}>
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Guardar cambios
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {request.subject}
                  <StatusBadge label={STATUS_LABEL[request.status] ?? request.status} tone={statusTone(request.status)} />
                </DialogTitle>
                <DialogDescription>Solicitud #{request.requestId} · {request.requestType}</DialogDescription>
              </DialogHeader>

              <div className="flex justify-end gap-2 -mt-2">
                {EDITABLE_STATUSES.includes(request.status) && (
                  <Button variant="outline" size="sm" onClick={startEdit}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
                {CANCELLABLE_STATUSES.includes(request.status) && (
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => setCancelReason(cancelReason || ' ')}>
                    <Ban className="h-4 w-4 mr-1" /> Anular
                  </Button>
                )}
              </div>

              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Descripción</div>
                <div className="font-medium">{request.description || '—'}</div>
              </div>

              {CANCELLABLE_STATUSES.includes(request.status) && cancelReason && (
                <Card className="border-destructive/40">
                  <CardContent className="p-4 space-y-3">
                    <textarea
                      className="w-full rounded-md border border-input bg-background p-2 text-sm"
                      rows={3}
                      placeholder="Motivo de anulación (obligatorio)…"
                      value={cancelReason.trim() === '' ? '' : cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCancelReason('')} disabled={isCancelling}>Cancelar</Button>
                      <Button size="sm" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        disabled={isCancelling || !cancelReason.trim()} onClick={handleCancel}>
                        {isCancelling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Confirmar anulación
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Historial</h4>
                <HistoryTimeline
                  entries={request.history.map((h) => ({
                    id: h.historyId, previousStatus: h.previousStatus, newStatus: h.newStatus,
                    action: h.action, observation: h.observation, createdAt: h.createdAt,
                  }))}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />
    </>
  );
}
