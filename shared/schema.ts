import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Personas
export const personas = pgTable("personas", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  identificacion: varchar("identificacion", { length: 20 }).notNull().unique(),
  nombres: text("nombres").notNull(),
  apellidos: text("apellidos").notNull(),
  emailInstitucional: text("email_institucional"),
  telefono: varchar("telefono", { length: 20 }),
  fechaNacimiento: date("fecha_nacimiento"),
  estado: boolean("estado").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Puestos
export const puestos = pgTable("puestos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  sueldoBase: decimal("sueldo_base", { precision: 10, scale: 2 }),
});

// Contratos
export const contratos = pgTable("contratos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  puestoId: integer("puesto_id").references(() => puestos.id).notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // "indefinido", "temporal", "proyecto"
  fechaInicio: date("fecha_inicio").notNull(),
  fechaFin: date("fecha_fin"),
  sueldoBase: decimal("sueldo_base", { precision: 10, scale: 2 }).notNull(),
  estado: boolean("estado").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Turnos Planes
export const turnosPlanes = pgTable("turnos_planes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  horaInicio: text("hora_inicio").notNull(),
  horaFin: text("hora_fin").notNull(),
});

// Turnos Asignaciones
export const turnosAsignaciones = pgTable("turnos_asignaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  planId: integer("plan_id").references(() => turnosPlanes.id).notNull(),
  fechaInicio: date("fecha_inicio").notNull(),
  fechaFin: date("fecha_fin"),
  estado: boolean("estado").default(true),
});

// Marcaciones
export const marcaciones = pgTable("marcaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "entrada", "salida", "descanso_inicio", "descanso_fin"
  ubicacion: text("ubicacion"),
  observaciones: text("observaciones"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Permisos
export const permisos = pgTable("permisos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // "medico", "personal", "compensatorio"
  fechaDesde: date("fecha_desde").notNull(),
  fechaHasta: date("fecha_hasta").notNull(),
  horas: integer("horas"),
  motivo: text("motivo"),
  estado: varchar("estado", { length: 20 }).default("pendiente"), // "pendiente", "aprobado", "rechazado"
  observaciones: text("observaciones"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vacaciones
export const vacaciones = pgTable("vacaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  fechaDesde: date("fecha_desde").notNull(),
  fechaHasta: date("fecha_hasta").notNull(),
  diasSolicitados: integer("dias_solicitados").notNull(),
  estado: varchar("estado", { length: 20 }).default("pendiente"),
  observaciones: text("observaciones"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Nómina Períodos
export const nominaPeriodos = pgTable("nomina_periodos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  nombre: text("nombre").notNull(),
  fechaInicio: date("fecha_inicio").notNull(),
  fechaFin: date("fecha_fin").notNull(),
  estado: varchar("estado", { length: 20 }).default("abierto"), // "abierto", "cerrado", "procesado"
});

// Nómina Conceptos
export const nominaConceptos = pgTable("nomina_conceptos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  nombre: text("nombre").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "ingreso", "descuento"
  formula: text("formula"),
  activo: boolean("activo").default(true),
});

// Nómina Movimientos
export const nominaMovimientos = pgTable("nomina_movimientos", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  periodoId: integer("periodo_id").references(() => nominaPeriodos.id).notNull(),
  conceptoId: integer("concepto_id").references(() => nominaConceptos.id).notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  observaciones: text("observaciones"),
});

// Publicaciones
export const publicaciones = pgTable("publicaciones", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  titulo: text("titulo").notNull(),
  contenido: text("contenido").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // "noticia", "comunicado", "evento"
  fechaPublicacion: date("fecha_publicacion").notNull(),
  activo: boolean("activo").default(true),
  autorId: integer("autor_id").references(() => personas.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertPersonaSchema = createInsertSchema(personas).omit({ 
  id: true, 
  createdAt: true 
});

export const insertContratoSchema = createInsertSchema(contratos).omit({
  id: true,
  createdAt: true
});

export const insertMarcacionSchema = createInsertSchema(marcaciones).omit({
  id: true,
  createdAt: true
});

export const insertPermisoSchema = createInsertSchema(permisos).omit({
  id: true,
  createdAt: true
});

export const insertVacacionSchema = createInsertSchema(vacaciones).omit({
  id: true,
  createdAt: true
});

export const insertNominaPeriodoSchema = createInsertSchema(nominaPeriodos).omit({
  id: true
});

export const insertNominaConceptoSchema = createInsertSchema(nominaConceptos).omit({
  id: true
});

export const insertNominaMovimientoSchema = createInsertSchema(nominaMovimientos).omit({
  id: true
});

export const insertPublicacionSchema = createInsertSchema(publicaciones).omit({
  id: true,
  createdAt: true
});

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

export type NominaPeriodo = typeof nominaPeriodos.$inferSelect;
export type InsertNominaPeriodo = z.infer<typeof insertNominaPeriodoSchema>;

export type NominaConcepto = typeof nominaConceptos.$inferSelect;
export type InsertNominaConcepto = z.infer<typeof insertNominaConceptoSchema>;

export type NominaMovimiento = typeof nominaMovimientos.$inferSelect;
export type InsertNominaMovimiento = z.infer<typeof insertNominaMovimientoSchema>;

export type Publicacion = typeof publicaciones.$inferSelect;
export type InsertPublicacion = z.infer<typeof insertPublicacionSchema>;

// Keep existing user schema for compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
