// src/components/resignationRetirement/MyRequestDetailDialog.tsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Pencil, Ban, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { ResignationRetirementAPI } from '@/lib/api/services/resignationRetirement';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { EmployeeInfoCard } from '@/components/resignationRetirement/EmployeeInfoCard';
import { RequestStatusBadge } from '@/components/resignationRetirement/RequestStatusBadge';
import { RequestHistoryTimeline } from '@/components/resignationRetirement/RequestHistoryTimeline';
import { RequestForm } from '@/components/resignationRetirement/RequestForm';
import { ReusableDocumentManager } from '@/components/ReusableDocumentManager';
import { useDirectoryParams } from '@/hooks/directoryParams/useDirectoryParams';
import { RESIGNATION_RETIREMENT_DIRECTORY_CODE, RESIGNATION_RETIREMENT_ENTITY_TYPE } from '@/features/constants';

const REQUEST_TYPE_LABEL: Record<string, string> = {
  RESIGNATION: 'Renuncia',
  RETIREMENT: 'Jubilación',
};

// Una vez que RRHH resuelve la solicitud (aprobada, rechazada o anulada) solo se puede
// consultar — nunca editar. Solo PENDIENTE/DEVUELTO siguen siendo editables por el dueño.
const EDITABLE_STATUSES = ['PENDIENTE', 'DEVUELTO'];
const CANCELLABLE_STATUSES = ['PENDIENTE', 'EN_REVISION', 'DEVUELTO'];

const DIR_CODE = RESIGNATION_RETIREMENT_DIRECTORY_CODE;
const ENTITY_TYPE = RESIGNATION_RETIREMENT_ENTITY_TYPE;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: number | null;
  onChanged?: () => void;
};

export function MyRequestDetailDialog({ open, onOpenChange, requestId, onChanged }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);
  const { directory, params: dirParams } = useDirectoryParams(DIR_CODE);

  const setEditOpen = (editOpen: boolean) => setMode(editOpen ? 'edit' : 'view');
  const { setIsFormDirty, handleOpenChange: handleEditOpenChange, close: closeEdit, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard(setEditOpen);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-resignation-retirement-request', requestId],
    queryFn: () => ResignationRetirementAPI.getMyById(requestId!),
    enabled: open && !!requestId,
  });

  const request = data?.status === 'success' ? data.data : null;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setMode('view');
      setCancelReason('');
    }
    onOpenChange(nextOpen);
  };

  const handleCancel = async () => {
    if (!request || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      const res = await ResignationRetirementAPI.cancelMy(request.requestId, {
        reason: cancelReason,
        rowVersion: request.rowVersion,
      });
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      queryClient.invalidateQueries({ queryKey: ['my-resignation-retirement-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-resignation-retirement-request', requestId] });
      toast({ title: 'Solicitud anulada' });
      setCancelReason('');
      onChanged?.();
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo anular la solicitud', description: parseApiError(err) });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!request) return;
    setIsDownloadingDocument(true);
    try {
      const res = await ResignationRetirementAPI.downloadMyDocument(request.requestId);
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo descargar el documento', description: parseApiError(err) });
    } finally {
      setIsDownloadingDocument(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <DialogDescription>
                  Solo puedes editar mientras la solicitud esté Pendiente o Devuelta.
                </DialogDescription>
              </DialogHeader>
              <RequestForm
                existing={request}
                onSuccess={() => {
                  closeEdit();
                  refetch();
                  onChanged?.();
                }}
                onCancel={closeEdit}
                onDirtyChange={setIsFormDirty}
              />
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {REQUEST_TYPE_LABEL[request.requestType] ?? request.requestType}
                  <RequestStatusBadge status={request.status} />
                </DialogTitle>
                <DialogDescription>Solicitud #{request.requestId}</DialogDescription>
              </DialogHeader>

              <div className="flex justify-end gap-2 -mt-2">
                {EDITABLE_STATUSES.includes(request.status) && (
                  <Button variant="outline" size="sm" onClick={() => setMode('edit')}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
                {CANCELLABLE_STATUSES.includes(request.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => setCancelReason(cancelReason || ' ')}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Anular
                  </Button>
                )}
              </div>

              {request.status === 'DEVUELTO' && (
                <Card className="border-warning bg-warning-subtle">
                  <CardContent className="p-4 text-sm text-warning">
                    Esta solicitud fue devuelta por Recursos Humanos para corrección. Edítala y guarda para reenviarla.
                  </CardContent>
                </Card>
              )}

              <EmployeeInfoCard info={request.employee} />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Datos de la solicitud</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Fecha de solicitud</div>
                    <div className="font-medium">{request.requestDate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fecha propuesta de salida</div>
                    <div className="font-medium">{request.proposedExitDate}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Motivo</div>
                    <div className="font-medium">{request.reason || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Observaciones adicionales</div>
                    <div className="font-medium">{request.additionalNotes || '—'}</div>
                  </div>
                </CardContent>
              </Card>

              {EDITABLE_STATUSES.includes(request.status) ? (
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Para generar la carta, descargarla, firmarla y adjuntar el documento firmado, pulsa
                    <span className="font-medium text-foreground"> Editar</span> arriba.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Carta y documento firmado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {request.generatedDocumentId && (
                      <Button size="sm" variant="outline" onClick={handleDownloadDocument} disabled={isDownloadingDocument}>
                        {isDownloadingDocument ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Descargar carta
                      </Button>
                    )}
                    <ReusableDocumentManager
                      directoryCode={directory?.code ?? DIR_CODE}
                      entityType={ENTITY_TYPE}
                      entityId={request.requestId}
                      relativePath={dirParams.relativePath}
                      accept={dirParams.accept || '.pdf'}
                      maxSizeMB={dirParams.maxSizeMB}
                      maxFiles={1}
                      label="Documento firmado"
                      entityReady={true}
                      roles={{ canUpload: false, canDelete: false, canDownload: true, canPreview: true }}
                    />
                  </CardContent>
                </Card>
              )}

              {CANCELLABLE_STATUSES.includes(request.status) && cancelReason && (
                <Card className="border-destructive/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-destructive">Anular solicitud</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <textarea
                      className="w-full rounded-md border border-input bg-background p-2 text-sm"
                      rows={3}
                      placeholder="Motivo de la anulación (obligatorio)…"
                      value={cancelReason.trim() === '' ? '' : cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCancelReason('')} disabled={isCancelling}>
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        disabled={isCancelling || !cancelReason.trim()}
                        onClick={handleCancel}
                      >
                        {isCancelling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Confirmar anulación
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Historial</CardTitle>
                </CardHeader>
                <CardContent>
                  <RequestHistoryTimeline entries={request.history} />
                </CardContent>
              </Card>
            </>
          )}
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />
    </>
  );
}
