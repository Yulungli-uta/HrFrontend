// src/components/resignationRetirement/HrRequestDetailDialog.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2, XCircle, Undo2, Ban, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ResignationRetirementAPI } from '@/lib/api/services/resignationRetirement';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { EmployeeInfoCard } from '@/components/resignationRetirement/EmployeeInfoCard';
import { RequestStatusBadge } from '@/components/resignationRetirement/RequestStatusBadge';
import { RequestHistoryTimeline } from '@/components/resignationRetirement/RequestHistoryTimeline';
import { ReviewActionDialog, type ReviewActionKind } from '@/components/resignationRetirement/ReviewActionDialog';
import { ReusableDocumentManager } from '@/components/ReusableDocumentManager';
import { useDirectoryParams } from '@/hooks/directoryParams/useDirectoryParams';
import { RESIGNATION_RETIREMENT_DIRECTORY_CODE, RESIGNATION_RETIREMENT_ENTITY_TYPE } from '@/features/constants';

const REQUEST_TYPE_LABEL: Record<string, string> = {
  RESIGNATION: 'Renuncia',
  RETIREMENT: 'Jubilación',
};

const REVIEWABLE_STATUSES = ['PENDIENTE', 'EN_REVISION'];
const CANCELLABLE_STATUSES = ['PENDIENTE', 'EN_REVISION', 'DEVUELTO', 'APROBADO'];

const DIR_CODE = RESIGNATION_RETIREMENT_DIRECTORY_CODE;
const ENTITY_TYPE = RESIGNATION_RETIREMENT_ENTITY_TYPE;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: number | null;
  onChanged?: () => void;
};

export function HrRequestDetailDialog({ open, onOpenChange, requestId, onChanged }: Props) {
  const { toast } = useToast();
  const [reviewAction, setReviewAction] = useState<ReviewActionKind | null>(null);
  const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);
  const { directory, params: dirParams } = useDirectoryParams(DIR_CODE);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['resignation-retirement-request', requestId],
    queryFn: () => ResignationRetirementAPI.getById(requestId!),
    enabled: open && !!requestId,
  });

  const request = data?.status === 'success' ? data.data : null;

  const handleDownloadDocument = async () => {
    if (!request) return;
    setIsDownloadingDocument(true);
    try {
      const res = await ResignationRetirementAPI.downloadDocument(request.requestId);
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {REQUEST_TYPE_LABEL[request.requestType] ?? request.requestType}
                  <RequestStatusBadge status={request.status} />
                </DialogTitle>
                <DialogDescription>
                  Solicitud #{request.requestId} · creada por {request.createdByName ?? `Empleado #${request.createdBy}`}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap justify-end gap-2 -mt-2">
                {REVIEWABLE_STATUSES.includes(request.status) && (
                  <>
                    <Button size="sm" onClick={() => setReviewAction('approve')} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aprobar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReviewAction('return')}>
                      <Undo2 className="h-4 w-4 mr-1" />
                      Devolver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => setReviewAction('reject')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                  </>
                )}
                {CANCELLABLE_STATUSES.includes(request.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => setReviewAction('cancel')}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Anular
                  </Button>
                )}
              </div>

              {request.status === 'APROBADO' && !request.linkedPersonnelActionId && (
                <Card className="border-success bg-success-subtle">
                  <CardContent className="p-4 text-sm text-success">
                    Solicitud aprobada. El proceso de desvinculación institucional (acción de personal, cierre de
                    cuenta AD, liquidación) se gestiona por separado.
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

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Documentos de respaldo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.generatedDocumentId && (
                    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {request.generatedDocumentFileName || 'Carta generada (sin firmar)'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Carta generada automáticamente por el sistema. El documento firmado por el empleado se
                          revisa en la lista de abajo.
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleDownloadDocument} disabled={isDownloadingDocument}>
                        {isDownloadingDocument ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Descargar
                      </Button>
                    </div>
                  )}
                  <ReusableDocumentManager
                    directoryCode={directory?.code ?? DIR_CODE}
                    entityType={ENTITY_TYPE}
                    entityId={request.requestId}
                    relativePath={dirParams.relativePath}
                    accept={dirParams.accept || '.pdf'}
                    maxSizeMB={dirParams.maxSizeMB}
                    label="Documentos de respaldo"
                    entityReady={true}
                  />
                </CardContent>
              </Card>

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

      {reviewAction && request && (
        <ReviewActionDialog
          open={!!reviewAction}
          onOpenChange={(o) => !o && setReviewAction(null)}
          action={reviewAction}
          request={request}
          onSuccess={() => {
            refetch();
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
