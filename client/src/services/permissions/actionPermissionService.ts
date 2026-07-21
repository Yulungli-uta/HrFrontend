// services/permissions/actionPermissionService.ts
/**
 * Verificación de permisos de acción ("MODULO.ACCION", ver
 * features/actionPermissions.ts). Distinto de PermissionService.hasPermission
 * (que resuelve URLs de menú, no acciones) — no combinar ambos conceptos.
 *
 * Espejo en el frontend de la lógica de UserActionPermissionService.HasPermissionAsync
 * en HrBackend: si el usuario tiene ADMIN.ACCESS en su UserSession.actionPermissions,
 * cualquier chequeo resuelve true (mismo bypass, misma fuente de verdad — el array
 * viene de RepositoryUta, no se recalcula nada en el cliente).
 *
 * Recordatorio (no-negociable de este proyecto): esto es SOLO para usabilidad de UI
 * (mostrar/ocultar botones, deshabilitar acciones). La autorización real siempre la
 * aplica el backend ([RequirePermission] en HrBackend) — nunca asumir que ocultar algo
 * aquí protege el dato.
 */

import { UserSession } from "@/features/auth";
import { ACTION_PERMISSIONS } from "@/features/actionPermissions";

const ADMIN_ACCESS = ACTION_PERMISSIONS.ADMIN_ACCESS;

export class ActionPermissionService {
  /** true si el usuario tiene el bypass universal (mismo criterio que el backend). */
  static hasAdminAccess(user: UserSession | null): boolean {
    return !!user?.actionPermissions?.includes(ADMIN_ACCESS);
  }

  /** true si el usuario tiene el código de permiso indicado (o ADMIN.ACCESS). */
  static can(user: UserSession | null, code: string): boolean {
    if (!user) return false;
    if (this.hasAdminAccess(user)) return true;
    return !!user.actionPermissions?.includes(code);
  }

  /** true si el usuario tiene AL MENOS UNO de los códigos indicados (o ADMIN.ACCESS). */
  static canAny(user: UserSession | null, codes: string[]): boolean {
    if (!user) return false;
    if (this.hasAdminAccess(user)) return true;
    if (codes.length === 0) return false;
    return codes.some((code) => user.actionPermissions?.includes(code));
  }

  /** true si el usuario tiene TODOS los códigos indicados (o ADMIN.ACCESS). */
  static canAll(user: UserSession | null, codes: string[]): boolean {
    if (!user) return false;
    if (this.hasAdminAccess(user)) return true;
    if (codes.length === 0) return true;
    return codes.every((code) => user.actionPermissions?.includes(code));
  }
}

/** Atajos funcionales — mismo comportamiento que los estáticos de arriba. */
export const can = (user: UserSession | null, code: string): boolean =>
  ActionPermissionService.can(user, code);

export const canAny = (user: UserSession | null, codes: string[]): boolean =>
  ActionPermissionService.canAny(user, codes);

export const canAll = (user: UserSession | null, codes: string[]): boolean =>
  ActionPermissionService.canAll(user, codes);
