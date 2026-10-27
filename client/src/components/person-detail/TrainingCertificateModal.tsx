// client/src/components/person-detail/TrainingCertificateModal.tsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Download, X } from "lucide-react";
import { CapacitacionesAPI } from "@/lib/api";
import { parseApiError } from "@/lib/error-handling";

interface TrainingCertificateModalProps {
  open: boolean;
  onClose: () => void;
  trainingId: number | null;
  title: string;
}

/**
 * Muestra el certificado de DEaDV en un modal. El PDF lo descarga HrBackend (DEaDV no permite
 * incrustar su PDF desde otra página) y aquí solo se visualiza como blob local; la URL original
 * del certificado nunca llega al navegador.
 */
export function TrainingCertificateModal({ open, onClose, trainingId, title }: TrainingCertificateModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || trainingId == null) return undefined;

    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setErrorMessage(null);
    setObjectUrl(null);

    void (async () => {
      try {
        const resp = await CapacitacionesAPI.getCertificate(trainingId);
        if (cancelled) return;
        if (resp.status === "success") {
          createdUrl = URL.createObjectURL(resp.data);
          setObjectUrl(createdUrl);
        } else {
          setErrorMessage(parseApiError(resp.error).message || "No se pudo obtener el certificado.");
        }
      } catch {
        if (!cancelled) setErrorMessage("No se pudo obtener el certificado. Intente de nuevo más tarde.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, trainingId]);

  const handleDownload = () => {
    if (!objectUrl) return;
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `certificado-${trainingId}.pdf`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="break-words pr-6">Certificado — {title}</DialogTitle>
          <DialogDescription>Certificado emitido por DEaDV.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden rounded-md bg-muted">
          {loading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Cargando certificado…</p>
            </div>
          )}
          {errorMessage && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground break-words">{errorMessage}</p>
            </div>
          )}
          {objectUrl && (
            <iframe src={objectUrl} title="Certificado de capacitación" className="h-full w-full border-0" />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDownload} disabled={!objectUrl}>
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
