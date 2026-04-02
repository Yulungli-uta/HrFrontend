/**
 * Hook Genérico para Reportes
 * Universidad Técnica de Ambato
 *
 * Buenas prácticas:
 * - Usa cleanFilters + validateDateRange del servicio
 * - No duplica instancias: se usa desde ReportPage
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import reportService, { downloadBlob } from '@/lib/api/services/reports';
import type {
  DownloadReportParams,
  UseReportState,
  ReportAudit,
  ReportAuditFilter,
} from '@/types/reports';
import { getReportFileName, REPORT_CONFIGS } from '@/types/reports';

export function useReport() {
  const [state, setState] = useState<UseReportState>({
    isDownloading: false,
    isPreviewing: false,
    previewData: null,
    error: null,
  });

  const preview = useCallback(async (params: DownloadReportParams): Promise<string | null> => {
    const { type, filter } = params;
    const reportConfig = REPORT_CONFIGS[type];

    // Limpieza + validación
    const cleaned = reportService.cleanFilters(filter ?? {});
    if (!reportService.validateDateRange(cleaned)) {
      toast.error('Rango de fechas inválido: la fecha inicio no puede ser mayor que la fecha fin.');
      return null;
    }

    setState((prev) => ({ ...prev, isPreviewing: true, error: null }));

    try {
      const data = await reportService.preview(type, cleaned);

      if (!data?.base64Data) {
        throw new Error('El servidor no devolvió datos para la vista previa.');
      }

      setState((prev) => ({
        ...prev,
        previewData: data.base64Data,
        isPreviewing: false,
      }));

      toast.success(`Preview de ${reportConfig.title} generado`);
      return data.base64Data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';

      setState((prev) => ({
        ...prev,
        isPreviewing: false,
        error: error instanceof Error ? error : new Error(msg),
      }));

      toast.error(`Error al generar preview: ${msg}`);
      return null;
    }
  }, []);

  const download = useCallback(async (params: DownloadReportParams): Promise<boolean> => {
    const { type, format, filter } = params;
    const reportConfig = REPORT_CONFIGS[type];

    const cleaned = reportService.cleanFilters(filter ?? {});
    if (!reportService.validateDateRange(cleaned)) {
      toast.error('Rango de fechas inválido: la fecha inicio no puede ser mayor que la fecha fin.');
      return false;
    }

    setState((prev) => ({ ...prev, isDownloading: true, error: null }));

    try {
      const blob = await reportService.download(type, format, cleaned);

      if (!blob || blob.size === 0) {
        throw new Error('El archivo descargado está vacío');
      }

      const fileName = getReportFileName(type, format);
      downloadBlob(blob, fileName);

      setState((prev) => ({ ...prev, isDownloading: false }));
      toast.success(`${reportConfig.title} descargado: ${fileName}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';

      setState((prev) => ({
        ...prev,
        isDownloading: false,
        error: error instanceof Error ? error : new Error(msg),
      }));

      toast.error(`Error al descargar: ${msg}`);
      return false;
    }
  }, []);

  const closePreview = useCallback(() => {
    setState((prev) => ({ ...prev, previewData: null }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isDownloading: false,
      isPreviewing: false,
      previewData: null,
      error: null,
    });
  }, []);

  return {
    preview,
    download,
    closePreview,
    clearError,
    reset,
    isDownloading: state.isDownloading,
    isPreviewing: state.isPreviewing,
    previewData: state.previewData,
    error: state.error,
    isLoading: state.isDownloading || state.isPreviewing,
  };
}

// Auditoría (igual que tenías, sin cambios funcionales)
export function useReportAudit() {
  const [audits, setAudits] = useState<ReportAudit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAudits = useCallback(async (filter?: ReportAuditFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await reportService.getAudits(filter);
      setAudits(data);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Error al cargar auditorías');
      setError(e);
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { audits, isLoading, error, fetchAudits };
}

export default useReport;
