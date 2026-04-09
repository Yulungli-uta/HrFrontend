// src/shared/schema.ts
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  timestamp,
  date,
  boolean,
  bigint,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===============================
// ENUMS / CONSTANTES
// ===============================
export const EmpType = ["Teacher_LOSE", "Administrative_LOSEP", "Employee_CT", "Coordinator"] as const;
export const SexType = ["M", "F", "O"] as const;
export const PermissionStatus = ["Pending", "Approved", "Rejected"] as const;
export const VacationStatus = ["Planned", "InProgress", "Completed", "Canceled"] as const;
export const PunchType = ["In", "Out"] as const;
export const CalcStatus = ["Pending", "Approved"] as const;
export const OTStatus = ["Planned", "Verified", "Rejected", "Paid"] as const;
export const MovementType = ["Transfer", "Promotion", "Demotion", "Lateral"] as const;
export const PayrollStatus = ["Pending", "Paid", "Reconciled"] as const;
export const LineType = ["Earning", "Deduction", "Subsidy", "Overtime"] as const;

// ===============================
// TABLAS BÁSICAS
// ===============================

// 1. Personas
export const people = pgTable("people", {
  id: integer("PersonID"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  idCard: varchar("id_card", { length: 20 }),
  email: varchar("email", { length: 150 }),
  phone: varchar("phone", { length: 30 }),
  birthDate: date("birth_date"),
  sex: integer("sex"),
  gender: integer("gender"),
  disability: text("disability"),
  address: text("address"),
  isActive: boolean("is_active"),
  maritalStatusTypeId: integer("marital_status_type_id"),
  militaryCard: varchar("military_card", { length: 50 }),
  motherName: varchar("mother_name", { length: 150 }),
  fatherName: varchar("father_name", { length: 150 }),
  countryId: varchar("country_id", { length: 10 }),
  provinceId: varchar("province_id", { length: 10 }),
  cantonId: varchar("canton_id", { length: 10 }),
  yearsOfResidence: integer("years_of_residence"),
  ethnicityTypeId: integer("ethnicity_type_id"),
  bloodTypeTypeId: integer("blood_type_type_id"),
  specialNeedsTypeId: integer("special_needs_type_id"),
  disabilityPercentage: integer("disability_percentage"),
  conadisCard: varchar("conadis_card", { length: 50 }),
});

// 2. Empleados
export const employees = pgTable("employees", {
  id: integer("id"),
  type: varchar("type", { length: 30 }),
  departmentId: integer("department_id"),
  immediateBossId: integer("immediate_boss_id"),
  hireDate: date("hire_date"),
  isActive: boolean("is_active"),
});

// 3. Facultades
export const faculties = pgTable("faculties", {
  id: integer("id"),
  name: varchar("name", { length: 120 }),
  deanEmployeeId: integer("dean_employee_id"),
  isActive: boolean("is_active"),
});

// 4. Departamentos
export const departments = pgTable("departments", {
  id: integer("id"),
  facultyId: integer("faculty_id"),
  name: varchar("name", { length: 120 }),
  isActive: boolean("is_active"),
});

// 5. Horarios
export const schedules = pgTable("schedules", {
  id: integer("id"),
  description: text("description"),
  entryTime: varchar("entry_time", { length: 8 }),
  exitTime: varchar("exit_time", { length: 8 }),
  workingDays: text("working_days"),
  requiredHoursPerDay: decimal("required_hours_per_day", { precision: 5, scale: 2 }),
  hasLunchBreak: boolean("has_lunch_break"),
  lunchStart: varchar("lunch_start", { length: 8 }),
  lunchEnd: varchar("lunch_end", { length: 8 }),
  isRotating: boolean("is_rotating"),
  rotationPattern: text("rotation_pattern"),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// 6. Asignación de Horarios
export const employeeSchedules = pgTable("employee_schedules", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  scheduleId: integer("schedule_id"),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
});

// 7. Contratos
export const contracts = pgTable("contracts", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  contractType: varchar("contract_type", { length: 50 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }),
});

// 8. Historial de Salarios
export const salaryHistory = pgTable("salary_history", {
  id: integer("id"),
  contractId: integer("contract_id"),
  oldSalary: decimal("old_salary", { precision: 10, scale: 2 }),
  newSalary: decimal("new_salary", { precision: 10, scale: 2 }),
  changedBy: varchar("changed_by", { length: 100 }),
  changedAt: timestamp("changed_at"),
  reason: text("reason"),
});

// 9. Tipos de Permiso
export const permissionTypes = pgTable("permission_types", {
  id: integer("id"),
  name: varchar("name", { length: 100 }),
  deductsFromVacation: boolean("deducts_from_vacation"),
  requiresApproval: boolean("requires_approval"),
  maxDays: integer("max_days"),
});

// 10. Permisos
export const permissions = pgTable("permissions", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  permissionTypeId: integer("permission_type_id"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  chargedToVacation: boolean("charged_to_vacation"),
  approvedBy: integer("approved_by"),
  justification: text("justification"),
  requestDate: timestamp("request_date"),
  status: varchar("status", { length: 20 }),
  vacationId: integer("vacation_id"),
});

// 11. Vacaciones
export const vacations = pgTable("vacations", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  daysGranted: integer("days_granted"),
  daysTaken: integer("days_taken"),
  status: varchar("status", { length: 20 }),
});

// 12. Picadas
export const attendancePunches = pgTable("attendance_punches", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  punchTime: timestamp("punch_time"),
  punchType: varchar("punch_type", { length: 3 }),
  deviceId: varchar("device_id", { length: 50 }),
  longitude: real("longitude"),
  latitude: real("latitude"),
});

// 13. Justificación de Picadas
export const punchJustifications = pgTable("punch_justifications", {
  id: integer("id"),
  punchId: integer("punch_id"),
  bossEmployeeId: integer("boss_employee_id"),
  reason: text("reason"),
  approved: boolean("approved"),
  approvedAt: timestamp("approved_at"),
});

// 14. Agregados de Asistencia
export const attendanceCalculations = pgTable("attendance_calculations", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  workDate: date("work_date"),
  firstPunchIn: timestamp("first_punch_in"),
  lastPunchOut: timestamp("last_punch_out"),
  totalWorkedMinutes: integer("total_worked_minutes"),
  regularMinutes: integer("regular_minutes"),
  overtimeMinutes: integer("overtime_minutes"),
  nightMinutes: integer("night_minutes"),
  holidayMinutes: integer("holiday_minutes"),
  status: varchar("status", { length: 20 }),
});

// 15. Configuración Horas Extra
export const overtimeConfig = pgTable("overtime_config", {
  overtimeType: varchar("overtime_type", { length: 50 }),
  factor: decimal("factor", { precision: 5, scale: 2 }),
  description: text("description"),
});

// 16. Horas Extra
export const overtime = pgTable("overtime", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  workDate: date("work_date"),
  overtimeType: varchar("overtime_type", { length: 50 }),
  hours: decimal("hours", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 20 }),
  approvedBy: integer("approved_by"),
  secondApprover: integer("second_approver"),
  factor: decimal("factor", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
});

// 17. Plan de Recuperación
export const timeRecoveryPlans = pgTable("time_recovery_plans", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  owedMinutes: integer("owed_minutes"),
  planDate: date("plan_date"),
  fromTime: varchar("from_time", { length: 8 }),
  toTime: varchar("to_time", { length: 8 }),
  reason: text("reason"),
  createdBy: integer("created_by"),
});

// 18. Log de Recuperación
export const timeRecoveryLogs = pgTable("time_recovery_logs", {
  id: integer("id"),
  recoveryPlanId: integer("recovery_plan_id"),
  executedDate: date("executed_date"),
  minutesRecovered: integer("minutes_recovered"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
});

// 19. Subrogaciones
export const subrogations = pgTable("subrogations", {
  id: integer("id"),
  subrogatedEmployeeId: integer("subrogated_employee_id"),
  subrogatingEmployeeId: integer("subrogating_employee_id"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  permissionId: integer("permission_id"),
  vacationId: integer("vacation_id"),
  reason: text("reason"),
});

// 20. Movimientos de Personal
export const personnelMovements = pgTable("personnel_movements", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  contractId: integer("contract_id"),
  originDepartmentId: integer("origin_department_id"),
  destinationDepartmentId: integer("destination_department_id"),
  movementDate: date("movement_date"),
  movementType: varchar("movement_type", { length: 20 }),
  documentLocation: text("document_location"),
  reason: text("reason"),
  createdBy: integer("created_by"),
});

// 21. Nómina
export const payroll = pgTable("payroll", {
  id: integer("id"),
  employeeId: integer("employee_id"),
  period: varchar("period", { length: 7 }),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }),
  paymentDate: date("payment_date"),
  bankAccount: varchar("bank_account", { length: 50 }),
});

// 22. Detalle de Nómina
export const payrollLines = pgTable("payroll_lines", {
  id: integer("id"),
  payrollId: integer("payroll_id"),
  lineType: varchar("line_type", { length: 20 }),
  concept: varchar("concept", { length: 100 }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  unitValue: decimal("unit_value", { precision: 10, scale: 2 }),
  notes: text("notes"),
});

// 23. Auditoría
export const audit = pgTable("audit", {
  id: bigint("id", { mode: "number" }),
  tableName: varchar("table_name", { length: 100 }),
  action: varchar("action", { length: 20 }),
  recordID: varchar("record_id", { length: 100 }),
  userName: varchar("user_name", { length: 100 }),
  dateTime: timestamp("date_time"),
  details: text("details"),
});

// ===============================
// DIRECCIONES
// ===============================
export const addresses = pgTable("addresses", {
  addressId: integer("address_id"),
  personId: integer("person_id"),
  addressTypeId: integer("address_type_id"),
  countryId: integer("country_id"),
  provinceId: integer("province_id"),
  cantonId: integer("canton_id"),
  parish: varchar("parish", { length: 255 }),
  neighborhood: varchar("neighborhood", { length: 255 }),
  mainStreet: varchar("main_street", { length: 255 }),
  secondaryStreet: varchar("secondary_street", { length: 255 }),
  houseNumber: varchar("house_number", { length: 50 }),
  reference: text("reference"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ===============================
// NIVELES EDUCATIVOS
// ===============================
export const educationLevels = pgTable("education_levels", {
  educationId: integer("education_id"),
  personId: integer("person_id"),
  educationLevelTypeId: integer("education_level_type_id"),
  institutionId: integer("institution_id"),
  title: varchar("title", { length: 255 }),
  specialty: varchar("specialty", { length: 255 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  grade: varchar("grade", { length: 50 }),
  location: varchar("location", { length: 255 }),
  score: decimal("score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ===============================
// HOJA DE VIDA - TABLAS
// ===============================

// PUBLICACIONES
export const publications = pgTable("publications", {
  publicationId: integer("publication_id"),
  personId: integer("person_id"),
  location: varchar("location", { length: 255 }),
  publicationTypeId: integer("publication_type_id"),
  isIndexed: boolean("is_indexed"),
  journalTypeId: integer("journal_type_id"),
  issn_Isbn: varchar("issn_isbn", { length: 50 }),
  journalName: varchar("journal_name", { length: 255 }),
  journalNumber: varchar("journal_number", { length: 50 }),
  volume: varchar("volume", { length: 50 }),
  pages: varchar("pages", { length: 50 }),
  knowledgeAreaTypeId: integer("knowledge_area_type_id"),
  subAreaTypeId: integer("sub_area_type_id"),
  areaTypeId: integer("area_type_id"),
  title: varchar("title", { length: 500 }),
  organizedBy: varchar("organized_by", { length: 255 }),
  eventName: varchar("event_name", { length: 255 }),
  eventEdition: varchar("event_edition", { length: 100 }),
  publicationDate: date("publication_date"),
  utAffiliation: boolean("ut_affiliation"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// CARGAS FAMILIARES
export const familyBurden = pgTable("family_burden", {
  burdenId: integer("burden_id"),
  personId: integer("person_id"),
  dependentId: varchar("dependent_id", { length: 20 }),
  identificationTypeId: integer("identification_type_id"),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  birthDate: date("birth_date"),
  disabilityTypeId: integer("disability_type_id"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// EXPERIENCIAS LABORALES
export const workExperiences = pgTable("work_experiences", {
  workExpId: integer("work_exp_id"),
  personId: integer("person_id"),
  countryId: varchar("country_id"),
  company: varchar("company", { length: 255 }),
  institutionTypeId: integer("institution_type_id"),
  entryReason: varchar("entry_reason", { length: 255 }),
  exitReason: varchar("exit_reason", { length: 255 }),
  position: varchar("position", { length: 255 }),
  institutionAddress: varchar("institution_address", { length: 500 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  experienceTypeId: integer("experience_type_id"),
  isCurrent: boolean("is_current"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// CAPACITACIONES
export const trainings = pgTable("trainings", {
  trainingId: integer("training_id"),
  personId: integer("person_id"),
  location: varchar("location", { length: 255 }),
  title: varchar("title", { length: 255 }),
  institution: varchar("institution", { length: 255 }),
  knowledgeAreaTypeId: integer("knowledge_area_type_id"),
  eventTypeId: integer("event_type_id"),
  certifiedBy: varchar("certified_by", { length: 255 }),
  certificateTypeId: integer("certificate_type_id"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  hours: integer("hours"),
  approvalTypeId: integer("approval_type_id"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// LIBROS
export const books = pgTable("books", {
  bookId: integer("book_id"),
  personId: integer("person_id"),
  title: varchar("title", { length: 500 }),
  peerReviewed: boolean("peer_reviewed"),
  isbn: varchar("isbn", { length: 50 }),
  publisher: varchar("publisher", { length: 255 }),
  countryId: integer("country_id"),
  city: varchar("city", { length: 255 }),
  knowledgeAreaTypeId: integer("knowledge_area_type_id"),
  subAreaTypeId: integer("sub_area_type_id"),
  areaTypeId: integer("area_type_id"),
  volumeCount: integer("volume_count"),
  participationTypeId: integer("participation_type_id"),
  publicationDate: date("publication_date"),
  utAffiliation: boolean("ut_affiliation"),
  utaSponsorship: boolean("uta_sponsorship"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// CONTACTOS DE EMERGENCIA
export const emergencyContacts = pgTable("emergency_contacts", {
  contactId: integer("contact_id"),
  personId: integer("person_id"),
  identification: varchar("identification", { length: 20 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  relationshipTypeId: integer("relationship_type_id"),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  mobile: varchar("mobile", { length: 20 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ENFERMEDADES CATASTRÓFICAS
export const catastrophicIllnesses = pgTable("catastrophic_illnesses", {
  illnessId: integer("illness_id"),
  personId: integer("person_id"),
  illness: varchar("illness", { length: 255 }),
  iessNumber: varchar("iess_number", { length: 50 }),
  substituteName: varchar("substitute_name", { length: 255 }),
  illnessTypeId: integer("illness_type_id"),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// CUENTAS BANCARIAS
export const bankAccounts = pgTable("bank_accounts", {
  accountId: integer("account_id"),
  personId: integer("person_id"),
  financialInstitution: varchar("financial_institution", { length: 255 }),
  accountTypeId: integer("account_type_id"),
  accountNumber: varchar("account_number", { length: 50 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// INSTITUCIONES
export const institutions = pgTable("institutions", {
  institutionId: integer("institution_id"),
  name: varchar("name", { length: 255 }),
  institutionTypeId: integer("institution_type_id"),
  countryId: integer("country_id"),
  provinceId: integer("province_id"),
  cantonId: integer("canton_id"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ===============================
// SCHEMAS ZOD MANUALES
// ===============================
export const insertRefTypeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  category: z.string().min(1, "La categoría es requerida"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const refTypeSchema = insertRefTypeSchema.extend({
  id: z.number(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// ===============================
// ZOD INSERT SCHEMAS
// ===============================
export const insertPersonSchema = createInsertSchema(people);
export const insertEmployeeSchema = createInsertSchema(employees);
export const insertFacultySchema = createInsertSchema(faculties);
export const insertDepartmentSchema = createInsertSchema(departments);

export const insertScheduleSchema = z.object({
  description: z.string().min(1, "La descripción es requerida"),
  entryTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)"),
  exitTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)"),
  workingDays: z.string().min(1, "Los días laborables son requeridos"),
  requiredHoursPerDay: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Debe ser un número positivo"
  ),
  hasLunchBreak: z.boolean(),
  lunchStart: z.string().nullable().optional(),
  lunchEnd: z.string().nullable().optional(),
  isRotating: z.boolean(),
  rotationPattern: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const insertContractSchema = createInsertSchema(contracts);
export const insertPermissionTypeSchema = createInsertSchema(permissionTypes);
export const insertPermissionSchema = createInsertSchema(permissions);
export const insertVacationSchema = createInsertSchema(vacations);
export const insertAttendancePunchSchema = createInsertSchema(attendancePunches);
export const insertPayrollSchema = createInsertSchema(payroll);
export const insertPayrollLineSchema = createInsertSchema(payrollLines);

// Hoja de vida
export const insertPublicationSchema = createInsertSchema(publications);
export const insertFamilyBurdenSchema = createInsertSchema(familyBurden);
export const insertWorkExperienceSchema = createInsertSchema(workExperiences);
export const insertTrainingSchema = createInsertSchema(trainings);
export const insertBookSchema = createInsertSchema(books);
export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts);
export const insertCatastrophicIllnessSchema = createInsertSchema(catastrophicIllnesses);
export const insertBankAccountSchema = createInsertSchema(bankAccounts);

// ===============================
// TIPOS TS SELECT
// ===============================
export type Person = typeof people.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Faculty = typeof faculties.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type PermissionType = typeof permissionTypes.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type Vacation = typeof vacations.$inferSelect;
export type AttendancePunch = typeof attendancePunches.$inferSelect;
export type Payroll = typeof payroll.$inferSelect;
export type PayrollLine = typeof payrollLines.$inferSelect;

export type Publication = typeof publications.$inferSelect;
export type FamilyBurden = typeof familyBurden.$inferSelect;
export type WorkExperience = typeof workExperiences.$inferSelect;
export type Training = typeof trainings.$inferSelect;
export type Book = typeof books.$inferSelect;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type CatastrophicIllness = typeof catastrophicIllnesses.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;

// ===============================
// TIPOS TS INSERT
// ===============================
export type InsertPerson = typeof people.$inferInsert;
export type InsertEmployee = typeof employees.$inferInsert;
export type InsertFaculty = typeof faculties.$inferInsert;
export type InsertDepartment = typeof departments.$inferInsert;

// Schema manual
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

// Tablas Drizzle
export type InsertContract = typeof contracts.$inferInsert;
export type InsertPermissionType = typeof permissionTypes.$inferInsert;
export type InsertPermission = typeof permissions.$inferInsert;
export type InsertPermiso = typeof permissions.$inferSelect;
export type InsertVacation = typeof vacations.$inferInsert;
export type InsertAttendancePunch = typeof attendancePunches.$inferInsert;
export type InsertPayroll = typeof payroll.$inferInsert;
export type InsertPayrollLine = typeof payrollLines.$inferInsert;

export type InsertPublication = typeof publications.$inferInsert;
export type InsertFamilyBurden = typeof familyBurden.$inferInsert;
export type InsertWorkExperience = typeof workExperiences.$inferInsert;
export type InsertTraining = typeof trainings.$inferInsert;
export type InsertBook = typeof books.$inferInsert;
export type InsertEmergencyContact = typeof emergencyContacts.$inferInsert;
export type InsertCatastrophicIllness = typeof catastrophicIllnesses.$inferInsert;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

// Schemas manuales
export type InsertRefType = z.infer<typeof insertRefTypeSchema>;
export type RefType = z.infer<typeof refTypeSchema>;

// ===============================
// COMPATIBILIDAD FRONTEND SCHEDULE
// ===============================
export type FrontendSchedule = Schedule & {
  scheduleId?: number;
  isActive?: boolean;
};

export function normalizeSchedule(backendSchedule: any): FrontendSchedule {
  const normalizedId = backendSchedule.scheduleId ?? backendSchedule.id;
  if (backendSchedule.scheduleId !== undefined) {
    return {
      ...backendSchedule,
      id: backendSchedule.scheduleId,
      scheduleId: backendSchedule.scheduleId,
      isActive: backendSchedule.isActive ?? true,
    };
  }

  return {
     ...backendSchedule,
    id: normalizedId,
    scheduleId: normalizedId,
    isActive: backendSchedule.isActive ?? true,
  };
}