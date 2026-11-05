import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AZURE_ATTEMPT_MAX_AGE_MS,
  clearAzureAttempt,
  loadAzureAttempt,
  saveAzureAttempt,
} from "../services/azureLoginAttempt";

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

const attempt = { codeVerifier: "verifier-abc", reference: "AB12CD34", startedAt: 1_000_000 };

beforeEach(() => {
  vi.stubGlobal("sessionStorage", memoryStorage());
});

describe("azureLoginAttempt", () => {
  it("guarda y recupera el intento en curso", () => {
    saveAzureAttempt(attempt);
    expect(loadAzureAttempt(attempt.startedAt + 1_000)).toEqual(attempt);
  });

  it("devuelve null si no hay intento", () => {
    expect(loadAzureAttempt()).toBeNull();
  });

  it("descarta (y borra) el intento vencido", () => {
    saveAzureAttempt(attempt);
    expect(loadAzureAttempt(attempt.startedAt + AZURE_ATTEMPT_MAX_AGE_MS + 1)).toBeNull();
    // ya no queda guardado aunque se consulte con un reloj anterior
    expect(loadAzureAttempt(attempt.startedAt)).toBeNull();
  });

  it("clearAzureAttempt lo borra", () => {
    saveAzureAttempt(attempt);
    clearAzureAttempt();
    expect(loadAzureAttempt(attempt.startedAt)).toBeNull();
  });

  it("ignora contenido corrupto o incompleto", () => {
    sessionStorage.setItem("wsuta-azure-login-attempt", "{no es json");
    expect(loadAzureAttempt()).toBeNull();

    sessionStorage.setItem(
      "wsuta-azure-login-attempt",
      JSON.stringify({ codeVerifier: "", reference: "X", startedAt: attempt.startedAt })
    );
    expect(loadAzureAttempt(attempt.startedAt)).toBeNull();
  });

  it("no rompe el login si el almacenamiento está bloqueado", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => saveAzureAttempt(attempt)).not.toThrow();
    expect(loadAzureAttempt()).toBeNull();
    expect(() => clearAzureAttempt()).not.toThrow();
  });
});
