import { describe, expect, it } from "vitest";
import { addOneDay, durationText } from "./researchDuration";

describe("durationText (ambas fechas inclusive)", () => {
  it("dos años exactos", () => {
    expect(durationText("2023-01-01", "2024-12-31")).toBe("2 años");
  });

  it("seis meses exactos", () => {
    expect(durationText("2025-01-01", "2025-06-30")).toBe("6 meses");
  });

  it("un mes", () => {
    expect(durationText("2023-01-01", "2023-01-31")).toBe("1 mes");
  });

  it("combina años, meses y días", () => {
    expect(durationText("2023-01-01", "2024-03-05")).toBe("1 año, 2 meses y 5 días");
  });

  it("un solo día", () => {
    expect(durationText("2024-05-10", "2024-05-10")).toBe("1 día");
  });

  it("fin de mes con año bisiesto", () => {
    expect(durationText("2024-01-31", "2024-02-29")).toBe("1 mes y 1 día");
  });

  it("devuelve vacío si faltan datos o el rango es inválido", () => {
    expect(durationText("", "2024-01-01")).toBe("");
    expect(durationText("2024-02-01", "2024-01-01")).toBe("");
  });
});

describe("addOneDay", () => {
  it("pasa al día siguiente, incluso de un año a otro", () => {
    expect(addOneDay("2024-12-31")).toBe("2025-01-01");
    expect(addOneDay("2024-02-28")).toBe("2024-02-29");
  });
});
