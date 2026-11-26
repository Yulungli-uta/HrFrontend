// Discapacidad de una carga familiar. La base guarda solo el tipo y el porcentaje; "tiene discapacidad" se deduce de ellos.
// El backend no devuelve ese indicador: sin deducirlo, la lista no mostraba la discapacidad y el formulario de edición abría
// con la casilla desmarcada y borraba el tipo y el porcentaje al guardar.

export interface FamilyDisabilityFields {
  hasDisability?: boolean | null;
  disabilityTypeId?: number | null;
  disabilityPercentage?: number | null;
}

/** true si la carga familiar tiene discapacidad: el indicador explícito, o un tipo o un porcentaje guardados. */
export const deriveHasDisability = (member: FamilyDisabilityFields): boolean =>
  member.hasDisability ?? (member.disabilityTypeId != null || (member.disabilityPercentage ?? 0) > 0);

/** Tipo y porcentaje a guardar: ambos si tiene discapacidad, ambos vacíos (nulos) si no. */
export const disabilityToSave = (
  hasDisability: boolean,
  disabilityTypeId?: number | null,
  disabilityPercentage?: number | null,
): { disabilityTypeId: number | null; disabilityPercentage: number | null } =>
  hasDisability
    ? { disabilityTypeId: disabilityTypeId ?? null, disabilityPercentage: disabilityPercentage ?? null }
    : { disabilityTypeId: null, disabilityPercentage: null };
