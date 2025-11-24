/**
 * Componente Base Genérico para Páginas de Reportes
 * Universidad Técnica de Ambato
 * 
 * Componente reutilizable que encapsula la lógica común de todas las páginas de reportes.
 */

import { useState } from 'react';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportActions } from '@/components/reports/ReportActions';
import { PdfPreviewModal } from '@/components/reports/PdfPreviewModal';
import { useReport } from '@/hooks/useReport';
import type { ReportType, ReportFilter } from '@/types/reports';
import { REPORT_CONFIGS } from '@/types/reports';

// ============================================
// Props
// ============================================

interface ReportPageProps {
  reportType: ReportType;
}

// ============================================
// Componente Principal
// ============================================

export function ReportPage({ reportType }: ReportPageProps) {
  const [filter, setFilter] = useState<ReportFilter>({});
  const { previewData, closePreview, download } = useReport();
  const reportConfig = REPORT_CONFIGS[reportType];

  const handleDownloadFromPreview = () => {
    download({ type: reportType, format: 'pdf', filter });
    closePreview();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {reportConfig.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {reportConfig.description}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <ReportFilters 
        reportType={reportType}
        onFilterChange={setFilter}
      />

      {/* Acciones */}
      <ReportActions 
        reportType={reportType}
        filter={filter}
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
