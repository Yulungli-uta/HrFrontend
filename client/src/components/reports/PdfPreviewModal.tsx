import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  base64Data: string | null;
  reportName: string;
  onDownload?: () => void;
}

function normalizeBase64(input: string): string {
  const noPrefix = input.replace(/^data:application\/pdf;base64,/i, '');
  return noPrefix.replace(/\s+/g, '');
}

function base64ToBlob(base64: string, mime = 'application/pdf'): Blob {
  const cleaned = normalizeBase64(base64);
  const bytes = atob(cleaned);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function PdfPreviewModal({ isOpen, onClose, base64Data, reportName, onDownload }: PdfPreviewModalProps) {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (isOpen) setZoom(100);
  }, [isOpen]);

  const objectUrl = useMemo(() => {
    if (!isOpen || !base64Data) return null;
    try {
      const blob = base64ToBlob(base64Data, 'application/pdf');
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('[PdfPreviewModal] Error convirtiendo base64 a Blob:', e);
      return null;
    }
  }, [isOpen, base64Data]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vista Previa - {reportName}</span>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
                <ZoomOut className="h-4 w-4" />
              </Button>

              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {zoom}%
              </span>

              <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted rounded-md">
          <div className="p-4 flex justify-center">
            <div style={{ width: `${zoom}%`, transition: 'width 0.2s ease' }} className="bg-card rounded shadow-lg">
              {objectUrl ? (
                <iframe
                  src={objectUrl}
                  className="w-full"
                  title="PDF Preview"
                  style={{ border: 'none', height: '70vh' }}
                />
              ) : (
                <div className="p-6 text-sm text-muted-foreground">
                  No se pudo generar la vista previa. Revisa consola y confirma que base64Data llega correcto.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Use los controles de zoom para ajustar la visualización
          </p>

          <div className="flex gap-2">
            {onDownload && (
              <Button onClick={onDownload} variant="default">
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            )}

            <Button onClick={onClose} variant="outline">
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PdfPreviewModal;
