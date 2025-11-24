/**
 * Modal de Preview de PDF
 * Universidad Técnica de Ambato
 * 
 * Modal reutilizable para mostrar preview de PDFs en Base64.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

// ============================================
// Props
// ============================================

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  base64Data: string | null;
  reportName: string;
  onDownload?: () => void;
}

// ============================================
// Componente Principal
// ============================================

export function PdfPreviewModal({ 
  isOpen, 
  onClose, 
  base64Data, 
  reportName,
  onDownload 
}: PdfPreviewModalProps) {
  const [zoom, setZoom] = useState(100);

  if (!isOpen || !base64Data) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vista Previa - {reportName}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 rounded-md">
          <div 
            className="p-4"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease'
            }}
          >
            <iframe
              src={`data:application/pdf;base64,${base64Data}`}
              className="w-full h-full min-h-[600px] bg-white rounded shadow-lg"
              title="PDF Preview"
              style={{ border: 'none' }}
            />
          </div>
        </div>

        {/* Footer */}
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
