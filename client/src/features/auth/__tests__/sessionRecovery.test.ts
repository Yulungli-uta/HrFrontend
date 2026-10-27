import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RELOGIN_GUARD_MS,
  buildRecoveryCode,
  canForceRelogin,
  clearReloginNotice,
  consumeReturnTo,
  markForcedRelogin,
  readReloginNotice,
  saveReturnTo,
  setReloginNotice,
} from "../services/sessionRecovery";

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

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("sessionStorage", memoryStorage());
});

describe("buildRecoveryCode", () => {
  it("arma el código con motivo legible y hora", () => {
    const at = new Date(2026, 9, 23, 13, 5);
    expect(buildRecoveryCode("NETWORK", at)).toBe("S-RED-1305");
    expect(buildRecoveryCode("TOKEN", at)).toBe("S-TOKEN-1305");
    expect(buildRecoveryCode("BAD_RESPONSE", at)).toBe("S-RESP-1305");
    expect(buildRecoveryCode("HTTP_503", at)).toBe("S-H503-1305");
  });
});

describe("freno anti-ciclo", () => {
  it("permite cerrar la sesión la primera vez", () => {
    expect(canForceRelogin()).toBe(true);
  });

  it("bloquea un segundo cierre dentro de la ventana y lo permite al vencer", () => {
    markForcedRelogin(1_000_000);
    expect(canForceRelogin(1_000_000 + RELOGIN_GUARD_MS - 1)).toBe(false);
    expect(canForceRelogin(1_000_000 + RELOGIN_GUARD_MS + 1)).toBe(true);
  });
});

describe("aviso de sesión renovada", () => {
  it("se guarda, se puede leer varias veces y se borra al limpiar", () => {
    setReloginNotice({ code: "S-RED-1323" });
    expect(readReloginNotice()).toEqual({ code: "S-RED-1323" });
    expect(readReloginNotice()).toEqual({ code: "S-RED-1323" });
    clearReloginNotice();
    expect(readReloginNotice()).toBeNull();
  });

  it("ignora datos corruptos", () => {
    sessionStorage.setItem("auth.reloginNotice", "{no es json");
    expect(readReloginNotice()).toBeNull();
  });
});

describe("ruta de retorno", () => {
  it("devuelve la ruta guardada una sola vez", () => {
    saveReturnTo("/attendance?x=1");
    expect(consumeReturnTo()).toBe("/attendance?x=1");
    expect(consumeReturnTo()).toBeNull();
  });

  it("no guarda raíz ni login", () => {
    saveReturnTo("/");
    saveReturnTo("/login");
    expect(consumeReturnTo()).toBeNull();
  });

  it("rechaza destinos externos", () => {
    sessionStorage.setItem("auth.returnTo", "//evil.example.com");
    expect(consumeReturnTo()).toBeNull();
    sessionStorage.setItem("auth.returnTo", "https://evil.example.com");
    expect(consumeReturnTo()).toBeNull();
  });
});
