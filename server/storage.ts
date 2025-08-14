import {
  type User,
  type InsertUser,
  type Persona,
  type InsertPersona,
  type Contrato,
  type InsertContrato,
  type Marcacion,
  type InsertMarcacion,
  type Permiso,
  type InsertPermiso,
  type Vacacion,
  type InsertVacacion,
  type NominaPeriodo,
  type InsertNominaPeriodo,
  type NominaConcepto,
  type InsertNominaConcepto,
  type NominaMovimiento,
  type InsertNominaMovimiento,
  type Publicacion,
  type InsertPublicacion,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Personas
  getPersonas(): Promise<Persona[]>;
  getPersona(id: number): Promise<Persona | undefined>;
  createPersona(persona: InsertPersona): Promise<Persona>;
  updatePersona(id: number, persona: Partial<InsertPersona>): Promise<Persona | undefined>;
  deletePersona(id: number): Promise<boolean>;

  // Contratos
  getContratos(): Promise<Contrato[]>;
  getContratosByPersona(personaId: number): Promise<Contrato[]>;
  createContrato(contrato: InsertContrato): Promise<Contrato>;
  updateContrato(id: number, contrato: Partial<InsertContrato>): Promise<Contrato | undefined>;
  deleteContrato(id: number): Promise<boolean>;

  // Marcaciones
  getMarcaciones(): Promise<Marcacion[]>;
  getMarcacionesByPersona(personaId: number): Promise<Marcacion[]>;
  getMarcacionesByDateRange(desde: string, hasta: string): Promise<Marcacion[]>;
  createMarcacion(marcacion: InsertMarcacion): Promise<Marcacion>;
  deleteMarcacion(id: number): Promise<boolean>;

  // Permisos
  getPermisos(): Promise<Permiso[]>;
  getPermisosByPersona(personaId: number): Promise<Permiso[]>;
  createPermiso(permiso: InsertPermiso): Promise<Permiso>;
  updatePermiso(id: number, permiso: Partial<InsertPermiso>): Promise<Permiso | undefined>;
  deletePermiso(id: number): Promise<boolean>;

  // Vacaciones
  getVacaciones(): Promise<Vacacion[]>;
  getVacacionesByPersona(personaId: number): Promise<Vacacion[]>;
  createVacacion(vacacion: InsertVacacion): Promise<Vacacion>;
  updateVacacion(id: number, vacacion: Partial<InsertVacacion>): Promise<Vacacion | undefined>;
  deleteVacacion(id: number): Promise<boolean>;

  // Nómina
  getNominaPeriodos(): Promise<NominaPeriodo[]>;
  createNominaPeriodo(periodo: InsertNominaPeriodo): Promise<NominaPeriodo>;
  updateNominaPeriodo(id: number, periodo: Partial<InsertNominaPeriodo>): Promise<NominaPeriodo | undefined>;

  getNominaConceptos(): Promise<NominaConcepto[]>;
  createNominaConcepto(concepto: InsertNominaConcepto): Promise<NominaConcepto>;
  updateNominaConcepto(id: number, concepto: Partial<InsertNominaConcepto>): Promise<NominaConcepto | undefined>;

  getNominaMovimientos(): Promise<NominaMovimiento[]>;
  getNominaMovimientosByPeriodo(periodoId: number): Promise<NominaMovimiento[]>;
  createNominaMovimiento(movimiento: InsertNominaMovimiento): Promise<NominaMovimiento>;
  updateNominaMovimiento(id: number, movimiento: Partial<InsertNominaMovimiento>): Promise<NominaMovimiento | undefined>;

  // Publicaciones
  getPublicaciones(): Promise<Publicacion[]>;
  getPublicacion(id: number): Promise<Publicacion | undefined>;
  createPublicacion(publicacion: InsertPublicacion): Promise<Publicacion>;
  updatePublicacion(id: number, publicacion: Partial<InsertPublicacion>): Promise<Publicacion | undefined>;
  deletePublicacion(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private personas: Map<number, Persona>;
  private contratos: Map<number, Contrato>;
  private marcaciones: Map<number, Marcacion>;
  private permisos: Map<number, Permiso>;
  private vacaciones: Map<number, Vacacion>;
  private nominaPeriodos: Map<number, NominaPeriodo>;
  private nominaConceptos: Map<number, NominaConcepto>;
  private nominaMovimientos: Map<number, NominaMovimiento>;
  private publicaciones: Map<number, Publicacion>;
  private nextId: number;

  constructor() {
    this.users = new Map();
    this.personas = new Map();
    this.contratos = new Map();
    this.marcaciones = new Map();
    this.permisos = new Map();
    this.vacaciones = new Map();
    this.nominaPeriodos = new Map();
    this.nominaConceptos = new Map();
    this.nominaMovimientos = new Map();
    this.publicaciones = new Map();
    this.nextId = 1;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Personas
  async getPersonas(): Promise<Persona[]> {
    return Array.from(this.personas.values());
  }

  async getPersona(id: number): Promise<Persona | undefined> {
    return this.personas.get(id);
  }

  async createPersona(insertPersona: InsertPersona): Promise<Persona> {
    const id = this.nextId++;
    const persona: Persona = {
      ...insertPersona,
      id,
      estado: true,
      createdAt: new Date(),
    };
    this.personas.set(id, persona);
    return persona;
  }

  async updatePersona(id: number, persona: Partial<InsertPersona>): Promise<Persona | undefined> {
    const existing = this.personas.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...persona };
    this.personas.set(id, updated);
    return updated;
  }

  async deletePersona(id: number): Promise<boolean> {
    return this.personas.delete(id);
  }

  // Contratos
  async getContratos(): Promise<Contrato[]> {
    return Array.from(this.contratos.values());
  }

  async getContratosByPersona(personaId: number): Promise<Contrato[]> {
    return Array.from(this.contratos.values()).filter(c => c.personaId === personaId);
  }

  async createContrato(insertContrato: InsertContrato): Promise<Contrato> {
    const id = this.nextId++;
    const contrato: Contrato = {
      ...insertContrato,
      id,
      estado: true,
      createdAt: new Date(),
    };
    this.contratos.set(id, contrato);
    return contrato;
  }

  async updateContrato(id: number, contrato: Partial<InsertContrato>): Promise<Contrato | undefined> {
    const existing = this.contratos.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...contrato };
    this.contratos.set(id, updated);
    return updated;
  }

  async deleteContrato(id: number): Promise<boolean> {
    return this.contratos.delete(id);
  }

  // Marcaciones
  async getMarcaciones(): Promise<Marcacion[]> {
    return Array.from(this.marcaciones.values());
  }

  async getMarcacionesByPersona(personaId: number): Promise<Marcacion[]> {
    return Array.from(this.marcaciones.values()).filter(m => m.personaId === personaId);
  }

  async getMarcacionesByDateRange(desde: string, hasta: string): Promise<Marcacion[]> {
    const fechaDesde = new Date(desde);
    const fechaHasta = new Date(hasta);
    return Array.from(this.marcaciones.values()).filter(m => {
      const fecha = new Date(m.timestamp);
      return fecha >= fechaDesde && fecha <= fechaHasta;
    });
  }

  async createMarcacion(insertMarcacion: InsertMarcacion): Promise<Marcacion> {
    const id = this.nextId++;
    const marcacion: Marcacion = {
      ...insertMarcacion,
      id,
      createdAt: new Date(),
    };
    this.marcaciones.set(id, marcacion);
    return marcacion;
  }

  async deleteMarcacion(id: number): Promise<boolean> {
    return this.marcaciones.delete(id);
  }

  // Permisos
  async getPermisos(): Promise<Permiso[]> {
    return Array.from(this.permisos.values());
  }

  async getPermisosByPersona(personaId: number): Promise<Permiso[]> {
    return Array.from(this.permisos.values()).filter(p => p.personaId === personaId);
  }

  async createPermiso(insertPermiso: InsertPermiso): Promise<Permiso> {
    const id = this.nextId++;
    const permiso: Permiso = {
      ...insertPermiso,
      id,
      estado: "pendiente",
      createdAt: new Date(),
    };
    this.permisos.set(id, permiso);
    return permiso;
  }

  async updatePermiso(id: number, permiso: Partial<InsertPermiso>): Promise<Permiso | undefined> {
    const existing = this.permisos.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...permiso };
    this.permisos.set(id, updated);
    return updated;
  }

  async deletePermiso(id: number): Promise<boolean> {
    return this.permisos.delete(id);
  }

  // Vacaciones
  async getVacaciones(): Promise<Vacacion[]> {
    return Array.from(this.vacaciones.values());
  }

  async getVacacionesByPersona(personaId: number): Promise<Vacacion[]> {
    return Array.from(this.vacaciones.values()).filter(v => v.personaId === personaId);
  }

  async createVacacion(insertVacacion: InsertVacacion): Promise<Vacacion> {
    const id = this.nextId++;
    const vacacion: Vacacion = {
      ...insertVacacion,
      id,
      estado: "pendiente",
      createdAt: new Date(),
    };
    this.vacaciones.set(id, vacacion);
    return vacacion;
  }

  async updateVacacion(id: number, vacacion: Partial<InsertVacacion>): Promise<Vacacion | undefined> {
    const existing = this.vacaciones.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...vacacion };
    this.vacaciones.set(id, updated);
    return updated;
  }

  async deleteVacacion(id: number): Promise<boolean> {
    return this.vacaciones.delete(id);
  }

  // Nómina
  async getNominaPeriodos(): Promise<NominaPeriodo[]> {
    return Array.from(this.nominaPeriodos.values());
  }

  async createNominaPeriodo(insertPeriodo: InsertNominaPeriodo): Promise<NominaPeriodo> {
    const id = this.nextId++;
    const periodo: NominaPeriodo = {
      ...insertPeriodo,
      id,
      estado: "abierto",
    };
    this.nominaPeriodos.set(id, periodo);
    return periodo;
  }

  async updateNominaPeriodo(id: number, periodo: Partial<InsertNominaPeriodo>): Promise<NominaPeriodo | undefined> {
    const existing = this.nominaPeriodos.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...periodo };
    this.nominaPeriodos.set(id, updated);
    return updated;
  }

  async getNominaConceptos(): Promise<NominaConcepto[]> {
    return Array.from(this.nominaConceptos.values());
  }

  async createNominaConcepto(insertConcepto: InsertNominaConcepto): Promise<NominaConcepto> {
    const id = this.nextId++;
    const concepto: NominaConcepto = {
      ...insertConcepto,
      id,
      activo: true,
    };
    this.nominaConceptos.set(id, concepto);
    return concepto;
  }

  async updateNominaConcepto(id: number, concepto: Partial<InsertNominaConcepto>): Promise<NominaConcepto | undefined> {
    const existing = this.nominaConceptos.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...concepto };
    this.nominaConceptos.set(id, updated);
    return updated;
  }

  async getNominaMovimientos(): Promise<NominaMovimiento[]> {
    return Array.from(this.nominaMovimientos.values());
  }

  async getNominaMovimientosByPeriodo(periodoId: number): Promise<NominaMovimiento[]> {
    return Array.from(this.nominaMovimientos.values()).filter(m => m.periodoId === periodoId);
  }

  async createNominaMovimiento(insertMovimiento: InsertNominaMovimiento): Promise<NominaMovimiento> {
    const id = this.nextId++;
    const movimiento: NominaMovimiento = {
      ...insertMovimiento,
      id,
    };
    this.nominaMovimientos.set(id, movimiento);
    return movimiento;
  }

  async updateNominaMovimiento(id: number, movimiento: Partial<InsertNominaMovimiento>): Promise<NominaMovimiento | undefined> {
    const existing = this.nominaMovimientos.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...movimiento };
    this.nominaMovimientos.set(id, updated);
    return updated;
  }

  // Publicaciones
  async getPublicaciones(): Promise<Publicacion[]> {
    return Array.from(this.publicaciones.values());
  }

  async getPublicacion(id: number): Promise<Publicacion | undefined> {
    return this.publicaciones.get(id);
  }

  async createPublicacion(insertPublicacion: InsertPublicacion): Promise<Publicacion> {
    const id = this.nextId++;
    const publicacion: Publicacion = {
      ...insertPublicacion,
      id,
      activo: true,
      createdAt: new Date(),
    };
    this.publicaciones.set(id, publicacion);
    return publicacion;
  }

  async updatePublicacion(id: number, publicacion: Partial<InsertPublicacion>): Promise<Publicacion | undefined> {
    const existing = this.publicaciones.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...publicacion };
    this.publicaciones.set(id, updated);
    return updated;
  }

  async deletePublicacion(id: number): Promise<boolean> {
    return this.publicaciones.delete(id);
  }
}

export const storage = new MemStorage();
