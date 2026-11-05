import { describe, expect, it } from "vitest";
import {
  AzureExchangeError,
  describeAzureLoginFailure,
  failureCodeFromHttpStatus,
  newAttemptReference,
  toAzureLoginFailureCode,
  type AzureLoginFailureCode,
} from "../services/azureLoginMessages";

const ALL_CODES: AzureLoginFailureCode[] = [
  "CANCELLED",
  "EXPIRED_ATTEMPT",
  "NO_ACCESS",
  "SERVER_ERROR",
  "NOT_DELIVERED",
  "TIMEOUT",
  "EXCHANGE_INVALID",
  "RATE_LIMITED",
  "NETWORK",
  "LOST_STATE",
  "UNKNOWN",
];

describe("toAzureLoginFailureCode", () => {
  it("acepta los códigos que manda el servidor", () => {
    expect(toAzureLoginFailureCode("NO_ACCESS")).toBe("NO_ACCESS");
    expect(toAzureLoginFailureCode("EXPIRED_ATTEMPT")).toBe("EXPIRED_ATTEMPT");
  });

  it("convierte lo desconocido o ausente en UNKNOWN (nunca confía en texto libre del servidor)", () => {
    expect(toAzureLoginFailureCode("<script>alert(1)</script>")).toBe("UNKNOWN");
    expect(toAzureLoginFailureCode(undefined)).toBe("UNKNOWN");
    expect(toAzureLoginFailureCode(42)).toBe("UNKNOWN");
  });
});

describe("failureCodeFromHttpStatus", () => {
  it("distingue sin respuesta, enlace inválido, demasiados intentos y error del servidor", () => {
    expect(failureCodeFromHttpStatus(0)).toBe("NETWORK");
    expect(failureCodeFromHttpStatus(401)).toBe("EXCHANGE_INVALID");
    expect(failureCodeFromHttpStatus(400)).toBe("EXCHANGE_INVALID");
    expect(failureCodeFromHttpStatus(429)).toBe("RATE_LIMITED");
    expect(failureCodeFromHttpStatus(500)).toBe("SERVER_ERROR");
    expect(failureCodeFromHttpStatus(503)).toBe("SERVER_ERROR");
    expect(failureCodeFromHttpStatus(418)).toBe("UNKNOWN");
  });
});

describe("describeAzureLoginFailure", () => {
  it("todo código tiene título y descripción accionable", () => {
    for (const code of ALL_CODES) {
      const info = describeAzureLoginFailure(code, "AB12CD34");
      expect(info.code).toBe(code);
      expect(info.title.length).toBeGreaterThan(5);
      expect(info.description.length).toBeGreaterThan(20);
    }
  });

  it("solo cancelar es neutral; el resto se muestra como error", () => {
    expect(describeAzureLoginFailure("CANCELLED").neutral).toBe(true);
    for (const code of ALL_CODES.filter((c) => c !== "CANCELLED")) {
      expect(describeAzureLoginFailure(code).neutral).toBe(false);
    }
  });

  it("incluye la referencia en los fallos que soporte debe poder buscar", () => {
    for (const code of ["NO_ACCESS", "SERVER_ERROR", "NOT_DELIVERED", "TIMEOUT"] as const) {
      expect(describeAzureLoginFailure(code, "AB12CD34").description).toContain("AB12CD34");
    }
  });

  it("no inventa una referencia cuando no hay", () => {
    expect(describeAzureLoginFailure("NO_ACCESS").description).not.toContain("Código de referencia: ");
  });

  it("NO_ACCESS no revela por qué (ni cuenta inexistente ni dominio)", () => {
    const text = describeAzureLoginFailure("NO_ACCESS", "AB12CD34").description.toLowerCase();
    expect(text).not.toContain("no existe");
    expect(text).not.toContain("dominio");
    expect(text).not.toContain("password");
    expect(text).not.toContain("contraseña");
  });
});

describe("AzureExchangeError", () => {
  it("lleva el tipo de fallo para elegir el mensaje", () => {
    const error = new AzureExchangeError("RATE_LIMITED");
    expect(error).toBeInstanceOf(Error);
    expect(error.kind).toBe("RATE_LIMITED");
  });
});

describe("newAttemptReference", () => {
  it("genera 8 caracteres hexadecimales en mayúscula y distintos entre sí", () => {
    const refs = new Set(Array.from({ length: 20 }, () => newAttemptReference()));
    for (const ref of refs) expect(ref).toMatch(/^[0-9A-F]{8}$/);
    expect(refs.size).toBeGreaterThan(15);
  });
});
