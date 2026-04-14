// hooks/usePermission.ts
/**
 * Hook para verificar permisos en componentes
 * 
 * Uso:
 * ```tsx
 * const { hasRouteAccess, hasRole, canEdit, canDelete } = usePermission();
 * 
 * if (hasRole('Admin')) {
 *   // Mostrar opciones de admin
 * }
 * 
 * {canEdit && <Button>Editar</Button>}
 * {canDelete && <Button>Eliminar</Button>}
 * ```
 */

import { useMemo } from 'react';
import { useAuth } from '@/features/auth';
import { PermissionService } from '@/services/permissions';

/**
 * Hook de permisos
 */
export function usePermission() {
  const { user, isAuthenticated } = useAuth();

  // Memoizar funciones para evitar re-renders innecesarios
  const permissions = useMemo(() => ({
    /**
     * Verifica si el usuario tiene acceso a una ruta
     */
    hasRouteAccess: (routePath: string): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasRouteAccess(user, routePath);
    },

    /**
     * Verifica si el usuario tiene un rol específico
     */
    hasRole: (role: string): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasRole(user, role);
    },

    /**
     * Verifica si el usuario tiene alguno de los roles
     */
    hasAnyRole: (roles: string[]): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasAnyRole(user, roles);
    },

    /**
     * Verifica si el usuario tiene todos los roles
     */
    hasAllRoles: (roles: string[]): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasAllRoles(user, roles);
    },

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    hasPermission: (permission: string): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasPermission(user, permission);
    },

    /**
     * Verifica si el usuario es super usuario (Admin/SuperAdmin)
     */
    isSuperUser: (): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.isSuperUser(user);
    },

    /**
     * Verifica si el usuario es Admin
     */
    isAdmin: (): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasRole(user, 'Admin');
    },

    /**
     * Verifica si el usuario puede editar (tiene rol Admin o Manager)
     */
    canEdit: (): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasAnyRole(user, ['Admin', 'Manager']);
    },

    /**
     * Verifica si el usuario puede eliminar (solo Admin)
     */
    canDelete: (): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasRole(user, 'Admin');
    },

    /**
     * Verifica si el usuario puede crear (tiene rol Admin o Manager)
     */
    canCreate: (): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasAnyRole(user, ['Admin', 'Manager']);
    },

    /**
     * Verifica si el usuario puede ver reportes
     */
    canViewReports: (): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasAnyRole(user, ['Admin', 'Manager', 'ReportViewer']);
    },

    /**
     * Verifica si el usuario puede gestionar nómina
     */
    canManagePayroll: (): boolean => {
      if (!isAuthenticated) return false;
      return PermissionService.hasAnyRole(user, ['Admin', 'PayrollManager']);
    },

    /**
     * Obtiene los roles del usuario
     */
    roles: user?.roles ?? [],

    /**
     * Obtiene los permisos del usuario
     */
    permissions: user?.permissions ?? [],

    /**
     * Obtiene el primer rol del usuario (rol principal)
     */
    primaryRole: user?.roles?.[0] ?? null,

    /**
     * Verifica si el usuario está autenticado
     */
    isAuthenticated,

    /**
     * Obtiene información del usuario
     */
    user,
  }), [user, isAuthenticated]);

  return permissions;
}

/**
 * Hook para verificar un permiso específico
 * Útil para componentes que solo necesitan un permiso
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = usePermission();
  return hasPermission(permission);
}

/**
 * Hook para verificar un rol específico
 * Útil para componentes que solo necesitan un rol
 */
export function useHasRole(role: string): boolean {
  const { hasRole } = usePermission();
  return hasRole(role);
}

/**
 * Hook para verificar acceso a una ruta
 * Útil para componentes que solo necesitan verificar una ruta
 */
export function useHasRouteAccess(routePath: string): boolean {
  const { hasRouteAccess } = usePermission();
  return hasRouteAccess(routePath);
}
