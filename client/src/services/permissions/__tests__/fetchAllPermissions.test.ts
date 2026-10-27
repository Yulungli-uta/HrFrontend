import { beforeEach, describe, expect, it, vi } from "vitest";

const tokenMocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  isTokenExpired: vi.fn(),
  getRefreshToken: vi.fn(),
  setTokens: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  tokenService: tokenMocks,
  authService: { refreshToken: vi.fn() },
}));
vi.mock("@/lib/logger", () => {
  const noop = () => undefined;
  const channel = { debug: noop, info: noop, warn: noop, error: noop };
  return { logger: { auth: channel, debug: noop, info: noop, warn: noop, error: noop } };
});

import { PermissionService } from "../permissionService";
import { PermissionLoadError } from "../permissionLoadError";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => Array.from(data.keys())[i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

const okResponse = (menuItems: unknown[]) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { menuItems } }),
  }) as unknown as Response;

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("sessionStorage", memoryStorage());
  tokenMocks.getAccessToken.mockReturnValue("token");
  tokenMocks.isTokenExpired.mockReturnValue(false);
});

describe("PermissionService.fetchAllPermissions", () => {
  it("devuelve los menús cuando el servidor responde bien", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse([{ url: "/attendance" }])));
    const result = await PermissionService.fetchAllPermissions("u1");
    expect(result.permissions).toEqual(["/attendance"]);
  });

  it("devuelve lista vacía (sin error) cuando el servidor responde bien y no hay menús", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse([])));
    const result = await PermissionService.fetchAllPermissions("u1");
    expect(result.menuItems).toEqual([]);
  });

  it("lanza TOKEN cuando no hay token válido", async () => {
    tokenMocks.getAccessToken.mockReturnValue(null);
    await expect(PermissionService.fetchAllPermissions("u1")).rejects.toMatchObject({ reason: "TOKEN" });
  });

  it("lanza NETWORK cuando la petición falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(PermissionService.fetchAllPermissions("u1")).rejects.toMatchObject({ reason: "NETWORK" });
  });

  it("lanza HTTP_xxx cuando el servidor responde con error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response));
    await expect(PermissionService.fetchAllPermissions("u1")).rejects.toMatchObject({ reason: "HTTP_503" });
  });

  it("lanza BAD_RESPONSE cuando la respuesta no trae success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: false }) } as Response)
    );
    await expect(PermissionService.fetchAllPermissions("u1")).rejects.toBeInstanceOf(PermissionLoadError);
  });

  it("usa el respaldo en caché solo si tenía menús y el servidor falla", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse([{ url: "/attendance" }]))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    await PermissionService.fetchAllPermissions("u1");
    const fallback = await PermissionService.fetchAllPermissions("u1");
    expect(fallback.permissions).toEqual(["/attendance"]);
  });
});
