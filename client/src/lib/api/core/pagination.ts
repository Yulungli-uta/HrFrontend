/**
 * Tipos de paginación y fábrica de servicios CRUD genéricos.
 * Principio OCP / DRY: un único factory para todos los recursos REST.
 *
 * CORRECCIÓN: Se añade el alias `remove` → `delete` para compatibilidad
 * con consumidores existentes que usan `.remove()` en lugar de `.delete()`.
 */

import { apiFetch } from './fetch';
import type { ApiResponse } from './fetch';

// =============================================================================
// Tipos de Paginación
// =============================================================================

/**
 * Parámetros para solicitudes paginadas al backend.
 * Corresponde al método GetPagedAsync del backend.
 */
export interface PagedRequest {
  /** Número de página (base 1). */
  page: number;
  /** Cantidad de registros por página. */
  pageSize: number;
  /** Campo por el que ordenar (opcional). */
  sortBy?: string;
  /** Dirección del orden: 'asc' | 'desc' (opcional). */
  sortDirection?: 'asc' | 'desc';
  /** Término de búsqueda para filtrar en el servidor (opcional). */
  search?: string;
}

/**
 * Respuesta paginada del backend.
 * Corresponde al DTO PagedResult<T> del backend.
 */
export interface PagedResult<T> {
  /** Lista de registros de la página actual. */
  items: T[];
  /** Número de página actual (base 1). */
  page: number;
  /** Cantidad de registros por página. */
  pageSize: number;
  /** Total de registros en la base de datos. */
  totalCount: number;
  /** Total de páginas calculadas. */
  totalPages: number;
  /** Indica si existe una página anterior. */
  hasPreviousPage: boolean;
  /** Indica si existe una página siguiente. */
  hasNextPage: boolean;
}

// =============================================================================
// Fábrica de servicios CRUD
// =============================================================================

/**
 * Crea un objeto de servicio CRUD completo para un recurso REST.
 *
 * @param basePath  Ruta base del recurso, ej. '/api/v1/rh/people'
 *
 * Métodos expuestos:
 *  - list()                  → GET  /basePath
 *  - listPaged(params)       → GET  /basePath/paged?...
 *  - get(id)                 → GET  /basePath/:id
 *  - create(data)            → POST /basePath
 *  - update(id, data)        → PUT  /basePath/:id
 *  - delete(id)              → DELETE /basePath/:id
 *  - remove(id)              → alias de delete (compatibilidad)
 */
export function createApiService<
  TEntity,
  TInsert = TEntity,
  TUpdate = Partial<TInsert>
>(basePath: string) {
  const deleteOne = (id: string | number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${basePath}/${id}`, { method: 'DELETE' });

  return {
    /**
     * Obtiene todos los registros sin paginación.
     * @deprecated Usar listPaged() para listas grandes.
     */
    list: (): Promise<ApiResponse<TEntity[]>> => apiFetch<TEntity[]>(basePath),

    /**
     * Obtiene registros paginados desde el backend.
     * Endpoint: GET /basePath/paged?page=1&pageSize=20
     */
    listPaged: (params: PagedRequest): Promise<ApiResponse<PagedResult<TEntity>>> => {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        ...(params.sortBy ? { sortBy: params.sortBy } : {}),
        ...(params.sortDirection ? { sortDirection: params.sortDirection } : {}),
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      });
      return apiFetch<PagedResult<TEntity>>(`${basePath}/paged?${qs.toString()}`);
    },

    get: (id: string | number): Promise<ApiResponse<TEntity>> =>
      apiFetch<TEntity>(`${basePath}/${id}`),

    create: (data: TInsert): Promise<ApiResponse<TEntity>> =>
      apiFetch<TEntity>(basePath, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string | number, data: TUpdate): Promise<ApiResponse<TEntity>> =>
      apiFetch<TEntity>(`${basePath}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    /** Elimina un registro por ID. */
    delete: deleteOne,

    /**
     * Alias de `delete` para compatibilidad con código legado que usa `.remove()`.
     * Ambos métodos ejecutan DELETE /basePath/:id.
     */
    remove: deleteOne,
  };
}

// Alias para compatibilidad con el nombre anterior (client.ts → createCrudService)
export { createApiService as createCrudService };
