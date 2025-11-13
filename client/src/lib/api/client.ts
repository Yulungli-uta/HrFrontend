/**
 * Cliente HTTP base para llamadas API
 * Maneja autenticación, timeouts y errores de forma centralizada
 */

import { tokenService } from '@/services/auth';

// =============================================================================
// Configuración
// =============================================================================

export const API_CONFIG = {
  // BASE_URL: import.meta.env.VITE_API_BASE || "http://localhost:5000",
  BASE_URL: import.meta.env.VITE_AUTH_API_BASE || "http://localhost:5010",
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  TIMEOUT: 15000, // 15 segundos
  CREDENTIALS: "include" as RequestCredentials
};

// =============================================================================
// Tipos
// =============================================================================

/**
 * Respuesta estándar de la API
 * @template T Tipo de datos esperado en la respuesta
 */
export type ApiResponse<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

/**
 * Error de la API
 */
export interface ApiError {
  code: number;
  message: string;
  details?: any;
}

// =============================================================================
// Cliente HTTP
// =============================================================================

/**
 * Realiza una llamada a la API con manejo avanzado de errores y timeout
 * @param path Ruta del endpoint
 * @param init Opciones adicionales de la solicitud
 * @returns Promise con la respuesta tipada
 */
export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  
  // Obtener token de autenticación
  const accessToken = tokenService.getAccessToken();
  const headers = { 
    ...API_CONFIG.DEFAULT_HEADERS, 
    ...init.headers,
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
  };

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
      credentials: API_CONFIG.CREDENTIALS,
      headers,
      ...init,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Manejo de respuestas exitosas
    if (response.ok) {
      // Respuestas sin contenido (204)
      if (response.status === 204) {
        return { status: 'success', data: undefined as unknown as T };
      }
      
      // Intenta parsear la respuesta como JSON
      try {
        const data = await response.json();
        return { status: 'success', data };
      } catch (jsonError) {
        // Si falla el parseo JSON, devuelve el texto
        const text = await response.text();
        return { status: 'success', data: text as unknown as T };
      }
    }
    
    // Manejo de errores HTTP
    let errorMessage = `Error HTTP ${response.status}`;
    let errorDetails;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      errorDetails = errorData.details || errorData;
    } catch {
      // Si no se puede parsear el error, usar el texto
      try {
        errorMessage = await response.text() || errorMessage;
      } catch {
        // Ignorar si no se puede leer el texto
      }
    }
    
    return {
      status: 'error',
      error: {
        code: response.status,
        message: errorMessage,
        details: errorDetails
      }
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Manejo de errores de red o timeout
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          status: 'error',
          error: {
            code: 408,
            message: 'La solicitud excedió el tiempo de espera',
            details: { timeout: API_CONFIG.TIMEOUT }
          }
        };
      }
      
      return {
        status: 'error',
        error: {
          code: 0,
          message: error.message || 'Error de conexión',
          details: error
        }
      };
    }
    
    return {
      status: 'error',
      error: {
        code: 0,
        message: 'Error desconocido',
        details: error
      }
    };
  }
}

// =============================================================================
// Funciones auxiliares para CRUD
// =============================================================================

/**
 * Crea un servicio CRUD genérico para un recurso
 * @param basePath Ruta base del recurso (ej: '/api/v1/rh/departments')
 * @returns Objeto con métodos CRUD
 */
export function createCrudService<TEntity, TInsert = TEntity, TUpdate = Partial<TInsert>>(
  basePath: string
) {
  return {
    /**
     * Lista todas las entidades
     */
    list: () => apiFetch<TEntity[]>(basePath),
    
    /**
     * Obtiene una entidad por ID
     */
    get: (id: string | number) => apiFetch<TEntity>(`${basePath}/${id}`),
    
    /**
     * Crea una nueva entidad
     */
    create: (data: TInsert) => apiFetch<TEntity>(basePath, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    
    /**
     * Actualiza una entidad existente
     */
    update: (id: string | number, data: TUpdate) => apiFetch<TEntity>(`${basePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    
    /**
     * Elimina una entidad
     */
    delete: (id: string | number) => apiFetch<void>(`${basePath}/${id}`, {
      method: 'DELETE'
    })
  };
}
