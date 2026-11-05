import { describe, expect, it } from "vitest";
import { getDateRangeIssue } from "@/lib/reportDateRange";

describe("getDateRangeIssue", () => {
  it("no valida si falta alguna de las dos fechas", () => {
    expect(getDateRangeIssue(undefined, "2026-11-01")).toEqual({});
    expect(getDateRangeIssue("2026-11-01", undefined)).toEqual({});
    expect(getDateRangeIssue()).toEqual({});
  });

  it("acepta un rango válido y el mismo día", () => {
    expect(getDateRangeIssue("2026-11-01", "2026-11-30")).toEqual({});
    expect(getDateRangeIssue("2026-11-05", "2026-11-05")).toEqual({});
  });

  it("marca error cuando el inicio es posterior al fin", () => {
    const issue = getDateRangeIssue("2026-11-30", "2026-11-01");
    expect(issue.error).toBeTruthy();
    expect(issue.warning).toBeUndefined();
  });

  it("solo advierte cuando el rango pasa de 12 meses", () => {
    expect(getDateRangeIssue("2025-11-05", "2026-11-05")).toEqual({});
    const issue = getDateRangeIssue("2025-11-04", "2026-11-05");
    expect(issue.warning).toBeTruthy();
    expect(issue.error).toBeUndefined();
  });
});
