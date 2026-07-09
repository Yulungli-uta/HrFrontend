// src/components/selfService/CertificateDetailDialog.tsx
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeCertificatesAPI } from '@/lib/api/services/employeeSelfService';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { HistoryTimeline } from '@/components/shared/HistoryTimeline';

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EMITIDO: 'Emitido',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
};

function statusTone(status: string): 'success' | 'warning' | 'destructive' | 'muted' {
  if (status === 'EMITIDO') return 'success';
  if (status === 'PENDIENTE') return 'warning';
  if (status === 'RECHAZADO') return 'destructive';
  return 'muted';
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: number | null;
};

export function CertificateDetailDialog({ open, onOpenChange, requestId }: Props) {
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-certificate', requestId],
    queryFn: () => EmployeeCertificatesAPI.getMyById(requestId!),
    enabled: open && !!requestId,
  });

  const certificate = data?.status === 'success' ? data.data : null;

  const handleDownload = async () => {
    if (!certificate) return;
    try {
      const res = await EmployeeCertificatesAPI.downloadMy(certificate.requestId);
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo descargar el certificado', description: parseApiError(err) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error || !certificate ? (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{parseApiError(error) || 'No se encontró el certificado.'}</p>
            <Button onClick={() => refetch()}>Reintentar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                Certificado {certificate.certificateType}
                <StatusBadge label={STATUS_LABEL[certificate.status] ?? certificate.status} tone={statusTone(certificate.status)} />
              </DialogTitle>
              <DialogDescription>Solicitud #{certificate.requestId}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Motivo</div>
                <div className="font-medium">{certificate.purpose || '—'}</div>
              </div>

              {certificate.status === 'EMITIDO' && (
                <Button onClick={handleDownload} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar certificado
                </Button>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2 text-foreground">Historial</h4>
              <HistoryTimeline
                entries={certificate.history.map((h) => ({
                  id: h.historyId,
                  previousStatus: h.previousStatus,
                  newStatus: h.newStatus,
                  action: h.action,
                  observation: h.observation,
                  createdAt: h.createdAt,
                }))}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
