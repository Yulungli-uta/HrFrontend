/**
 * Categorías funcionales de los tipos de acción de personal (HR.tbl_personnel_action_type.ActionCategory).
 * Son los valores que usa el backend; no es una lista de ref_Types. La categoría decide movimientos de personal, historial
 * laboral y SIIES. Cómo se imprime el documento se configura aparte (campo "Mostrar situación propuesta").
 */
export const ACTION_CATEGORIES = [
  { value: "MOVEMENT",       label: "Movimiento de personal (traslado, cambio de puesto o unidad)" },
  { value: "ENTRY",          label: "Ingreso / toma de posesión" },
  { value: "SALARY_CHANGE",  label: "Cambio de sueldo, grado o categoría" },
  { value: "SCHEDULE",       label: "Cambio de horario / dedicación" },
  { value: "LEAVE",          label: "Licencia / Permiso" },
  { value: "VACATION",       label: "Vacaciones" },
  { value: "DISCIPLINARY",   label: "Disciplinaria / Sanción" },
  { value: "EXIT",           label: "Salida / Baja (renuncia, jubilación)" },
  { value: "VULNERABILITY",  label: "Vulnerabilidad" },
  { value: "OTHER",          label: "Otra" },
] as const;

/** Categorías que por defecto imprimen la grilla completa de Situación Propuesta (igual que el backend). */
export const CATEGORIES_WITH_PROPOSED_SITUATION: readonly string[] = ["ENTRY", "MOVEMENT", "SALARY_CHANGE"];

export function actionCategoryLabel(value?: string | null): string {
  if (!value) return "Sin categoría";
  return ACTION_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
