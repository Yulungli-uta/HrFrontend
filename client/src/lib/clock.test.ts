import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDate,
  formatDateTime,
  addMonths,
  addYears,
  ecuadorDateOf,
  formatEcuador,
  nowEcuadorLocalInput,
  parseServerDateTime,
  sundayOnOrBefore,
  toDateOnlyString,
  todayEcuador,
} from "./clock";

describe("clock (hora de Ecuador)", () => {
  it("a las 19:30 de Ecuador el día sigue siendo el mismo aunque UTC ya sea el siguiente", () => {
    const instant = new Date("2026-10-27T00:30:00Z"); // 26/10 19:30 en Ecuador
    expect(todayEcuador(instant)).toBe("2026-10-26");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-10-27");
  });

  it("cambia de día a medianoche de Ecuador", () => {
    expect(ecuadorDateOf(new Date("2026-10-27T04:59:59Z"))).toBe("2026-10-26");
    expect(ecuadorDateOf(new Date("2026-10-27T05:00:00Z"))).toBe("2026-10-27");
  });

  it("un datetime del servidor sin zona se interpreta como hora de Ecuador", () => {
    expect(parseServerDateTime("2026-10-26T19:30:00")?.toISOString()).toBe("2026-10-27T00:30:00.000Z");
    expect(parseServerDateTime("2026-10-26 19:30:00.123")?.toISOString()).toBe("2026-10-27T00:30:00.123Z");
  });

  it("respeta la zona cuando el valor ya la trae", () => {
    expect(parseServerDateTime("2026-10-27T00:30:00Z")?.toISOString()).toBe("2026-10-27T00:30:00.000Z");
    expect(parseServerDateTime("2026-10-26T19:30:00-05:00")?.toISOString()).toBe("2026-10-27T00:30:00.000Z");
  });

  it("valores vacíos o inválidos devuelven null / cadena vacía", () => {
    expect(parseServerDateTime(null)).toBeNull();
    expect(parseServerDateTime("no-es-fecha")).toBeNull();
    expect(formatEcuador("no-es-fecha")).toBe("");
  });

  it("formatea en hora de Ecuador sin importar la zona del navegador", () => {
    expect(formatEcuador(new Date("2026-10-27T00:30:00Z"), "en-US", { hour: "2-digit", minute: "2-digit", hour12: false })).toBe("19:30");
  });

  it("la aritmética de fechas de calendario no depende de la zona", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addMonths("2026-10-05", 3)).toBe("2027-01-05");
    expect(addYears("2026-10-26", 2)).toBe("2028-10-26");
    expect(sundayOnOrBefore("2026-10-26")).toBe("2026-10-25"); // lunes -> domingo anterior
    expect(sundayOnOrBefore("2026-10-25")).toBe("2026-10-25");
  });

  it("toDateOnlyString no mueve el día de una fecha del servidor", () => {
    expect(toDateOnlyString("1974-01-27")).toBe("1974-01-27");
    expect(toDateOnlyString("1974-01-27T00:00:00")).toBe("1974-01-27");
    expect(toDateOnlyString(null)).toBe("");
  });

  it("nowEcuadorLocalInput entrega fecha y hora de Ecuador", () => {
    expect(nowEcuadorLocalInput(new Date("2026-10-27T00:30:00Z"))).toBe("2026-10-26T19:30");
  });

  it("formatDate no corre el día de una fecha de calendario", () => {
    expect(formatDate("2026-10-26", "es-EC")).toBe("26/10/2026");
    expect(formatDate("1974-01-27", "es-EC", { day: "2-digit", month: "long", year: "numeric" })).toBe("27 de enero de 1974");
    expect(formatDate(null)).toBe("");
    expect(formatDate("texto")).toBe("");
  });

  it("formatDateTime muestra la hora de Ecuador para un datetime sin zona y para uno con zona", () => {
    const opts = { hour: "2-digit", minute: "2-digit", hour12: false } as const;
    expect(formatDateTime("2026-10-26T19:30:00", "en-US", opts)).toBe("19:30");
    expect(formatDateTime("2026-10-27T00:30:00Z", "en-US", opts)).toBe("19:30");
    expect(formatDateTime(new Date("2026-10-27T00:30:00Z"), "en-US", opts)).toBe("19:30");
  });
});
