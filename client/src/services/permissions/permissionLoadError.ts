// services/permissions/permissionLoadError.ts

/** Motivos por los que no se pudieron cargar los menús/permisos del usuario. */
export type PermissionLoadReason = "TOKEN" | "NETWORK" | "BAD_RESPONSE" | `HTTP_${number}`;

/**
 * Error explícito de carga de permisos. Antes estos fallos devolvían una lista vacía en
 * silencio, y el navegador guardaba una sesión sin permisos que nadie volvía a recargar.
 */
export class PermissionLoadError extends Error {
  readonly reason: PermissionLoadReason;

  constructor(reason: PermissionLoadReason) {
    super(`No se pudieron cargar los permisos (${reason})`);
    this.name = "PermissionLoadError";
    this.reason = reason;
  }
}
