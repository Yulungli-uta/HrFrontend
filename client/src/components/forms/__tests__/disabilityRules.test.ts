import { describe, expect, it } from "vitest";
import { getDisabilityIssues, isNoDisabilityType } from "../disabilityRules";

describe("isNoDisabilityType", () => {
  it("reconoce «Ninguna» sin importar tildes ni mayúsculas", () => {
    expect(isNoDisabilityType("Ninguna")).toBe(true);
    expect(isNoDisabilityType(" NINGUNA ")).toBe(true);
    expect(isNoDisabilityType("Física")).toBe(false);
    expect(isNoDisabilityType("")).toBe(false);
    expect(isNoDisabilityType(null)).toBe(false);
  });
});

describe("getDisabilityIssues", () => {
  it("sin discapacidad y todo vacío es válido", () => {
    expect(getDisabilityIssues({ hasDisability: false, disability: "", disabilityPercentage: undefined, conadisCard: "" })).toEqual([]);
  });

  it("sin discapacidad rechaza tipo, porcentaje o carnet con valor", () => {
    const paths = getDisabilityIssues({ hasDisability: false, disability: "Visual", disabilityPercentage: 40, conadisCard: "123" }).map((i) => i.path);
    expect(paths).toEqual(["disability", "disabilityPercentage", "conadisCard"]);
  });

  it("con discapacidad exige tipo, porcentaje y carnet", () => {
    const paths = getDisabilityIssues({ hasDisability: true }).map((i) => i.path);
    expect(paths).toEqual(["disability", "disabilityPercentage", "conadisCard"]);
  });

  it("con discapacidad el porcentaje no puede ser 0 ni negativo ni NaN", () => {
    for (const pct of [0, -5, Number.NaN]) {
      const issues = getDisabilityIssues({ hasDisability: true, disability: "Visual", disabilityPercentage: pct, conadisCard: "123" });
      expect(issues.map((i) => i.path)).toEqual(["disabilityPercentage"]);
    }
  });

  it("con discapacidad el tipo no puede ser «Ninguna»", () => {
    const issues = getDisabilityIssues({ hasDisability: true, disability: "Ninguna", disabilityPercentage: 50, conadisCard: "123" });
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe("disability");
  });

  it("con todo completo es válido (un carnet de solo espacios no cuenta)", () => {
    expect(getDisabilityIssues({ hasDisability: true, disability: "Física", disabilityPercentage: 30, conadisCard: "ABC-1" })).toEqual([]);
    expect(getDisabilityIssues({ hasDisability: true, disability: "Física", disabilityPercentage: 30, conadisCard: "   " }).map((i) => i.path)).toEqual(["conadisCard"]);
  });
});
