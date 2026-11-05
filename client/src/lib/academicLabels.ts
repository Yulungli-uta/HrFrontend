// src/lib/academicLabels.ts
//
// Textos para mostrar de los catálogos académicos (ref_Types ACADEMIC_CATEGORY / ACADEMIC_LEVEL /
// ACADEMIC_DEDICATION). En BD el `Name` es un código estable (ej. TITULAR_AGREGADO, HORAS); aquí
// se traduce a la denominación institucional. Un código desconocido se devuelve legible, nunca vacío.

const CATEGORY_LABELS: Record<string, string> = {
  TITULAR_PRINCIPAL: "Titular Principal",
  TITULAR_AGREGADO: "Titular Agregado",
  TITULAR_AUXILIAR: "Titular Auxiliar",
  OCASIONAL: "Ocasional",
  INVITADO: "Invitado",
  HONORARIO: "Honorario",
  EMERITO: "Emérito",
};

const DEDICATION_LABELS: Record<string, string> = {
  TC: "Tiempo Completo",
  MT: "Medio Tiempo",
  HORAS: "Tiempo Parcial",
  EXCLUSIVA: "Exclusiva",
};

const humanize = (code: string): string =>
  code
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function categoryLabel(name?: string | null): string {
  if (!name) return "—";
  return CATEGORY_LABELS[name] ?? humanize(name);
}

export function levelLabel(name?: string | null): string {
  if (!name) return "—";
  const m = /^NIVEL_(\d+)$/.exec(name);
  return m ? `Nivel ${m[1]}` : humanize(name);
}

export function dedicationLabel(name?: string | null): string {
  if (!name) return "—";
  return DEDICATION_LABELS[name] ?? humanize(name);
}
