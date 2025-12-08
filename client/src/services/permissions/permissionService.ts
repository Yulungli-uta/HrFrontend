// services/permissions/permissionService.ts
/**
 * Servicio de validación de permisos
 * 
 * Responsabilidades:
 * - Validar acceso a rutas
 * - Validar roles de usuario
 * - Validar permisos específicos
 * - Integración con caché
 */

import { UserSession } from '@/services/auth/types';
import { PermissionCacheService } from './cacheService';
import { tokenService } from '@/services/auth';

/**
 * Configuración de permisos
 */
const PERMISSION_CONFIG = {
  // Roles con acceso total
  SUPER_ROLES: ['Admin', 'SuperAdmin'],
  
  // Rutas públicas (accesibles para todos los usuarios autenticados)
  PUBLIC_ROUTES: [
    '/',
    '/dashboard',
    '/profile',
    '/profile/change-password',
  ],
  
  // Mapeo de rutas a permisos requeridos
  ROUTE_PERMISSIONS: {
    '/admin': ['Admin'],
    '/admin/users': ['Admin'],
    '/admin/roles': ['Admin'],
    '/admin/user-roles': ['Admin'],
    '/admin/menu-items': ['Admin'],
    '/admin/role-menu-items': ['Admin'],
    '/payroll': ['Admin', 'PayrollManager'],
    '/reports': ['Admin', 'Manager', 'ReportViewer'],
  } as Record<string, string[]>,
};

/**
 * Servicio de permisos
 */
export class PermissionService {
  /**
   * Obtiene la URL base de la API
   */
  private static getApiBaseUrl(): string {
    return import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:5010';
  }

  /**
   * Verifica si un usuario tiene un rol de super administrador
   */
  static isSuperUser(user: UserSession | null): boolean {
    if (!user || !user.roles) return false;
    return user.roles.some(role => PERMISSION_CONFIG.SUPER_ROLES.includes(role));
  }

  /**
   * Verifica si una ruta es pública
   */
  static isPublicRoute(routePath: string): boolean {
    return PERMISSION_CONFIG.PUBLIC_ROUTES.some(publicRoute => 
      routePath === publicRoute || routePath.startsWith(publicRoute + '/')
    );
  }

  /**
   * Verifica si el usuario tiene acceso a una ruta específica
   */
  static hasRouteAccess(user: UserSession | null, routePath: string): boolean {
    // Sin usuario, sin acceso
    if (!user) return false;

    // Super usuarios tienen acceso a todo
    if (this.isSuperUser(user)) return true;

    // Rutas públicas son accesibles para todos
    if (this.isPublicRoute(routePath)) return true;

    // Verificar si la ruta requiere permisos específicos
    const requiredRoles = this.getRequiredRolesForRoute(routePath);
    if (requiredRoles.length > 0) {
      return this.hasAnyRole(user, requiredRoles);
    }

    // Verificar si la ruta está en los permisos del usuario (menús asignados)
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions.some(permission => 
        routePath === permission || routePath.startsWith(permission + '/')
      );
    }

    // Por defecto, denegar acceso
    return false;
  }

  /**
   * Obtiene los roles requeridos para una ruta
   */
  static getRequiredRolesForRoute(routePath: string): string[] {
    // Buscar coincidencia exacta
    if (PERMISSION_CONFIG.ROUTE_PERMISSIONS[routePath]) {
      return PERMISSION_CONFIG.ROUTE_PERMISSIONS[routePath];
    }

    // Buscar coincidencia por prefijo (ej: /admin/users coincide con /admin)
    for (const [route, roles] of Object.entries(PERMISSION_CONFIG.ROUTE_PERMISSIONS)) {
      if (routePath.startsWith(route + '/') || routePath === route) {
        return roles;
      }
    }

    return [];
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  static hasRole(user: UserSession | null, role: string): boolean {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  /**
   * Verifica si el usuario tiene alguno de los roles especificados
   */
  static hasAnyRole(user: UserSession | null, roles: string[]): boolean {
    if (!user || !user.roles) return false;
    return roles.some(role => user.roles!.includes(role));
  }

  /**
   * Verifica si el usuario tiene todos los roles especificados
   */
  static hasAllRoles(user: UserSession | null, roles: string[]): boolean {
    if (!user || !user.roles) return false;
    return roles.every(role => user.roles!.includes(role));
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  static hasPermission(user: UserSession | null, permission: string): boolean {
    if (!user) return false;
    
    // Super usuarios tienen todos los permisos
    if (this.isSuperUser(user)) return true;
    
    if (!user.permissions) return false;
    return user.permissions.includes(permission);
  }

  /**
   * Obtiene roles del usuario desde el backend con caché
   */
  static async fetchUserRoles(userId: string): Promise<string[]> {
    // Intentar obtener de caché primero
    const cachedRoles = PermissionCacheService.getRoles(userId);
    if (cachedRoles) {
      if (import.meta.env.DEV) {
        console.log('📦 Roles obtenidos de caché:', cachedRoles);
      }
      return cachedRoles;
    }

    try {
      const accessToken = tokenService.getAccessToken();
      if (!accessToken) {
        throw new Error('No hay token de acceso');
      }

      const response = await fetch(`${this.getApiBaseUrl()}/api/users/${userId}/roles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const roles = result.data.map((r: any) => r.roleName || r.name);
        
        // Guardar en caché
        PermissionCacheService.setRoles(roles, userId);
        
        if (import.meta.env.DEV) {
          console.log('🌐 Roles obtenidos del backend:', roles);
        }
        
        return roles;
      }

      return [];
    } catch (error) {
      console.error('Error obteniendo roles:', error);
      return [];
    }
  }

  /**
   * Obtiene permisos (menús) del usuario desde el backend con caché
   */
  static async fetchUserPermissions(userId: string): Promise<{ permissions: string[]; menuItems: any[] }> {
    // Intentar obtener de caché primero
    const cachedPermissions = PermissionCacheService.getPermissions(userId);
    const cachedMenuItems = PermissionCacheService.getMenuItems(userId);
    
    if (cachedPermissions && cachedMenuItems) {
      if (import.meta.env.DEV) {
        console.log('📦 Permisos obtenidos de caché:', {
          permissions: cachedPermissions.length,
          menuItems: cachedMenuItems.length,
        });
      }
      return {
        permissions: cachedPermissions,
        menuItems: cachedMenuItems,
      };
    }

    try {
      const accessToken = tokenService.getAccessToken();
      if (!accessToken) {
        throw new Error('No hay token de acceso');
      }

      const response = await fetch(`${this.getApiBaseUrl()}/api/menu/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const menuItems = result.data;
        const permissions = menuItems
          .filter((m: any) => m.url && m.url !== null)
          .map((m: any) => m.url);
        
        // Guardar en caché
        PermissionCacheService.setPermissions(permissions, userId);
        PermissionCacheService.setMenuItems(menuItems, userId);
        
        if (import.meta.env.DEV) {
          console.log('🌐 Permisos obtenidos del backend:', {
            permissions: permissions.length,
            menuItems: menuItems.length,
          });
        }
        
        return { permissions, menuItems };
      }

      return { permissions: [], menuItems: [] };
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      return { permissions: [], menuItems: [] };
    }
  }

  /**
   * Obtiene todos los datos de permisos del usuario (roles + permisos)
   * Usa el nuevo endpoint /api/users/{userId}/permissions que devuelve todo en una sola llamada
   */
  static async fetchAllPermissions(userId: string): Promise<{
    roles: string[];
    permissions: string[];
    menuItems: any[];
  }> {
    try {
      const accessToken = tokenService.getAccessToken();
      if (!accessToken) {
        throw new Error('No hay token de acceso');
      }

      const response = await fetch(`${this.getApiBaseUrl()}/api/users/${userId}/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const { roles, permissions, menuItems } = result.data;
        
        // Extraer solo los nombres de roles
        const roleNames = roles.map((r: any) => r.roleName || r);
        
        // Guardar en caché
        PermissionCacheService.setRoles(roleNames, userId);
        PermissionCacheService.setPermissions(permissions, userId);
        PermissionCacheService.setMenuItems(menuItems, userId);
        
        if (import.meta.env.DEV) {
          console.log('🔐 Permisos cargados desde backend:', {
            roles: roleNames.length,
            permissions: permissions.length,
            menuItems: menuItems.length,
          });
        }
        
        return {
          roles: roleNames,
          permissions,
          menuItems,
        };
      }

      return { roles: [], permissions: [], menuItems: [] };
    } catch (error) {
      console.error('Error obteniendo permisos completos:', error);
      return { roles: [], permissions: [], menuItems: [] };
    }
  }

  /**
   * Invalida el caché de permisos
   */
  static invalidateCache(): void {
    PermissionCacheService.invalidate();
    
    if (import.meta.env.DEV) {
      console.log('🗑️ Caché de permisos invalidado');
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  static getCacheStats(userId: string) {
    return PermissionCacheService.getCacheStats(userId);
  }

  /**
   * Verifica si hay caché completo válido
   */
  static hasValidCache(userId: string): boolean {
    return PermissionCacheService.hasCompleteCache(userId);
  }
}
