/**
 * Tipos base para componentes reutilizables
 * Siguiendo principios SOLID y DRY
 */

/**
 * Props base para formularios CRUD
 * @template TEntity Tipo de la entidad completa
 * @template TInsert Tipo para insertar (puede ser diferente de TEntity)
 */
export interface BaseCrudFormProps<TEntity, TInsert = TEntity> {
  /** Entidad a editar (undefined para crear nueva) */
  entity?: TEntity;
  /** Callback ejecutado al guardar exitosamente */
  onSuccess?: () => void;
  /** Callback ejecutado al cancelar el formulario */
  onCancel?: () => void;
  /** Modo del formulario (por defecto se infiere de entity) */
  mode?: 'create' | 'edit' | 'view';
}

/**
 * Props base para formularios de relación (ej: asignar rol a usuario)
 */
export interface BaseRelationFormProps {
  /** Callback ejecutado al guardar exitosamente */
  onSuccess: () => void;
  /** Callback ejecutado al cancelar */
  onCancel?: () => void;
}

/**
 * Props base para diálogos/modales
 */
export interface BaseDialogProps {
  /** Controla si el diálogo está abierto */
  open: boolean;
  /** Callback para cerrar el diálogo */
  onOpenChange: (open: boolean) => void;
}

/**
 * Props base para componentes con loading state
 */
export interface BaseLoadingProps {
  /** Indica si está cargando */
  isLoading?: boolean;
  /** Texto a mostrar durante la carga */
  loadingText?: string;
}

/**
 * Props base para componentes con error state
 */
export interface BaseErrorProps {
  /** Error a mostrar */
  error?: Error | string | null;
  /** Callback para reintentar la operación */
  onRetry?: () => void;
}
