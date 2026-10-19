import { describe, expect, it, vi } from "vitest";

// El resolvedor solo necesita estas dos reglas de PermissionService; se simulan para probar el módulo aislado.
vi.mock("@/services/permissions", () => ({
  PermissionService: {
    hasRouteAccess: (user: any, path: string) =>
      (user?.permissions ?? []).some((p: string) => path === p || path.startsWith(p + "/")),
    hasAnyRole: (user: any, roles: string[]) => roles.some((r) => (user?.roles ?? []).includes(r)),
  },
}));

import { getHomeOptions, resolveHomePath, shouldReapplyHomeRedirect } from "../services/homePath";
import { isSafeReturnTo } from "../services/preferencesStorage";

const user: any = {
  roles: ["R_EMPLOYEE"],
  permissions: ["/attendance", "/permissions"],
  menuItems: [
    { id: 10, name: "Autoservicio", url: null, parentId: null },
    { id: 36, name: "Picadas", url: "/attendance", parentId: 10 },
    { id: 33, name: "Permisos", url: "/permissions", parentId: 10 },
    { id: 50, name: "Nómina", url: "/payroll", parentId: 10 },
    { id: 51, name: "Detalle", url: "/people/:id", parentId: 10 },
  ],
};

const routes = [
  { path: "/", },
  { path: "/attendance", requiredPath: "/attendance" },
  { path: "/permissions", requiredPath: "/permissions" },
  { path: "/payroll", requiredPath: "/payroll" },
  { path: "/people/:id", requiredPath: "/people" },
  { path: "/admin-only", requiredPath: "/admin-only", requiredRoles: ["Administrador"] },
];

describe("getHomeOptions", () => {
  it("solo ofrece rutas estáticas existentes a las que el usuario tiene acceso", () => {
    const paths = getHomeOptions(user, routes).map((o) => o.path);

    expect(paths).toContain("/attendance");
    expect(paths).toContain("/permissions");
    expect(paths).not.toContain("/payroll"); // sin permiso
    expect(paths).not.toContain("/people/:id"); // ruta con parámetro
  });

  it("devuelve vacío si no hay usuario o menú", () => {
    expect(getHomeOptions(null, routes)).toEqual([]);
    expect(getHomeOptions({ ...user, menuItems: [] }, routes)).toEqual([]);
  });
});

describe("resolveHomePath", () => {
  it("acepta una ruta válida y permitida", () => {
    expect(resolveHomePath("/attendance", user, routes)).toBe("/attendance");
    expect(resolveHomePath("/attendance/", user, routes)).toBe("/attendance");
  });

  it("cae a '/' si no hay preferencia", () => {
    expect(resolveHomePath(undefined, user, routes)).toBe("/");
    expect(resolveHomePath(null, user, routes)).toBe("/");
    expect(resolveHomePath("/", user, routes)).toBe("/");
  });

  it("cae a '/' si el usuario perdió el acceso", () => {
    expect(resolveHomePath("/payroll", user, routes)).toBe("/");
  });

  it("cae a '/' si la ruta ya no existe", () => {
    expect(resolveHomePath("/ruta-borrada", user, routes)).toBe("/");
  });

  it("rechaza rutas externas o maliciosas", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/../etc", "javascript:alert(1)", "/a b", "/attendance?x=1"]) {
      expect(resolveHomePath(bad, user, routes)).toBe("/");
    }
  });

  it("respeta requiredRoles de la ruta", () => {
    const admin = { ...user, menuItems: [...user.menuItems, { id: 60, name: "Admin", url: "/admin-only", parentId: 10 }] };
    expect(resolveHomePath("/admin-only", admin, routes)).toBe("/");
    expect(resolveHomePath("/admin-only", { ...admin, roles: ["Administrador"], permissions: ["/admin-only"] }, routes)).toBe("/admin-only");
  });
});

describe("shouldReapplyHomeRedirect", () => {
  const rec = { target: "/attendance", at: 1_000 };

  it("repite la redirección si '/' reaparece dentro de la ventana (navegación de AuthContext a los 300 ms)", () => {
    expect(shouldReapplyHomeRedirect(rec, 1_300)).toBe(true);
    expect(shouldReapplyHomeRedirect(rec, 5_999)).toBe(true);
  });

  it("no repite pasada la ventana", () => {
    expect(shouldReapplyHomeRedirect(rec, 6_000)).toBe(false);
    expect(shouldReapplyHomeRedirect(rec, 60_000)).toBe(false);
  });

  it("no repite sin registro, con destino '/' o con reloj hacia atrás", () => {
    expect(shouldReapplyHomeRedirect(null, 1_300)).toBe(false);
    expect(shouldReapplyHomeRedirect({ target: "/", at: 1_000 }, 1_300)).toBe(false);
    expect(shouldReapplyHomeRedirect(rec, 500)).toBe(false);
  });
});

describe("isSafeReturnTo", () => {
  it("acepta rutas internas de la aplicación (con parámetros y búsqueda)", () => {
    for (const ok of ["/attendance/punch-control", "/people/123", "/vacations?tab=pending&page=2", "/reports/attendance-novelties"]) {
      expect(isSafeReturnTo(ok)).toBe(true);
    }
  });

  it("rechaza '/', pantallas de autenticación y pantallas públicas", () => {
    for (const bad of ["/", "/login", "/login?x=1", "/auth/azure/relay", "/firma-externa/5"]) {
      expect(isSafeReturnTo(bad)).toBe(false);
    }
  });

  it("rechaza redirecciones abiertas y rutas peligrosas", () => {
    for (const bad of ["//evil.com", "https://evil.com", "javascript:alert(1)", "/a/../b", "/x y", "/a<b>", "", null, undefined, "/" + "a".repeat(400)]) {
      expect(isSafeReturnTo(bad as string | null | undefined)).toBe(false);
    }
  });
});
