// src/features/dbFieldLimits.ts
//
// Límites reales (en caracteres) de columnas nvarchar/varchar para los campos
// de texto libre de los formularios del frontend. Usar SIEMPRE estas
// constantes en `maxLength` (y en `.max()` de Zod cuando el formulario use
// React Hook Form) en vez de escribir el número directamente — así, si una
// columna cambia de tamaño en BD, se actualiza en un solo lugar.
//
// Verificado contra la BD real con:
//   SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH
//   FROM INFORMATION_SCHEMA.COLUMNS WHERE ...
// (NO usar sys.columns.max_length: para nvarchar esa columna está en BYTES,
// no en caracteres, y da el doble del límite real).
// Última verificación: 2026-10-13.
//
// No incluye tablas de Guardias (tbl_Guard*) — ese módulo es un hilo de QA
// aparte (UTA-DITIC-PS-030-2026) todavía sin comitear; se agregan cuando ese
// hilo retome, para no mezclar cambios de dos frentes distintos aquí.

export const DB_FIELD_LIMITS = {
  // ── HR.tbl_People (Personas / modificación de Empleados vía PersonForm,
  //    PersonCreateDialog) ──────────────────────────────────────────────
  people: {
    firstName: 100,
    lastName: 100,
    idCard: 20,
    email: 150,
    phone: 30,
    disability: 200,
    address: 255,
    militaryCard: 50,
    motherName: 100,
    fatherName: 100,
    conadisCard: 50,
    preferredDenomination: 200,
  },

  // ── HR.tbl_PunchJustifications (Justificaciones) ────────────────────────
  punchJustifications: {
    reason: 500,
    comments: 1000,
  },

  // ── HR.tbl_TimePlanning (Planificación de Horas Extra) ──────────────────
  timePlanning: {
    title: 200,
    description: 500,
    overtimeType: 50,
  },

  // ── HR.tbl_ScheduleChangePlan / tbl_ScheduleChangePlanDetail
  //    (Planificación Cambio de Horarios) ──────────────────────────────────
  scheduleChangePlan: {
    title: 200,
    justification: 1000,
    rejectionReason: 500,
    planCode: 20,
  },
  scheduleChangePlanDetail: {
    notes: 500,
    omissionReason: 300,
  },

  // ── HR.tbl_Contracts (anulación vía ContractActions.tsx) ────────────────
  contracts: {
    cancelReason: 250,
  },

  // ── HR.tbl_PersonnelActions (Acción de Personal) ────────────────────────
  personnelActions: {
    actionNumber: 50,
    originBudgetCode: 50,
    destinationBudgetCode: 50,
    legalBasis: 500,
    reason: 1000,
    observations: 1000,
  },

  // ── HR.tbl_personnel_action_type (catálogo Tipo de Acción de Personal,
  //    PersonnelActionTypeForm.tsx) ────────────────────────────────────────
  personnelActionType: {
    name: 150,
    code: 50,
    description: 300,
    numberingPrefix: 30,
    actionCategory: 30,
  },

  // ── HR.tbl_FamilyBurden (Cargas Familiares) ─────────────────────────────
  familyBurden: {
    dependentId: 20,
    firstName: 100,
    lastName: 100,
    rejectionReason: 500,
    educationInstitution: 150,
  },

  // ── HR.ref_Types (catálogo app-wide, ~57 consumidores vía useRefTypes /
  //    useRefTypesByCategory — ver también refTypeCategories.ts) ─────────
  refTypes: {
    category: 50,
    name: 100,
    description: 255,
    siiesLabel: 100,
    // Metadata es NVARCHAR(MAX) — sin límite real, no agregar aquí.
  },

  // ── HR.tbl_PermissionTypes (catálogo Tipos de Permiso) ──────────────────
  permissionTypes: {
    name: 80,
  },

  // ── HR.tbl_MenuItems (Administración > Menús) ───────────────────────────
  menuItems: {
    name: 100,
    url: 300,
    icon: 100,
    moduleName: 100,
  },

  // ── HR.tbl_Institutions (catálogo Instituciones) ────────────────────────
  institutions: {
    name: 200,
  },

  // ── HR.tbl_KnowledgeArea (catálogo Áreas de Conocimiento) ───────────────
  knowledgeArea: {
    code: 10,
    name: 200,
    siiesCode: 20,
  },

  // ── HR.tbl_Countries / tbl_Provinces / tbl_Cantons
  //    (catálogo Ubicaciones Geográficas) ──────────────────────────────────
  countries: {
    countryName: 100,
    nationality: 100,
    nationalityCode: 5,
  },
  provinces: {
    provinceName: 100,
  },
  cantons: {
    cantonName: 100,
  },

  // ── HR.TBL_PARAMETERS (Parámetros del Sistema) ──────────────────────────
  parameters: {
    name: 100,
    description: 255,
    // Pvalues es NVARCHAR(MAX) — sin límite real, no agregar aquí.
  },

  // ── HR.tbl_TimeBalanceMovements (Ajuste de Saldo y Liquidación de
  //    Vacaciones — VacationBalanceAdjustment.tsx, Liquidaciones.tsx) ─────
  timeBalanceMovements: {
    note: 2000,
    /** batchTag se concatena como `BULK_LOAD_${batchTag}` dentro de
     * SourceModule (máx. 50 caracteres). Para no truncarse en BD, batchTag
     * debe quedar en <= 40 caracteres. */
    sourceModuleBatchTagMax: 40,
  },

  // ── HR.tbl_MassVacationPlan / tbl_MassVacationPlanExclusion
  //    (Planificación Masiva de Vacaciones) ────────────────────────────────
  massVacationPlan: {
    description: 500,
  },
  massVacationPlanExclusion: {
    reason: 500,
  },

  // ── HR.tbl_ResignationRetirementRequests (Renuncia / Jubilación) ───────
  resignationRetirementRequests: {
    reason: 1000,
    additionalNotes: 1000,
  },
  // ── HR.tbl_ResignationRetirementStatusHistory (revisión/aprobación de
  //    Renuncia o Jubilación — ReviewActionDialog.tsx) ─────────────────────
  resignationRetirementStatusHistory: {
    observation: 1000,
  },
} as const;
