import { describe, expect, it } from "vitest";
import {
  academicGroupName,
  academicGroupSearch,
  groupMatchesLevel,
  isAcademicTitularGroup,
  parseLadderLevel,
} from "../academicGroups";

describe("parseLadderLevel", () => {
  it("lee categoría y nivel del nombre del escalón, con o sin dedicación", () => {
    expect(parseLadderLevel("Titular Auxiliar 2")).toEqual({ category: "Auxiliar", level: 2 });
    expect(parseLadderLevel("Titular Agregado 3 Tiempo Completo")).toEqual({ category: "Agregado", level: 3 });
    expect(parseLadderLevel("TITULAR PRINCIPAL 1 MEDIO TIEMPO")).toEqual({ category: "Principal", level: 1 });
  });

  it("devuelve null si el escalón no trae nivel o no es de titular", () => {
    expect(parseLadderLevel("Titular Auxiliar")).toBeNull();
    expect(parseLadderLevel("No Titular Ocasional Tiempo Completo")).toBeNull();
    expect(parseLadderLevel(undefined)).toBeNull();
  });
});

describe("grupo del nivel", () => {
  const level = { category: "Agregado", level: 2 } as const;

  it("arma el nombre y el texto de búsqueda", () => {
    expect(academicGroupName(level)).toBe("Personal Académico Titular - Agregado - Nivel 2");
    expect(academicGroupSearch(level)).toBe("Personal Académico Titular Agregado Nivel 2");
  });

  it("compara sin importar tildes ni mayúsculas", () => {
    expect(groupMatchesLevel("PERSONAL ACADEMICO TITULAR - AGREGADO - NIVEL 2", level)).toBe(true);
    expect(groupMatchesLevel("Personal Académico Titular - Agregado - Nivel 3", level)).toBe(false);
    expect(groupMatchesLevel("Servidor Público 2", level)).toBe(false);
    expect(groupMatchesLevel(null, level)).toBe(false);
  });

  it("reconoce los grupos de personal académico titular", () => {
    expect(isAcademicTitularGroup("Personal Académico Titular - Principal - Nivel 1")).toBe(true);
    expect(isAcademicTitularGroup("Servidor Público 7")).toBe(false);
  });
});
