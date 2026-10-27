import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Estándar "Fecha y hora UTA": el día se calcula con `@/lib/clock` (hora de Ecuador), nunca con
// `toISOString()`, que da el día UTC (de noche en Ecuador adelanta un día).
// Excepciones permitidas: aritmética pura de días-época en UTC y hora técnica de logs.
const ALLOWED = new Set(["lib/clock.ts", "lib/clock.test.ts", "lib/clockGuard.test.ts", "lib/logger.ts", "lib/researchDuration.ts"]);
const SRC_ROOT = join(__dirname, "..");
const DATE_SLICE = /toISOString\(\)\s*\.(split|slice|substring|substr)\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "node_modules" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const LOCALE_FORMAT = /new Date\([^()]*\)\.toLocale(Date|Time)?String\(/;

describe("estándar de fecha y hora", () => {
  it("ninguna pantalla formatea fechas con new Date(...).toLocale*String (usar formatDate/formatDateTime/formatTime)", () => {
    const offenders = sourceFiles(SRC_ROOT)
      .map((file) => relative(SRC_ROOT, file).split(sep).join("/"))
      .filter((rel) => !ALLOWED.has(rel))
      .filter((rel) => LOCALE_FORMAT.test(readFileSync(join(SRC_ROOT, rel), "utf-8")));
    expect(offenders).toEqual([]);
  });

  it("ningún archivo calcula el día con toISOString()", () => {
    const offenders = sourceFiles(SRC_ROOT)
      .map((file) => relative(SRC_ROOT, file).split(sep).join("/"))
      .filter((rel) => !ALLOWED.has(rel))
      .filter((rel) => DATE_SLICE.test(readFileSync(join(SRC_ROOT, rel), "utf-8")));
    expect(offenders).toEqual([]);
  });
});
