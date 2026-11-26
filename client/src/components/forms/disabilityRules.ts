// Reglas de los datos de discapacidad de una persona (hoja de vida → información personal → salud).
// Con "Tiene discapacidad" activo, el tipo, el porcentaje (> 0 y ≤ 100) y el carnet CONADIS son obligatorios y el tipo no puede
// ser "Ninguna"; sin discapacidad esos campos deben quedar vacíos. Un solo lugar para el esquema del formulario y sus pruebas.

export interface DisabilityFields {
  hasDisability?: boolean;
  disability?: string | null;
  disabilityPercentage?: number | null;
  conadisCard?: string | null;
}

export interface DisabilityIssue {
  path: "disability" | "disabilityPercentage" | "conadisCard";
  message: string;
}

/** Texto sin tildes ni mayúsculas, para comparar nombres del catálogo con datos escritos a mano. */
export const normalizeDisabilityText = (value?: string | null): string =>
  (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/** "Ninguna" es el tipo del catálogo para "sin discapacidad": no es un tipo válido cuando la persona sí la tiene. */
export const isNoDisabilityType = (value?: string | null): boolean => normalizeDisabilityText(value) === "ninguna";

/** Devuelve las reglas incumplidas (lista vacía si los datos son válidos). */
export function getDisabilityIssues(data: DisabilityFields): DisabilityIssue[] {
  const issues: DisabilityIssue[] = [];
  const type = data.disability?.trim() ?? "";
  const percentage = data.disabilityPercentage;
  const card = data.conadisCard?.trim() ?? "";

  if (!data.hasDisability) {
    if (type) issues.push({ path: "disability", message: "No se puede registrar un tipo de discapacidad si la persona no tiene discapacidad" });
    if (percentage) issues.push({ path: "disabilityPercentage", message: "No se puede registrar un porcentaje de discapacidad si la persona no tiene discapacidad" });
    if (card) issues.push({ path: "conadisCard", message: "No se puede registrar un carnet CONADIS si la persona no tiene discapacidad" });
    return issues;
  }

  if (!type) {
    issues.push({ path: "disability", message: "Seleccione el tipo de discapacidad" });
  } else if (isNoDisabilityType(type)) {
    issues.push({ path: "disability", message: "El tipo de discapacidad no puede ser «Ninguna»: desactive «Tiene discapacidad» si no aplica" });
  }
  if (percentage == null || Number.isNaN(percentage) || !(percentage > 0)) {
    issues.push({ path: "disabilityPercentage", message: "El porcentaje de discapacidad es obligatorio y debe ser mayor que 0" });
  }
  if (!card) {
    issues.push({ path: "conadisCard", message: "El carnet CONADIS es obligatorio cuando la persona tiene discapacidad" });
  }
  return issues;
}
