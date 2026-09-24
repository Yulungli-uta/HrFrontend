import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

/**
 * Exportación de la Hoja de Vida Académica (formación, experiencia, publicaciones,
 * libros, capacitaciones, idiomas, áreas de conocimiento) en PDF — sin datos personales.
 */
export const AcademicCvAPI = {
  downloadPdf: (personId: number): Promise<ApiResponse<Blob>> =>
    apiFetch<Blob>(`/api/v1/rh/people/${personId}/academic-cv/pdf`, {
      headers: { Accept: 'application/pdf' },
    }),
};

export function downloadCvBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
