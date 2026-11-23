// Nombres en español de los códigos internos de los catálogos de Guardias, para no mostrar
// textos técnicos (p. ej. MEDICAL_LEAVE) al usuario. El código real no cambia: solo se muestra distinto.
const GUARD_CODE_LABEL: Record<string, string> = {
  // Origen de bloqueo
  PERMISSION: 'Permiso',
  VACATION: 'Vacaciones',
  MEDICAL: 'Médico',
  MEDICAL_LEAVE: 'Licencia médica',
  MANUAL: 'Manual',
  MANUAL_BLOCK: 'Bloqueo manual',
  SUSPENSION: 'Suspensión',
  TRAINING: 'Capacitación',
  // Tipo de bloqueo
  FULL_DAY: 'Día completo',
  PARTIAL: 'Parcial',
  RECURRING: 'Recurrente',
  // Tipo de turno
  MORNING: 'Turno mañana',
  AFTERNOON: 'Turno tarde',
  NIGHT: 'Turno noche',
  REST: 'Día libre',
  // Nivel de grupo
  GENERAL: 'General',
  SUBGROUP: 'Subgrupo',
  ROTATION: 'Rotación',
};

/** Nombre entendible del código; si no hay traducción conocida devuelve el mismo código. */
export function guardCodeLabel(code: string): string {
  return GUARD_CODE_LABEL[code] ?? code;
}
