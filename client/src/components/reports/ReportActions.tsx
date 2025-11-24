/**
 * Componente Genérico de Acciones de Reportes
 * Universidad Técnica de Ambato
 * 
 * Botones reutilizables para preview y descarga de reportes.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Eye, FileText, FileSpreadsheet } from 'lucide-react';
import { useReport } from '@/hooks/useReport';
import type { ReportType, ReportFilter } from '@/types/reports';
import { REPORT_CONFIGS } from '@/types/reports';

// ============================================
// Props
// ============================================

interface ReportActionsProps {
  reportType: ReportType;
  filter?: ReportFilter;
  onPreviewClick?: () => void;
}

// ============================================
// Componente Principal
// ============================================

export function ReportActions({ reportType, filter, onPreviewClick }: ReportActionsProps) {
  const { download, preview, isDownloading, isPreviewing } = useReport();
  const reportConfig = REPORT_CONFIGS[reportType];

  const handlePreview = async () => {
    await preview({ type: reportType, format: 'pdf', filter });
    onPreviewClick?.();
  };

  const handleDownloadPdf = async () => {
    await download({ type: reportType, format: 'pdf', filter });
  };

  const handleDownloadExcel = async () => {
    await download({ type: reportType, format: 'excel', filter });
  };

  const isLoading = isDownloading || isPreviewing;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-3">
          
          {/* Vista Previa */}
          <Button
            onClick={handlePreview}
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
            onClick={handleDownloadPdf}
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
            onClick={handleDownloadExcel}
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

        {/* Información adicional */}
        <p className="text-sm text-muted-foreground mt-4">
          {reportConfig.description}
        </p>
      </CardContent>
    </Card>
  );
}

export default ReportActions;
