// src/components/personnelActions/DocumentPreviewPanel.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText, Download, Printer, Eye, Loader2 } from 'lucide-react';

type Props = {
  pdfBase64?: string | null;
  fileName?: string | null;
  generatedDocumentId?: number | null;
  /** Regenera el documento desde la plantilla para volver a obtener el PDF en memoria */
  onRegenerate?: () => void;
  isRegenerating?: boolean;
};

function base64ToBlob(base64: string, mimeType = 'application/pdf'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function DocumentPreviewPanel({
  pdfBase64,
  fileName,
  generatedDocumentId,
  onRegenerate,
  isRegenerating,
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasDocument = !!pdfBase64 || !!generatedDocumentId;
  const displayName = fileName ?? 'documento-accion-personal.pdf';

  const openPreview = () => {
    if (!pdfBase64) return;
    setLoading(true);
    const blob = base64ToBlob(pdfBase64);
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    setLoading(false);
    setPreviewOpen(true);
  };

  const handleDownload = () => {
    if (!pdfBase64) return;
    const blob = base64ToBlob(pdfBase64);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = displayName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!pdfBase64) return;
    const blob = base64ToBlob(pdfBase64);
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) win.onload = () => win.print();
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  };

  if (!hasDocument) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Documento Generado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground truncate">{displayName}</p>

            <div className="flex items-center gap-2 shrink-0">
              {/* Documento disponible en memoria: mostrar acciones completas */}
              {pdfBase64 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openPreview}
                    disabled={loading}
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Eye className="h-4 w-4" />}
                    <span className="ml-1 hidden sm:inline">Vista previa</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Descargar</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Imprimir</span>
                  </Button>
                </>
              )}

              {/* Documento existe en BD pero no en memoria: regenerar para obtener el PDF */}
              {!pdfBase64 && generatedDocumentId && onRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <FileText className="h-4 w-4" />}
                  <span className="ml-1 hidden sm:inline">Regenerar</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={closePreview}>
        <DialogContent className="w-[95vw] sm:max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa — {displayName}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
            {blobUrl ? (
              <iframe
                src={blobUrl}
                className="w-full h-full"
                title="documento-generado"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sin contenido disponible.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Descargar
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <Button onClick={closePreview}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
