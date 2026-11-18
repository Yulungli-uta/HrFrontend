// Presentación de los cambios del Historial de Correcciones (HR.Audit, Action=CORRECTION).
// El backend guarda el diff tal cual lo vio EF Core: nombres de columna, fechas en formato
// M/d/yyyy y claves de ref_Types sin resolver. Aquí se traduce para que lo lea una persona.
import type { AuditFieldChange } from "@/types/audit";

/** Campos técnicos que el sistema actualiza solo; no son una decisión de quien corrige. */
const HIDDEN_FIELDS = new Set(["UpdatedAt", "UpdatedBy", "CreatedAt", "CreatedBy"]);

const FIELD_LABELS: Record<string, string> = {
  ActionNumber: "Número de acción",
  ActionDate: "Fecha de la acción",
  EffectiveDate: "Fecha de inicio",
  EndDate: "Fecha de fin",
  ActionTypeId: "Tipo de acción (ID)",
  NewRmu: "RMU propuesta",
  PreviousRmu: "RMU de origen",
  Workplace: "Lugar de trabajo (propuesto)",
  OriginWorkplace: "Lugar de trabajo (origen)",
  InstitutionalProcess: "Proceso institucional (propuesto)",
  OriginInstitutionalProcess: "Proceso institucional (origen)",
  ManagementLevel: "Nivel de gestión (propuesto)",
  OriginManagementLevel: "Nivel de gestión (origen)",
  OriginJobId: "Cargo de origen (ID)",
  DestinationJobId: "Cargo propuesto (ID)",
  OriginDepartmentId: "Unidad de origen (ID)",
  DestinationDepartmentId: "Unidad propuesta (ID)",
  OriginBudgetCode: "Partida de origen",
  DestinationBudgetCode: "Partida propuesta",
  Observations: "Observaciones",
  SwornDeclaration: "Declaración juramentada",
  ElaboratorId: "Elaborado por (ID)",
  ReviewerId: "Revisado por (ID)",
  RegistrarId: "Registrado por (ID)",
  DthDirectorId: "Director de Talento Humano (ID)",
  AuthorityNominatorId: "Autoridad nominadora (ID)",
  StatusTypeId: "Estado",
  EmployeeTypeId: "Tipo de empleado",
  LeaveReasonId: "Motivo de salida",
  ContractDescription: "Descripción del contrato",
};

/** Campos cuyo valor es la clave de un registro de ref_Types. */
const REF_TYPE_FIELDS = new Set([
  "Workplace",
  "OriginWorkplace",
  "InstitutionalProcess",
  "OriginInstitutionalProcess",
  "ManagementLevel",
  "OriginManagementLevel",
  "StatusTypeId",
  "EmployeeTypeId",
  "LeaveReasonId",
]);

const MONEY_FIELDS = new Set(["NewRmu", "PreviousRmu"]);
const DATE_FIELDS = new Set(["ActionDate", "EffectiveDate", "EndDate"]);

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/;

function formatDateValue(value: string): string {
  const m = US_DATE.exec(value);
  if (!m) return value;
  const [, month, day, year] = m;
  if (year === "9999") return "Sin fecha de fin";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

/** Valor listo para mostrar. `refNames` traduce claves de ref_Types a su nombre. */
export function formatChangeValue(
  field: string,
  value: string | null,
  refNames: ReadonlyMap<number, string>
): string {
  if (value === null || value === "") return "—";
  if (REF_TYPE_FIELDS.has(field)) {
    const id = Number(value);
    return Number.isFinite(id) ? (refNames.get(id) ?? `#${value}`) : value;
  }
  if (MONEY_FIELDS.has(field)) {
    const n = Number(value);
    return Number.isFinite(n) ? `$ ${n.toFixed(2)}` : value;
  }
  if (DATE_FIELDS.has(field)) return formatDateValue(value);
  return value;
}

/** Cambios reales: sin campos técnicos y sin diferencias que son solo de formato (733.00 → 733). */
export function meaningfulChanges(changes: AuditFieldChange[]): {
  visible: AuditFieldChange[];
  hiddenCount: number;
} {
  const visible = changes.filter((c) => {
    if (HIDDEN_FIELDS.has(c.field)) return false;
    const oldN = Number(c.oldValue);
    const newN = Number(c.newValue);
    const bothNumeric =
      c.oldValue !== null && c.newValue !== null && c.oldValue !== "" && c.newValue !== "" &&
      Number.isFinite(oldN) && Number.isFinite(newN);
    if (bothNumeric && oldN === newN) return false;
    return c.oldValue !== c.newValue;
  });
  return { visible, hiddenCount: changes.length - visible.length };
}
