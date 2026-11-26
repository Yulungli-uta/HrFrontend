import { describe, expect, it } from "vitest";
import { deriveHasDisability, disabilityToSave } from "../familyDisability";

describe("deriveHasDisability", () => {
  it("respeta el indicador explícito", () => {
    expect(deriveHasDisability({ hasDisability: true })).toBe(true);
    expect(deriveHasDisability({ hasDisability: false, disabilityTypeId: 25 })).toBe(false);
  });
  it("se deduce del tipo guardado", () => {
    expect(deriveHasDisability({ disabilityTypeId: 25 })).toBe(true);
  });
  it("se deduce del porcentaje guardado", () => {
    expect(deriveHasDisability({ disabilityPercentage: 40 })).toBe(true);
  });
  it("sin tipo ni porcentaje no tiene discapacidad", () => {
    expect(deriveHasDisability({})).toBe(false);
    expect(deriveHasDisability({ disabilityTypeId: null, disabilityPercentage: 0 })).toBe(false);
  });
});

describe("disabilityToSave", () => {
  it("con discapacidad conserva tipo y porcentaje", () => {
    expect(disabilityToSave(true, 25, 40)).toEqual({ disabilityTypeId: 25, disabilityPercentage: 40 });
  });
  it("sin discapacidad deja ambos vacíos", () => {
    expect(disabilityToSave(false, 25, 40)).toEqual({ disabilityTypeId: null, disabilityPercentage: null });
  });
});
