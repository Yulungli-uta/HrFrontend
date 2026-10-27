import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, MoveHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PdfScrollViewer } from '@/components/reports/PdfScrollViewer';
import { logger } from "@/lib/logger";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  base64Data: string | null;
  reportName: string;
  onDownload?: () => void;
}

const MIN_ZOOM = 10;
const MAX_ZOOM = 300;
const ZOOM_STEP = 10;

function normalizeBase64(input: string): string {
  const noPrefix = input.replace(/^data:application\/pdf;base64,/i, '');
  return noPrefix.replace(/\s+/g, '');
}

function base64ToBytes(base64: string): Uint8Array {
  const bytes = atob(normalizeBase64(base64));
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return arr;
}

export function PdfPreviewModal({ isOpen, onClose, base64Data, reportName, onDownload }: PdfPreviewModalProps) {
  const [zoom, setZoom] = useState(100);
  const [fitRequest, setFitRequest] = useState(0);

  useEffect(() => {
    if (isOpen) setZoom(100);
  }, [isOpen]);

  const bytes = useMemo(() => {
    if (!isOpen || !base64Data) return null;
    try {
      return base64ToBytes(base64Data);
    } catch (e) {
      logger.error("PdfPreviewModal", '[PdfPreviewModal] Error decodificando el PDF en base64:', e);
      return null;
    }
  }, [isOpen, base64Data]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="truncate">Vista Previa - {reportName}</span>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Alejar">
                <ZoomOut className="h-4 w-4" />
              </Button>

              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {zoom}%
              </span>

              <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Acercar">
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="sm" onClick={() => setFitRequest(n => n + 1)}>
                <MoveHorizontal className="mr-1 h-4 w-4" />
                Ajustar al ancho
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>Previsualización del reporte en PDF antes de descargarlo.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <PdfScrollViewer data={bytes} zoom={zoom} fitRequest={fitRequest} onZoomChange={setZoom} />
        </div>

        <DialogFooter className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Arrastre el documento, use las barras o los botones ◀ ▶ para desplazarse; el 100 % es el tamaño real de la hoja.
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
