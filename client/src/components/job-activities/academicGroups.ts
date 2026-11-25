// src/components/job-activities/academicGroups.ts

/**
 * Vínculo entre el escalón docente de un cargo (Titular Auxiliar/Agregado/Principal, nivel 1-3) y la escala del personal
 * académico titular ("Personal Académico <Categoría> Nivel <n>"). El escalón da la categoría y el nivel; la escala aporta
 * el grado (1 a 8) y el RMU referencial al documento de la acción.
 */

export type AcademicCategory = "Auxiliar" | "Agregado" | "Principal";

export interface LadderLevel {
  category: AcademicCategory;
  level: number;
}

const CATEGORIES: Record<string, AcademicCategory> = {
  auxiliar: "Auxiliar",
  agregado: "Agregado",
  principal: "Principal",
};

/** Categoría y nivel de un escalón por su nombre ("Titular Agregado 2 Tiempo Completo"); null si no trae nivel. */
export function parseLadderLevel(ladderName?: string | null): LadderLevel | null {
  const match = /titular\s+(auxiliar|agregado|principal)\s+(\d)/i.exec(ladderName ?? "");
  if (!match) return null;
  return { category: CATEGORIES[match[1].toLowerCase()], level: Number(match[2]) };
}

/** Nombre del grupo que corresponde a un escalón. */
export function academicGroupName({ category, level }: LadderLevel): string {
  return `Personal Académico ${category} Nivel ${level}`;
}

/** Texto para buscar el grupo en el servidor (la búsqueda es por palabras, sin importar tildes). */
export function academicGroupSearch({ category, level }: LadderLevel): string {
  return `Personal Académico ${category} Nivel ${level}`;
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** true si el nombre del grupo es exactamente el que corresponde al nivel (sin importar tildes ni mayúsculas). */
export function groupMatchesLevel(groupName: string | null | undefined, level: LadderLevel): boolean {
  return !!groupName && normalize(groupName) === normalize(academicGroupName(level));
}

/** true si la escala es de personal académico titular (Auxiliar, Agregado o Principal, cualquier nivel). */
export function isAcademicTitularGroup(groupName: string | null | undefined): boolean {
  return !!groupName && /^personal academico (auxiliar|agregado|principal)\b/.test(normalize(groupName));
}
