// src/lib/api/services/files.ts

/**
 * APIs de gestión de archivos y documentos
 * FileManagement (bajo nivel) + Documents (orquestador de entidad)
 */

import { apiFetch } from '../core/fetch';
import { API_CONFIG } from '../core/config';
import type { ApiResponse } from '../core/fetch';
import { tokenService } from '@/features/auth';
import type {
  UploadSingleArgs,
  DocumentUploadResultDto,
  StoredFileDto,
  UploadMappedArgs,
} from '@/types/documents';

// =============================================================================
// DTOs de archivos
// =============================================================================

export interface FileUploadResponseDto {
  success: boolean;
  message?: string;
  fullPath?: string;
  relativePath?: string;
  fileName?: string;
  fileSize: number;
  year: number;
}

export interface FileDeleteResponseDto {
  success: boolean;
  message?: string;
  filePath?: string;
}

// =============================================================================
// Helper interno: fetch directo sin Content-Type (para FormData)
// =============================================================================

async function fetchMultipart<T>(
  url: string,
  body: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<ApiResponse<T>> {
  try {
    const resp = await fetch(url, {
      method,
      body,
      headers: {
        Accept: 'application/json',
        ...(tokenService.getAccessToken()
          ? { Authorization: `Bearer ${tokenService.getAccessToken()}` }
          : {}),
      },
      credentials: API_CONFIG.CREDENTIALS,
    });

    if (!resp.ok) {
      let details: any;
      try {
        details = await resp.json();
      } catch {
        details = await resp.text();
      }
      return {
        status: 'error',
        error: {
          code: resp.status,
          message: details?.message || `HTTP Error ${resp.status}`,
          details,
        },
      };
    }

    const data = await resp.json();
    return { status: 'success', data };
  } catch (e: unknown) {
    return {
      status: 'error',
      error: { code: 0, message: (e as Error)?.message || 'Error de conexión' },
    };
  }
}

// =============================================================================
// API de Gestión de Archivos (bajo nivel)
// =============================================================================

export const FileManagementAPI = {
  /**
   * Sube un único archivo al servidor
   */
  uploadFile: (formData: FormData): Promise<ApiResponse<FileUploadResponseDto>> =>
    fetchMultipart<FileUploadResponseDto>(
      `${API_CONFIG.FILES_BASE_URL}/api/v1/rh/files/upload`,
      formData
    ),

  /**
   * Sube múltiples archivos al servidor
   */
  uploadMultipleFiles: (formData: FormData): Promise<ApiResponse<FileUploadResponseDto[]>> =>
    fetchMultipart<FileUploadResponseDto[]>(
      `${API_CONFIG.FILES_BASE_URL}/api/v1/rh/files/upload-multiple`,
      formData
    ),

  /**
   * Descarga un archivo del servidor como Blob
   */
  downloadFile: async (
    directoryCode: string,
    filePath: string
  ): Promise<ApiResponse<Blob>> => {
    const url = `${API_CONFIG.FILES_BASE_URL}/api/v1/rh/files/download/${encodeURIComponent(directoryCode)}?filePath=${encodeURIComponent(filePath)}`;
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: '*/*',
          ...(tokenService.getAccessToken()
            ? { Authorization: `Bearer ${tokenService.getAccessToken()}` }
            : {}),
        },
        credentials: API_CONFIG.CREDENTIALS,
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        return {
          status: 'error',
          error: { code: resp.status, message: text || `HTTP Error ${resp.status}` },
        };
      }
      const blob = await resp.blob();
      return { status: 'success', data: blob };
    } catch (e: unknown) {
      return {
        status: 'error',
        error: { code: 0, message: (e as Error)?.message || 'Error de conexión' },
      };
    }
  },

  /**
   * Verifica si un archivo existe
   */
  fileExists: (directoryCode: string, filePath: string): Promise<ApiResponse<boolean>> =>
    apiFetch<boolean>(
      `/api/v1/rh/files/exists/${encodeURIComponent(directoryCode)}?filePath=${encodeURIComponent(filePath)}`
    ),

  /**
   * Elimina un archivo del servidor
   */
  deleteFile: (
    directoryCode: string,
    filePath: string
  ): Promise<ApiResponse<FileDeleteResponseDto>> =>
    apiFetch<FileDeleteResponseDto>(
      `/api/v1/rh/files/delete/${encodeURIComponent(directoryCode)}?filePath=${encodeURIComponent(filePath)}`,
      { method: 'DELETE' }
    ),
};

// =============================================================================
// API de Documentos (orquestador por entidad)
// =============================================================================

export const DocumentsAPI = {
  /**
   * Lista documentos asociados a una entidad
   */
  listByEntity: (params: {
    directoryCode: string;
    entityType: string;
    entityId: string | number;
    uploadYear?: number;
    status?: number;
  }): Promise<ApiResponse<StoredFileDto[]>> => {
    const qs = new URLSearchParams();
    qs.append('directoryCode', params.directoryCode);
    qs.append('entityType', params.entityType);
    qs.append('entityId', String(params.entityId));
    if (params.uploadYear != null) qs.append('uploadYear', String(params.uploadYear));
    if (params.status != null) qs.append('status', String(params.status));
    return apiFetch<StoredFileDto[]>(`/api/v1/rh/documents/entity?${qs.toString()}`);
  },

  /**
   * Sube varios archivos del mismo tipo para una entidad
   */
  upload: (payload: {
    directoryCode: string;
    entityType: string;
    entityId: string | number;
    relativePath?: string;
    files: File[];
    documentTypeId?: string;
  }): Promise<ApiResponse<DocumentUploadResultDto>> => {
    const form = new FormData();
    form.append('DirectoryCode', payload.directoryCode);
    form.append('EntityType', payload.entityType);
    form.append('EntityId', String(payload.entityId));
    if (payload.relativePath) form.append('RelativePath', payload.relativePath);
    if (payload.documentTypeId) form.append('DocumentTypeId', payload.documentTypeId);
    payload.files.forEach((f) => form.append('Files', f));
    return apiFetch<DocumentUploadResultDto>('/api/v1/rh/documents/upload', {
      method: 'POST',
      body: form,
    });
  },

  /**
   * Sube un único archivo con su tipo de documento
   */
  uploadSingle: (args: UploadSingleArgs): Promise<ApiResponse<DocumentUploadResultDto>> => {
    const form = new FormData();
    form.append('DirectoryCode', args.directoryCode);
    form.append('EntityType', args.entityType);
    form.append('EntityId', String(args.entityId));
    if (args.relativePath) form.append('RelativePath', args.relativePath);
    if (args.documentTypeId) form.append('DocumentTypeId', args.documentTypeId);
    form.append('File', args.file);
    return apiFetch<DocumentUploadResultDto>('/api/v1/rh/documents/upload-single', {
      method: 'POST',
      body: form,
    });
  },

  /**
   * Sube múltiples archivos con diferente tipo de documento cada uno (batch mapeado)
   * Usa el binder ASP.NET Core: Items[0].DocumentTypeId + Items[0].File
   */
  uploadMapped: (args: UploadMappedArgs): Promise<ApiResponse<DocumentUploadResultDto>> => {
    const form = new FormData();
    form.append('DirectoryCode', args.directoryCode);
    form.append('EntityType', args.entityType);
    form.append('EntityId', String(args.entityId));
    if (args.relativePath) form.append('RelativePath', args.relativePath);
    args.items.forEach((it, i) => {
      form.append(`Items[${i}].DocumentTypeId`, it.documentTypeId);
      form.append(`Items[${i}].File`, it.file);
    });
    return apiFetch<DocumentUploadResultDto>('/api/v1/rh/documents/upload-mapped', {
      method: 'POST',
      body: form,
    });
  },

  /**
   * Descarga un documento por su GUID
   */
  download: (fileGuid: string): Promise<ApiResponse<Blob>> =>
    apiFetch<Blob>(`/api/v1/rh/documents/download/${encodeURIComponent(fileGuid)}`, {
      method: 'GET',
      headers: { Accept: '*/*' },
    }),

  /**
   * Elimina un documento por su GUID
   */
  remove: (fileGuid: string, deletePhysical = false): Promise<ApiResponse<void>> =>
    apiFetch<void>(
      `/api/v1/rh/documents/${encodeURIComponent(fileGuid)}?deletePhysical=${deletePhysical}`,
      { method: 'DELETE' }
    ),
};
