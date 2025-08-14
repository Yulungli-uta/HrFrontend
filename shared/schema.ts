import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean, bigint, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tipos según nueva especificación
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

// 1. Personas
export const people = pgTable("people", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  idCard: varchar("id_card", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }),
  birthDate: date("birth_date"),
  sex: varchar("sex", { length: 1 }), // 'M'|'F'|'O'
  gender: varchar("gender", { length: 50 }),
  disability: text("disability"),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
});

// 2. Empleados
export const employees = pgTable("employees", {
  id: integer("id").primaryKey().references(() => people.id), // PersonID
  type: varchar("type", { length: 30 }).notNull(), // EmpType
  departmentId: integer("department_id"),
  immediateBossId: integer("immediate_boss_id"),
  hireDate: date("hire_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// 3. Facultades
export const faculties = pgTable("faculties", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 120 }).notNull(),
  deanEmployeeId: integer("dean_employee_id"),
  isActive: boolean("is_active").default(true).notNull(),
});

// 4. Departamentos
export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  facultyId: integer("faculty_id").references(() => faculties.id),
  name: varchar("name", { length: 120 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// 5. Horarios
export const schedules = pgTable("schedules", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  description: text("description").notNull(),
  entryTime: varchar("entry_time", { length: 8 }).notNull(), // HH:mm:ss
  exitTime: varchar("exit_time", { length: 8 }).notNull(),
  workingDays: text("working_days").notNull(), // "1,2,3,4,5"
  requiredHoursPerDay: decimal("required_hours_per_day", { precision: 5, scale: 2 }).notNull(),
  hasLunchBreak: boolean("has_lunch_break").default(true).notNull(),
  lunchStart: varchar("lunch_start", { length: 8 }),
  lunchEnd: varchar("lunch_end", { length: 8 }),
  isRotating: boolean("is_rotating").default(false).notNull(),
  rotationPattern: text("rotation_pattern"),
});

// 6. Asignación de Horarios
export const employeeSchedules = pgTable("employee_schedules", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  scheduleId: integer("schedule_id").references(() => schedules.id).notNull(),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
});

// 7. Contratos
export const contracts = pgTable("contracts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  contractType: varchar("contract_type", { length: 50 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
});

// 8. Historial de Salarios
export const salaryHistory = pgTable("salary_history", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  oldSalary: decimal("old_salary", { precision: 10, scale: 2 }).notNull(),
  newSalary: decimal("new_salary", { precision: 10, scale: 2 }).notNull(),
  changedBy: varchar("changed_by", { length: 100 }).notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  reason: text("reason"),
});

// 9. Tipos de Permiso
export const permissionTypes = pgTable("permission_types", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  deductsFromVacation: boolean("deducts_from_vacation").default(false).notNull(),
  requiresApproval: boolean("requires_approval").default(true).notNull(),
  maxDays: integer("max_days"),
});

// 10. Permisos
export const permissions = pgTable("permissions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  permissionTypeId: integer("permission_type_id").references(() => permissionTypes.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  chargedToVacation: boolean("charged_to_vacation").default(false).notNull(),
  approvedBy: integer("approved_by"),
  justification: text("justification"),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).default("Pending").notNull(),
  vacationId: integer("vacation_id"),
});

// 11. Vacaciones
export const vacations = pgTable("vacations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  daysGranted: integer("days_granted").notNull(),
  daysTaken: integer("days_taken").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("Planned").notNull(),
});

// 12. Picadas (Asistencia)
export const attendancePunches = pgTable("attendance_punches", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  punchTime: timestamp("punch_time").notNull(),
  punchType: varchar("punch_type", { length: 3 }).notNull(), // 'In'|'Out'
  deviceId: varchar("device_id", { length: 50 }),
  longitude: real("longitude"),
  latitude: real("latitude"),
});

// 13. Justificación de Picadas
export const punchJustifications = pgTable("punch_justifications", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  punchId: integer("punch_id").references(() => attendancePunches.id).notNull(),
  bossEmployeeId: integer("boss_employee_id").references(() => employees.id).notNull(),
  reason: text("reason").notNull(),
  approved: boolean("approved").default(false).notNull(),
  approvedAt: timestamp("approved_at"),
});

// 14. Agregados de Asistencia
export const attendanceCalculations = pgTable("attendance_calculations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  workDate: date("work_date").notNull(),
  firstPunchIn: timestamp("first_punch_in"),
  lastPunchOut: timestamp("last_punch_out"),
  totalWorkedMinutes: integer("total_worked_minutes").default(0).notNull(),
  regularMinutes: integer("regular_minutes").default(0).notNull(),
  overtimeMinutes: integer("overtime_minutes").default(0).notNull(),
  nightMinutes: integer("night_minutes").default(0).notNull(),
  holidayMinutes: integer("holiday_minutes").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("Pending").notNull(),
});

// 15. Configuración Horas Extra
export const overtimeConfig = pgTable("overtime_config", {
  overtimeType: varchar("overtime_type", { length: 50 }).primaryKey(),
  factor: decimal("factor", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
});

// 16. Horas Extra
export const overtime = pgTable("overtime", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  workDate: date("work_date").notNull(),
  overtimeType: varchar("overtime_type", { length: 50 }).notNull(),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("Planned").notNull(),
  approvedBy: integer("approved_by"),
  secondApprover: integer("second_approver"),
  factor: decimal("factor", { precision: 5, scale: 2 }).notNull(),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }).notNull(),
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull(),
});

// 17. Plan de Recuperación
export const timeRecoveryPlans = pgTable("time_recovery_plans", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  owedMinutes: integer("owed_minutes").notNull(),
  planDate: date("plan_date").notNull(),
  fromTime: varchar("from_time", { length: 8 }).notNull(), // HH:mm:ss
  toTime: varchar("to_time", { length: 8 }).notNull(),
  reason: text("reason"),
  createdBy: integer("created_by"),
});

// 18. Log de Recuperación
export const timeRecoveryLogs = pgTable("time_recovery_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  recoveryPlanId: integer("recovery_plan_id").references(() => timeRecoveryPlans.id).notNull(),
  executedDate: date("executed_date").notNull(),
  minutesRecovered: integer("minutes_recovered").notNull(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
});

// 19. Subrogaciones
export const subrogations = pgTable("subrogations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  subrogatedEmployeeId: integer("subrogated_employee_id").references(() => employees.id).notNull(),
  subrogatingEmployeeId: integer("subrogating_employee_id").references(() => employees.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  permissionId: integer("permission_id").references(() => permissions.id),
  vacationId: integer("vacation_id").references(() => vacations.id),
  reason: text("reason"),
});

// 20. Movimientos de Personal
export const personnelMovements = pgTable("personnel_movements", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  originDepartmentId: integer("origin_department_id").references(() => departments.id),
  destinationDepartmentId: integer("destination_department_id").references(() => departments.id).notNull(),
  movementDate: date("movement_date").notNull(),
  movementType: varchar("movement_type", { length: 20 }).notNull(),
  documentLocation: text("document_location"),
  reason: text("reason"),
  createdBy: integer("created_by"),
});

// 21. Nómina
export const payroll = pgTable("payroll", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  period: varchar("period", { length: 7 }).notNull(), // "YYYY-MM"
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("Pending").notNull(),
  paymentDate: date("payment_date"),
  bankAccount: varchar("bank_account", { length: 50 }),
});

// 22. Detalle de Nómina
export const payrollLines = pgTable("payroll_lines", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  payrollId: integer("payroll_id").references(() => payroll.id).notNull(),
  lineType: varchar("line_type", { length: 20 }).notNull(),
  concept: varchar("concept", { length: 100 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitValue: decimal("unit_value", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
});

// 23. Auditoría
export const audit = pgTable("audit", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  recordID: varchar("record_id", { length: 100 }).notNull(),
  userName: varchar("user_name", { length: 100 }).notNull(),
  dateTime: timestamp("date_time").defaultNow().notNull(),
  details: text("details"),
});

// Esquemas de inserción con Zod
export const insertPersonSchema = createInsertSchema(people).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees);
export const insertFacultySchema = createInsertSchema(faculties).omit({ id: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true });
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true });
export const insertPermissionTypeSchema = createInsertSchema(permissionTypes).omit({ id: true });
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true, requestDate: true });
export const insertVacationSchema = createInsertSchema(vacations).omit({ id: true });
export const insertAttendancePunchSchema = createInsertSchema(attendancePunches).omit({ id: true });
export const insertPayrollSchema = createInsertSchema(payroll).omit({ id: true });
export const insertPayrollLineSchema = createInsertSchema(payrollLines).omit({ id: true });

// Tipos de selección
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

// Tipos de inserción
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type InsertFaculty = z.infer<typeof insertFacultySchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type InsertPermissionType = z.infer<typeof insertPermissionTypeSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type InsertVacation = z.infer<typeof insertVacationSchema>;
export type InsertAttendancePunch = z.infer<typeof insertAttendancePunchSchema>;
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type InsertPayrollLine = z.infer<typeof insertPayrollLineSchema>;

// ===============================
// SISTEMA DE HOJA DE VIDA
// ===============================

// Publicaciones
export const publications = pgTable("publications", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personId: integer("person_id").references(() => people.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  journal: varchar("journal", { length: 255 }),
  publicationDate: date("publication_date"),
  issn: varchar("issn", { length: 50 }),
  doi: varchar("doi", { length: 100 }),
  url: varchar("url", { length: 500 }),
  type: varchar("type", { length: 100 }), // Artículo científico, libro, capítulo, etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cargas familiares
export const familyMembers = pgTable("family_members", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personId: integer("person_id").references(() => people.id).notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  idCard: varchar("id_card", { length: 20 }),
  birthDate: date("birth_date"),
  relationship: varchar("relationship", { length: 100 }).notNull(), // hijo/a, cónyuge, etc.
  hasDisability: boolean("has_disability").default(false),
  disabilityType: varchar("disability_type", { length: 255 }),
  disabilityPercentage: integer("disability_percentage"),
  isStudying: boolean("is_studying").default(false),
  educationInstitution: varchar("education_institution", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Experiencias laborales
export const workExperiences = pgTable("work_experiences", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personId: integer("person_id").references(() => people.id).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isCurrent: boolean("is_current").default(false),
  duties: text("duties"),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  reasonForLeaving: varchar("reason_for_leaving", { length: 255 }),
  referenceContact: varchar("reference_contact", { length: 255 }),
  referenceEmail: varchar("reference_email", { length: 255 }),
  referencePhone: varchar("reference_phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Capacitaciones y cursos
export const trainings = pgTable("trainings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personId: integer("person_id").references(() => people.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  institution: varchar("institution", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // curso, seminario, diplomado, etc.
  modality: varchar("modality", { length: 50 }), // presencial, virtual, semipresencial
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  durationHours: integer("duration_hours"),
  hasCertificate: boolean("has_certificate").default(false),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  grade: varchar("grade", { length: 50 }),
  description: text("description"),
  fileUrl: varchar("file_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Esquemas de inserción para hoja de vida
export const insertPublicationSchema = createInsertSchema(publications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkExperienceSchema = createInsertSchema(workExperiences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainingSchema = createInsertSchema(trainings).omit({ id: true, createdAt: true, updatedAt: true });

// Tipos de selección para hoja de vida
export type Publication = typeof publications.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type WorkExperience = typeof workExperiences.$inferSelect;
export type Training = typeof trainings.$inferSelect;

// Tipos de inserción para hoja de vida
export type InsertPublication = z.infer<typeof insertPublicationSchema>;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type InsertWorkExperience = z.infer<typeof insertWorkExperienceSchema>;
export type InsertTraining = z.infer<typeof insertTrainingSchema>;