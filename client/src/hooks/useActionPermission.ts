// hooks/useActionPermission.ts
/**
 * Hook para verificar permisos de acción ("MODULO.ACCION") en componentes.
 * Distinto de usePermission() (que resuelve rutas/menú) — usar este para
 * mostrar/ocultar botones de acción concretos (aprobar, crear, eliminar, etc.).
 *
 * Uso:
 * ```tsx
 * const { can, canAny } = useActionPermission();
 *
 * {can(ACTION_PERMISSIONS.CONTRACTS_APPROVE) && <Button>Aprobar</Button>}
 * {canAny([ACTION_PERMISSIONS.VACATIONS_APPROVE, ACTION_PERMISSIONS.VACATIONS_UPDATE]) && <Button>Editar</Button>}
 * ```
 *
 * Recordatorio: esto es solo usabilidad de UI. La autorización real la aplica
 * el backend — nunca asumir que ocultar un botón aquí protege el dato.
 */

import { useMemo } from "react";
import { useAuth } from "@/features/auth";
import { ActionPermissionService } from "@/services/permissions/actionPermissionService";

export function useActionPermission() {
  const { user, isAuthenticated } = useAuth();

  return useMemo(
    () => ({
      /** true si el usuario tiene el código de permiso indicado (o ADMIN.ACCESS). */
      can: (code: string): boolean =>
        isAuthenticated && ActionPermissionService.can(user, code),

      /** true si el usuario tiene al menos uno de los códigos indicados (o ADMIN.ACCESS). */
      canAny: (codes: string[]): boolean =>
        isAuthenticated && ActionPermissionService.canAny(user, codes),

      /** true si el usuario tiene todos los códigos indicados (o ADMIN.ACCESS). */
      canAll: (codes: string[]): boolean =>
        isAuthenticated && ActionPermissionService.canAll(user, codes),

      /** true si el usuario tiene el bypass ADMIN.ACCESS. */
      hasAdminAccess: (): boolean =>
        isAuthenticated && ActionPermissionService.hasAdminAccess(user),

      /** Lista cruda de códigos de permiso del usuario (para debug/inspección). */
      actionPermissions: user?.actionPermissions ?? [],

      /** Nombres de AccessProfile asignados (informativo). */
      profiles: user?.profiles ?? [],
    }),
    [user, isAuthenticated]
  );
}

/** Hook para verificar un único código de permiso de acción. */
export function useCan(code: string): boolean {
  const { can } = useActionPermission();
  return can(code);
}
