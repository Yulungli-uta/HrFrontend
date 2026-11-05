// src/components/teacher-roster/nonTitularLabels.ts
//
// Etiquetas de la pestaña "No titulares". Los nombres de tipo de contrato vienen en mayúsculas desde la BD
// (ej. "CONTRATO PROFESOR/A OCASIONAL (DELEGACIÓN)"); aquí se muestran sin la palabra "Contrato" y capitalizados.

export function contractTypeLabel(name?: string | null): string {
  if (!name) return "—";
  return name
    .replace(/^CONTRATO\s+/i, "")
    .toLowerCase()
    .replace(/(^|[\s(])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}
