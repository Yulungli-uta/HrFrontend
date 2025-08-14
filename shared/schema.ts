import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums según especificación WsUtaSystem
export const TipoContrato = ["TITULAR", "OCASIONAL", "CONTRATO", "SERV_PROF"] as const;
export const TipoMarcacion = ["ENTRADA", "SALIDA"] as const;
export const EstadoSolicitud = ["SOLICITADO", "APROBADO", "RECHAZADO", "REGISTRADO"] as const;
export const TipoConcepto = ["INGRESO", "DESCUENTO", "APORTE", "PROVISION"] as const;

// Personas
export const personas = pgTable("personas", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  identificacion: varchar("identificacion", { length: 20 }).notNull().unique(),
  nombres: text("nombres").notNull(),
  apellidos: text("apellidos").notNull(),
  emailInstitucional: text("email_institucional"),
  emailPersonal: text("email_personal"),
});

// Puestos
export const puestos = pgTable("puestos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  nombre: text("nombre").notNull(),
  unidad: text("unidad").notNull(),
});

// Contratos
export const contratos = pgTable("contratos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  puestoId: integer("puesto_id").references(() => puestos.id).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // TITULAR, OCASIONAL, CONTRATO, SERV_PROF
  fechaInicio: date("fecha_inicio").notNull(),
  fechaFin: date("fecha_fin"),
  sueldoBase: decimal("sueldo_base", { precision: 10, scale: 2 }).notNull(),
});

// Planes de Turno
export const planesTurno = pgTable("planes_turno", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  puestoId: integer("puesto_id").references(() => puestos.id).notNull(),
  nombre: text("nombre").notNull(),
});

// Detalles de Turno
export const detallesTurno = pgTable("detalles_turno", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  planTurnoId: integer("plan_turno_id").references(() => planesTurno.id).notNull(),
  diaSemana: integer("dia_semana").notNull(), // 0=Domingo
  horaEntrada: varchar("hora_entrada", { length: 8 }).notNull(), // HH:mm:ss
  horaSalida: varchar("hora_salida", { length: 8 }).notNull(),
  toleranciaMin: integer("tolerancia_min").notNull().default(0),
  descanso: boolean("descanso").default(false),
});

// Asignaciones de Turno
export const asignacionesTurno = pgTable("asignaciones_turno", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  planTurnoId: integer("plan_turno_id").references(() => planesTurno.id).notNull(),
  desde: date("desde").notNull(),
  hasta: date("hasta"),
});

// Marcaciones
export const marcaciones = pgTable("marcaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  tipo: varchar("tipo", { length: 10 }).notNull(), // ENTRADA, SALIDA
  origen: varchar("origen", { length: 20 }).default("WEB"),
  valido: boolean("valido").default(true),
});

// Permisos
export const permisos = pgTable("permisos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  tipo: text("tipo").notNull(), // PERSONAL, MEDICO, etc.
  desde: timestamp("desde").notNull(),
  hasta: timestamp("hasta").notNull(),
  horas: decimal("horas", { precision: 5, scale: 2 }).notNull(),
  estado: varchar("estado", { length: 15 }).default("SOLICITADO"),
  motivo: text("motivo"),
});

// Vacaciones
export const vacaciones = pgTable("vacaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  periodoInicio: date("periodo_inicio").notNull(),
  periodoFin: date("periodo_fin").notNull(),
  diasGenerados: decimal("dias_generados", { precision: 5, scale: 2 }).notNull(),
  diasTomados: decimal("dias_tomados", { precision: 5, scale: 2 }).default("0"),
});

// Recuperaciones
export const recuperaciones = pgTable("recuperaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  permisoId: integer("permiso_id").references(() => permisos.id).notNull(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  desde: timestamp("desde").notNull(),
  hasta: timestamp("hasta").notNull(),
  horas: decimal("horas", { precision: 5, scale: 2 }).notNull(),
  estado: varchar("estado", { length: 15 }).default("SOLICITADO"),
});

// Subrogaciones
export const subrogaciones = pgTable("subrogaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaTitularId: integer("persona_titular_id").references(() => personas.id).notNull(),
  personaSubroganteId: integer("persona_subrogante_id").references(() => personas.id).notNull(),
  puestoId: integer("puesto_id").references(() => puestos.id).notNull(),
  desde: date("desde").notNull(),
  hasta: date("hasta"),
  estado: varchar("estado", { length: 20 }).default("PROGRAMADA"),
});

// Nómina
export const nomina = pgTable("nomina", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  periodo: date("periodo").notNull(), // YYYY-MM-01
  estado: varchar("estado", { length: 20 }).default("ABIERTA"),
});

// Conceptos de Nómina
export const conceptosNomina = pgTable("conceptos_nomina", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  nombre: text("nombre").notNull(),
  tipo: varchar("tipo", { length: 15 }).notNull(), // INGRESO, DESCUENTO, APORTE, PROVISION
  imponible: boolean("imponible").default(true),
});

// Movimientos de Nómina
export const movimientosNomina = pgTable("movimientos_nomina", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  nominaId: integer("nomina_id").references(() => nomina.id).notNull(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  contratoId: integer("contrato_id").references(() => contratos.id),
  conceptoNominaId: integer("concepto_nomina_id").references(() => conceptosNomina.id).notNull(),
  cantidad: decimal("cantidad", { precision: 10, scale: 2 }).default("0"),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  fuente: varchar("fuente", { length: 20 }).default("MANUAL"),
});

// Educación
export const educacion = pgTable("educacion", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  nivel: text("nivel").notNull(),
  titulo: text("titulo").notNull(),
  institucion: text("institucion").notNull(),
  inicio: date("inicio"),
  fin: date("fin"),
});

// Experiencia
export const experiencia = pgTable("experiencia", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  institucion: text("institucion").notNull(),
  cargo: text("cargo").notNull(),
  inicio: date("inicio").notNull(),
  fin: date("fin"),
});

// Certificaciones
export const certificaciones = pgTable("certificaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  nombre: text("nombre").notNull(),
  entidad: text("entidad").notNull(),
  emision: date("emision").notNull(),
  vencimiento: date("vencimiento"),
});

// Publicaciones
export const publicaciones = pgTable("publicaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  tipo: text("tipo").notNull(), // ARTICULO, LIBRO, CAPITULO, CONGRESO
  titulo: text("titulo").notNull(),
  anio: integer("anio").notNull(),
  revistaEditorial: text("revista_editorial"),
  doi: text("doi"),
});

// Zod schemas para validación
export const zPersona = z.object({
  id: z.number().int().nonnegative().optional(),
  identificacion: z.string().min(8).max(20),
  nombres: z.string().min(2).max(100),
  apellidos: z.string().min(2).max(100),
  emailInstitucional: z.string().email().optional().nullable(),
  emailPersonal: z.string().email().optional().nullable(),
});

export const zContrato = z.object({
  id: z.number().int().nonnegative().optional(),
  personaId: z.number().int().positive(),
  puestoId: z.number().int().positive(),
  tipo: z.enum(TipoContrato),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sueldoBase: z.number().min(0),
});

export const zMarcacion = z.object({
  id: z.number().int().nonnegative().optional(),
  personaId: z.number().int().positive(),
  timestamp: z.string().datetime(),
  tipo: z.enum(TipoMarcacion),
  origen: z.string().default("WEB"),
  valido: z.boolean().default(true),
});

export const zPermiso = z.object({
  id: z.number().int().nonnegative().optional(),
  personaId: z.number().int().positive(),
  tipo: z.string().min(1),
  desde: z.string().datetime(),
  hasta: z.string().datetime(),
  horas: z.number().min(0),
  estado: z.enum(EstadoSolicitud).default("SOLICITADO"),
  motivo: z.string().optional().nullable(),
});

// Insert schemas
export const insertPersonaSchema = createInsertSchema(personas);
export const insertContratoSchema = createInsertSchema(contratos);
export const insertMarcacionSchema = createInsertSchema(marcaciones);
export const insertPermisoSchema = createInsertSchema(permisos);
export const insertVacacionSchema = createInsertSchema(vacaciones);
export const insertPublicacionSchema = createInsertSchema(publicaciones);

// Types
export type Persona = typeof personas.$inferSelect;
export type InsertPersona = z.infer<typeof insertPersonaSchema>;

export type Contrato = typeof contratos.$inferSelect;
export type InsertContrato = z.infer<typeof insertContratoSchema>;

export type Marcacion = typeof marcaciones.$inferSelect;
export type InsertMarcacion = z.infer<typeof insertMarcacionSchema>;

export type Permiso = typeof permisos.$inferSelect;
export type InsertPermiso = z.infer<typeof insertPermisoSchema>;

export type Vacacion = typeof vacaciones.$inferSelect;
export type InsertVacacion = z.infer<typeof insertVacacionSchema>;

export type Publicacion = typeof publicaciones.$inferSelect;
export type InsertPublicacion = z.infer<typeof insertPublicacionSchema>;