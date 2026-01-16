//client/src/pages/reports/ReportPage.tsx
/**
 * Componente Base Genérico para Páginas de Reportes
 *
 * Buenas prácticas:
 * - Una sola instancia de useReport (single source of truth)
 * - ReportActions solo recibe callbacks/estados
 * - El modal se abre con previewData del MISMO hook
 */

import { useCallback, useState } from 'react';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportActions } from '@/components/reports/ReportActions';
import { PdfPreviewModal } from '@/components/reports/PdfPreviewModal';
import { useReport } from '@/hooks/useReport';
import type { ReportType, ReportFilter } from '@/types/reports';
import { REPORT_CONFIGS } from '@/types/reports';

interface ReportPageProps {
  reportType: ReportType;
}

export function ReportPage({ reportType }: ReportPageProps) {
  const [filter, setFilter] = useState<ReportFilter>({});
  const reportConfig = REPORT_CONFIGS[reportType];

  // ✅ ÚNICA instancia compartida
  const {
    preview,
    download,
    previewData,
    closePreview,
    isPreviewing,
    isDownloading,
  } = useReport();

  const handlePreview = useCallback(async () => {
    await preview({ type: reportType, format: 'pdf', filter });
  }, [preview, reportType, filter]);

  const handleDownloadPdf = useCallback(async () => {
    await download({ type: reportType, format: 'pdf', filter });
  }, [download, reportType, filter]);

  const handleDownloadExcel = useCallback(async () => {
    await download({ type: reportType, format: 'excel', filter });
  }, [download, reportType, filter]);

  const handleDownloadFromPreview = useCallback(async () => {
    // descargamos y luego cerramos
    await handleDownloadPdf();
    closePreview();
  }, [handleDownloadPdf, closePreview]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{reportConfig.title}</h1>
          <p className="text-muted-foreground mt-1">{reportConfig.description}</p>
        </div>
      </div>

      {/* Filtros */}
      <ReportFilters reportType={reportType} onFilterChange={setFilter} />

      {/* Acciones */}
      <ReportActions
        onPreview={handlePreview}
        onDownloadPdf={handleDownloadPdf}
        onDownloadExcel={handleDownloadExcel}
        isPreviewing={isPreviewing}
        isDownloading={isDownloading}
        description={reportConfig.description}
      />

      {/* Modal de Preview */}
      <PdfPreviewModal
        isOpen={!!previewData}
        onClose={closePreview}
        base64Data={previewData}
        reportName={reportConfig.title}
        onDownload={handleDownloadFromPreview}
      />
    </div>
  );
}

export default ReportPage;
