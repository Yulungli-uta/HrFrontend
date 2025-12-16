// services/permissions/permissionService.ts
/**
 * Servicio de validación y carga de permisos
 */

import { UserSession } from "@/services/auth/types";
import { tokenService, authService } from "@/services/auth";
import { CacheService } from "./cacheService";

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

const PERMISSION_CONFIG = {
  SUPER_ROLES: ["Administrador", "SuperAdmin"],
  PUBLIC_ROUTES: [
    "/",
    "/dashboard",
    "/profile",
    "/profile/change-password",
  ],
  ROUTE_PERMISSIONS: {
    "/admin": ["Administrador"],
    "/admin/users": ["Administrador"],
    "/admin/roles": ["Administrador"],
    "/admin/user-roles": ["Administrador"],
    "/admin/menu-items": ["Administrador"],
    "/admin/role-menu-items": ["Administrador"],
    // "/payroll": ["Admin", "PayrollManager"],
    // "/reports": ["Admin", "Manager", "ReportViewer"],
  } as Record<string, string[]>,
};

export class PermissionService {
  // ---------------------------------------------------------------------------
  // Utilidades base
  // ---------------------------------------------------------------------------

  private static getApiBaseUrl(): string {
    return import.meta.env.VITE_AUTH_API_BASE_URL || "http://localhost:5010";
  }

  static isSuperUser(user: UserSession | null): boolean {
    if (!user?.roles) return false;
    return user.roles.some(r => PERMISSION_CONFIG.SUPER_ROLES.includes(r));
  }

  static isPublicRoute(routePath: string): boolean {
    return PERMISSION_CONFIG.PUBLIC_ROUTES.some(
      (r) => routePath === r || routePath.startsWith(r + "/")
    );
  }

  static getRequiredRolesForRoute(routePath: string): string[] {
    if (PERMISSION_CONFIG.ROUTE_PERMISSIONS[routePath]) {
      return PERMISSION_CONFIG.ROUTE_PERMISSIONS[routePath];
    }
    for (const [route, roles] of Object.entries(
      PERMISSION_CONFIG.ROUTE_PERMISSIONS
    )) {
      if (routePath === route || routePath.startsWith(route + "/")) {
        return roles;
      }
    }
    return [];
  }

  static hasRole(user: UserSession | null, role: string): boolean {
    if (!user?.roles) return false;
    return user.roles.includes(role);
  }

  static hasAnyRole(user: UserSession | null, roles: string[]): boolean {
    if (!user?.roles) return false;
    return roles.some((r) => user.roles!.includes(r));
  }

  static hasAllRoles(user: UserSession | null, roles: string[]): boolean {
    if (!user?.roles) return false;
    return roles.every((r) => user.roles!.includes(r));
  }

  static hasPermission(user: UserSession | null, permission: string): boolean {
    if (!user) return false;
    if (this.isSuperUser(user)) return true;
    if (!user.permissions) return false;
    return user.permissions.includes(permission);
  }

  static hasRouteAccess(user: UserSession | null, routePath: string): boolean {
    if (!user) return false;
    if (this.isSuperUser(user)) return true;
    if (this.isPublicRoute(routePath)) return true;

    const required = this.getRequiredRolesForRoute(routePath);
    if (required.length > 0) {
      return this.hasAnyRole(user, required);
    }

    if (user.permissions?.length) {
      return user.permissions.some(
        (perm) => routePath === perm || routePath.startsWith(perm + "/")
      );
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Token helper
  // ---------------------------------------------------------------------------

  private static async ensureValidToken(): Promise<string | null> {
    try {
      let accessToken = tokenService.getAccessToken();

      if (!accessToken) {
        DEBUG && console.warn("[PERMISSIONS] No hay accessToken");
        return null;
      }

      if (!tokenService.isTokenExpired(accessToken)) {
        return accessToken;
      }

      // Token expirado → intentar renovar
      const refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) {
        DEBUG && console.warn("[PERMISSIONS] No hay refreshToken para renovar");
        return null;
      }

      DEBUG && console.log("[PERMISSIONS] Token expirado, renovando...");
      const newPair = await authService.refreshToken(refreshToken);
      tokenService.setTokens(newPair);
      accessToken = newPair.accessToken;
      DEBUG && console.log("[PERMISSIONS] Token renovado OK");
      return accessToken;
    } catch (err) {
      console.error("[PERMISSIONS] Error al validar/renovar token:", err);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Fetch + caché (un solo endpoint)
  // ---------------------------------------------------------------------------

  /**
   * 🔥 Carga TODOS los permisos en una sola llamada:
   * roles, permissions (urls) y menuItems
   */
  static async fetchAllPermissions(userId: string): Promise<{
    roles: string[];
    permissions: string[];
    menuItems: any[];
  }> {
    const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

    const accessToken = await this.ensureValidToken();
    if (!accessToken) {
      DEBUG && console.warn("[PERMISSIONS] No se puede cargar /api/menu/user: token inválido");
      return { roles: [], permissions: [], menuItems: [] };
    }

    // 🔒 Cache por usuario + sesión para no reventar al recargar
    const cache = new CacheService(userId);

    return cache.tryGetOrSet<{
      roles: string[];
      permissions: string[];
      menuItems: any[];
    }>("all-permissions", async () => {
      const url = `${this.getApiBaseUrl()}/api/menu/user`;

      DEBUG && console.log("[PERMISSIONS] Fetching menu from:", url);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log("Menu: "+ res);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();

      if (!json?.success || !json.data) {
        DEBUG && console.warn("[PERMISSIONS] Respuesta inválida de /api/menu/user:", json);
        return { roles: [], permissions: [], menuItems: [] };
      }

      let menuItems: any[] = [];
      let roles: string[] = [];

      // 📦 Flexibilidad según cómo responda tu backend:
      // 1) data es directamente un array de menús
      // 2) data.menuItems contiene el array
      if (Array.isArray(json.data)) {
        menuItems = json.data;
      } else if (Array.isArray(json.data.menuItems)) {
        menuItems = json.data.menuItems;
      } else {
        DEBUG && console.warn("[PERMISSIONS] No se encontraron menuItems en data:", json.data);
        menuItems = [];
      }

      // 🎭 Intentar obtener roles si el backend los envía en data
      if (Array.isArray(json.data?.roles)) {
        roles = json.data.roles.map((r: any) => r.roleName || r.name || r);
      } else {
        // Opcional: intentar deducir roles desde cada menuItem si traen algo como item.roles
        const roleSet = new Set<string>();
        for (const item of menuItems) {
          const itemRoles = (item as any).roles;
          if (Array.isArray(itemRoles)) {
            itemRoles.forEach((r: any) =>
              roleSet.add(r.roleName || r.name || r)
            );
          }
        }
        roles = Array.from(roleSet);
      }

      // 🔑 Permisos = URLs de los menús (para route-guard)
      const permissions: string[] = menuItems
        .filter((m: any) => m.url && m.url !== null)
        .map((m: any) => m.url as string);

      DEBUG &&
        console.log("[PERMISSIONS] /api/menu/user mapeado:", {
          roles,
          permissionsCount: permissions.length,
          menuItemsCount: menuItems.length,
        });

      // 👉 Esto es lo que se inyecta en userInfo en AuthContext
      // userInfo.roles = roles
      // userInfo.permissions = permissions
      // userInfo.menuItems = menuItems (con parentId para Sidebar)
      return { roles, permissions, menuItems };
    });
  }

  /**
   * Limpiar caché global de permisos (opcional, usado en logout/login limpio)
   */
  static invalidateAllCache() {
    CacheService.clearAll();
  }
}
