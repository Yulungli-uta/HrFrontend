/**
 * Componente Genérico de Acciones de Reportes
 * Universidad Técnica de Ambato
 *
 * Buenas prácticas:
 * - NO crea su propio useReport (evita estados duplicados)
 * - Recibe callbacks y estados por props
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Eye, FileText, FileSpreadsheet } from 'lucide-react';

interface ReportActionsProps {
  onPreview: () => void | Promise<void>;
  onDownloadPdf: () => void | Promise<void>;
  onDownloadExcel: () => void | Promise<void>;
  isPreviewing?: boolean;
  isDownloading?: boolean;
  description?: string;
}

export function ReportActions({
  onPreview,
  onDownloadPdf,
  onDownloadExcel,
  isPreviewing = false,
  isDownloading = false,
  description,
}: ReportActionsProps) {
  const isLoading = isPreviewing || isDownloading;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-3">
          {/* Vista Previa */}
          <Button
            onClick={onPreview}
            disabled={isLoading}
            variant="outline"
            size="lg"
            className="flex-1 min-w-[200px]"
          >
            {isPreviewing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando Vista Previa...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Vista Previa
              </>
            )}
          </Button>

          {/* Descargar PDF */}
          <Button
            onClick={onDownloadPdf}
            disabled={isLoading}
            size="lg"
            className="flex-1 min-w-[200px]"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Descargar PDF
              </>
            )}
          </Button>

          {/* Descargar Excel */}
          <Button
            onClick={onDownloadExcel}
            disabled={isLoading}
            variant="secondary"
            size="lg"
            className="flex-1 min-w-[200px]"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Descargar Excel
              </>
            )}
          </Button>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground mt-4">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default ReportActions;
