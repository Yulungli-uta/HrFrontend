import { describe, expect, it } from "vitest";
import { checkOrcid, isValidOrcidChecksum, normalizeOrcid } from "../orcid";

describe("normalizeOrcid", () => {
  it("acepta la URL, sin guiones y con x minúscula", () => {
    expect(normalizeOrcid("https://orcid.org/0000-0002-1825-0097")).toBe("0000-0002-1825-0097");
    expect(normalizeOrcid("0000000218250097")).toBe("0000-0002-1825-0097");
    expect(normalizeOrcid("000000027541668x")).toBe("0000-0002-7541-668X");
  });

  it("rechaza lo que no tiene 16 caracteres válidos", () => {
    expect(normalizeOrcid("1234")).toBeNull();
    expect(normalizeOrcid("")).toBeNull();
    expect(normalizeOrcid(null)).toBeNull();
    expect(normalizeOrcid("0000-0002-1825-009Z")).toBeNull();
  });
});

describe("isValidOrcidChecksum", () => {
  it("valida el dígito verificador (incluida la X)", () => {
    expect(isValidOrcidChecksum("0000-0002-1825-0097")).toBe(true);
    expect(isValidOrcidChecksum("0000-0002-7541-668X")).toBe(true);
    expect(isValidOrcidChecksum("0000-0002-1825-0098")).toBe(false);
  });
});

describe("checkOrcid", () => {
  it("devuelve el ORCID canónico o el mensaje a mostrar", () => {
    expect(checkOrcid("https://orcid.org/0000-0002-1825-0097")).toEqual({ ok: true, orcid: "0000-0002-1825-0097" });
    expect(checkOrcid("  ")).toMatchObject({ ok: false });
    expect(checkOrcid("abc")).toMatchObject({ ok: false, message: expect.stringContaining("formato") });
    expect(checkOrcid("0000-0002-1825-0098")).toMatchObject({ ok: false, message: expect.stringContaining("dígito verificador") });
  });
});
