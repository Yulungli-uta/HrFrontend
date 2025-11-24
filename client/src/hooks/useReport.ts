/**
 * Hook Genérico para Reportes
 * Universidad Técnica de Ambato
 * 
 * Hook completamente reutilizable para cualquier tipo de reporte.
 * Maneja preview, descarga, loading states y errores.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import reportService, { downloadBlob } from '@/lib/api/reports';
import type {
  ReportType,
  ReportFormat,
  ReportFilter,
  DownloadReportParams,
  UseReportState
} from '@/types/reports';
import { getReportFileName, getReportMimeType, REPORT_CONFIGS } from '@/types/reports';

// ============================================
// Hook useReport
// ============================================

export function useReport() {
  const [state, setState] = useState<UseReportState>({
    isDownloading: false,
    isPreviewing: false,
    previewData: null,
    error: null
  });

  /**
   * Preview de PDF (genérico para cualquier reporte)
   */
  const preview = useCallback(async (params: DownloadReportParams): Promise<string | null> => {
    const { type, filter } = params;
    const reportConfig = REPORT_CONFIGS[type];

    setState(prev => ({ ...prev, isPreviewing: true, error: null }));

    try {
      const response = await reportService.preview(type, filter);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al generar preview');
      }

      setState(prev => ({ ...prev, previewData: response.data, isPreviewing: false }));
      
      toast.success(`Preview de ${reportConfig.title} generado`);
      
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      setState(prev => ({ 
        ...prev, 
        isPreviewing: false, 
        error: error instanceof Error ? error : new Error(errorMessage)
      }));
      
      toast.error(`Error al generar preview: ${errorMessage}`);
      
      return null;
    }
  }, []);

  /**
   * Descarga de reporte (genérico para cualquier tipo y formato)
   */
  const download = useCallback(async (params: DownloadReportParams): Promise<boolean> => {
    const { type, format, filter } = params;
    const reportConfig = REPORT_CONFIGS[type];

    setState(prev => ({ ...prev, isDownloading: true, error: null }));

    try {
      const blob = await reportService.download(type, format, filter);
      
      if (!blob || blob.size === 0) {
        throw new Error('El archivo descargado está vacío');
      }

      const fileName = getReportFileName(type, format);
      downloadBlob(blob, fileName);
      
      setState(prev => ({ ...prev, isDownloading: false }));
      
      toast.success(`${reportConfig.title} descargado: ${fileName}`);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      setState(prev => ({ 
        ...prev, 
        isDownloading: false, 
        error: error instanceof Error ? error : new Error(errorMessage)
      }));
      
      toast.error(`Error al descargar: ${errorMessage}`);
      
      return false;
    }
  }, []);

  /**
   * Cierra el preview
   */
  const closePreview = useCallback(() => {
    setState(prev => ({ ...prev, previewData: null }));
  }, []);

  /**
   * Limpia el estado de error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset completo del estado
   */
  const reset = useCallback(() => {
    setState({
      isDownloading: false,
      isPreviewing: false,
      previewData: null,
      error: null
    });
  }, []);

  return {
    // Acciones
    preview,
    download,
    closePreview,
    clearError,
    reset,
    
    // Estado
    isDownloading: state.isDownloading,
    isPreviewing: state.isPreviewing,
    previewData: state.previewData,
    error: state.error,
    isLoading: state.isDownloading || state.isPreviewing
  };
}

// ============================================
// Hook Especializado para Auditoría
// ============================================

export function useReportAudit() {
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAudits = useCallback(async (filter?: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await reportService.getAudits(filter);
      setAudits(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al cargar auditorías');
      setError(error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    audits,
    isLoading,
    error,
    fetchAudits
  };
}

// ============================================
// Exportación por Defecto
// ============================================

export default useReport;
