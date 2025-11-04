/**
 * Custom hook para operaciones CRUD con React Query
 * Elimina duplicación de código en formularios
 * Siguiendo principios DRY y Single Responsibility
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { ApiResponse } from '@/lib/api';

/**
 * Opciones de configuración para useCrudMutation
 * @template TData Tipo de datos de la entidad
 * @template TCreate Tipo para crear (puede ser diferente de TData)
 * @template TUpdate Tipo para actualizar (puede ser diferente de TData y TCreate)
 */
export interface UseCrudMutationOptions<TData, TCreate = TData, TUpdate = Partial<TCreate>> {
  /** Query key para invalidar cache */
  queryKey: string | string[];
  
  /** Función para crear entidad */
  createFn?: (data: TCreate) => Promise<ApiResponse<TData>>;
  
  /** Función para actualizar entidad */
  updateFn?: (id: string | number, data: TUpdate) => Promise<ApiResponse<TData>>;
  
  /** Función para eliminar entidad */
  deleteFn?: (id: string | number) => Promise<ApiResponse<void>>;
  
  /** Callback ejecutado después de crear exitosamente */
  onCreateSuccess?: (data: TData) => void;
  
  /** Callback ejecutado después de actualizar exitosamente */
  onUpdateSuccess?: (data: TData) => void;
  
  /** Callback ejecutado después de eliminar exitosamente */
  onDeleteSuccess?: () => void;
  
  /** Callback ejecutado después de cualquier operación exitosa */
  onSuccess?: () => void;
  
  /** Mensaje de éxito al crear */
  createSuccessMessage?: string;
  
  /** Mensaje de éxito al actualizar */
  updateSuccessMessage?: string;
  
  /** Mensaje de éxito al eliminar */
  deleteSuccessMessage?: string;
  
  /** Mensaje de error al crear */
  createErrorMessage?: string;
  
  /** Mensaje de error al actualizar */
  updateErrorMessage?: string;
  
  /** Mensaje de error al eliminar */
  deleteErrorMessage?: string;
  
  /** Si debe invalidar queries automáticamente (default: true) */
  invalidateOnSuccess?: boolean;
}

/**
 * Resultado del hook useCrudMutation
 */
export interface UseCrudMutationResult<TData, TCreate, TUpdate> {
  /** Mutation para crear */
  create: UseMutationResult<ApiResponse<TData>, Error, TCreate>;
  
  /** Mutation para actualizar */
  update: UseMutationResult<ApiResponse<TData>, Error, { id: string | number; data: TUpdate }>;
  
  /** Mutation para eliminar */
  delete: UseMutationResult<ApiResponse<void>, Error, string | number>;
  
  /** Indica si alguna operación está en progreso */
  isLoading: boolean;
}

/**
 * Custom hook para operaciones CRUD
 * 
 * @example
 * ```typescript
 * const { create, update, delete: deleteMutation, isLoading } = useCrudMutation({
 *   queryKey: ['/api/departments'],
 *   createFn: DepartmentsAPI.create,
 *   updateFn: DepartmentsAPI.update,
 *   deleteFn: DepartmentsAPI.delete,
 *   onSuccess: () => setIsFormOpen(false),
 *   createSuccessMessage: 'Departamento creado exitosamente',
 *   updateSuccessMessage: 'Departamento actualizado exitosamente'
 * });
 * 
 * // Uso en formulario
 * const onSubmit = (data) => {
 *   if (isEditing) {
 *     update.mutate({ id: department.id, data });
 *   } else {
 *     create.mutate(data);
 *   }
 * };
 * ```
 */
export function useCrudMutation<TData, TCreate = TData, TUpdate = Partial<TCreate>>({
  queryKey,
  createFn,
  updateFn,
  deleteFn,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
  onSuccess,
  createSuccessMessage = 'Creado exitosamente',
  updateSuccessMessage = 'Actualizado exitosamente',
  deleteSuccessMessage = 'Eliminado exitosamente',
  createErrorMessage = 'Error al crear',
  updateErrorMessage = 'Error al actualizar',
  deleteErrorMessage = 'Error al eliminar',
  invalidateOnSuccess = true
}: UseCrudMutationOptions<TData, TCreate, TUpdate>): UseCrudMutationResult<TData, TCreate, TUpdate> {
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Normalizar queryKey a array
  const queryKeyArray = Array.isArray(queryKey) ? queryKey : [queryKey];
  
  // Mutation para crear
  const createMutation = useMutation({
    mutationFn: async (data: TCreate) => {
      if (!createFn) {
        throw new Error('createFn no está definida');
      }
      return createFn(data);
    },
    onSuccess: (response) => {
      if (response.status === 'success') {
        // Invalidar queries si está habilitado
        if (invalidateOnSuccess) {
          queryClient.invalidateQueries({ queryKey: queryKeyArray });
        }
        
        // Mostrar toast de éxito
        toast({ 
          title: createSuccessMessage,
          variant: 'default'
        });
        
        // Ejecutar callbacks
        onCreateSuccess?.(response.data);
        onSuccess?.();
      } else {
        // Manejar error de API
        toast({ 
          title: createErrorMessage,
          description: response.error.message,
          variant: 'destructive' 
        });
      }
    },
    onError: (error: Error) => {
      // Manejar error de red o excepción
      toast({ 
        title: createErrorMessage,
        description: error.message || 'Error inesperado',
        variant: 'destructive' 
      });
    }
  });
  
  // Mutation para actualizar
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: TUpdate }) => {
      if (!updateFn) {
        throw new Error('updateFn no está definida');
      }
      return updateFn(id, data);
    },
    onSuccess: (response) => {
      if (response.status === 'success') {
        // Invalidar queries si está habilitado
        if (invalidateOnSuccess) {
          queryClient.invalidateQueries({ queryKey: queryKeyArray });
        }
        
        // Mostrar toast de éxito
        toast({ 
          title: updateSuccessMessage,
          variant: 'default'
        });
        
        // Ejecutar callbacks
        onUpdateSuccess?.(response.data);
        onSuccess?.();
      } else {
        // Manejar error de API
        toast({ 
          title: updateErrorMessage,
          description: response.error.message,
          variant: 'destructive' 
        });
      }
    },
    onError: (error: Error) => {
      // Manejar error de red o excepción
      toast({ 
        title: updateErrorMessage,
        description: error.message || 'Error inesperado',
        variant: 'destructive' 
      });
    }
  });
  
  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      if (!deleteFn) {
        throw new Error('deleteFn no está definida');
      }
      return deleteFn(id);
    },
    onSuccess: (response) => {
      if (response.status === 'success') {
        // Invalidar queries si está habilitado
        if (invalidateOnSuccess) {
          queryClient.invalidateQueries({ queryKey: queryKeyArray });
        }
        
        // Mostrar toast de éxito
        toast({ 
          title: deleteSuccessMessage,
          variant: 'default'
        });
        
        // Ejecutar callbacks
        onDeleteSuccess?.();
        onSuccess?.();
      } else {
        // Manejar error de API
        toast({ 
          title: deleteErrorMessage,
          description: response.error.message,
          variant: 'destructive' 
        });
      }
    },
    onError: (error: Error) => {
      // Manejar error de red o excepción
      toast({ 
        title: deleteErrorMessage,
        description: error.message || 'Error inesperado',
        variant: 'destructive' 
      });
    }
  });
  
  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  };
}
