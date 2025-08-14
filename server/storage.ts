import type {
  Persona,
  InsertPersona,
  Contrato,
  InsertContrato,
  Marcacion,
  InsertMarcacion,
  Permiso,
  InsertPermiso,
  Vacacion,
  InsertVacacion,
  Publicacion,
  InsertPublicacion,
} from "@shared/schema";

export interface IStorage {
  // Personas
  getPersonas(): Promise<Persona[]>;
  getPersona(id: number): Promise<Persona | undefined>;
  createPersona(insertPersona: InsertPersona): Promise<Persona>;
  updatePersona(id: number, updatePersona: Partial<InsertPersona>): Promise<Persona | null>;
  deletePersona(id: number): Promise<boolean>;

  // Contratos
  getContratos(): Promise<Contrato[]>;
  getContrato(id: number): Promise<Contrato | undefined>;
  createContrato(insertContrato: InsertContrato): Promise<Contrato>;
  updateContrato(id: number, updateContrato: Partial<InsertContrato>): Promise<Contrato | null>;
  deleteContrato(id: number): Promise<boolean>;

  // Marcaciones
  getMarcaciones(): Promise<Marcacion[]>;
  getMarcacion(id: number): Promise<Marcacion | undefined>;
  createMarcacion(insertMarcacion: InsertMarcacion): Promise<Marcacion>;
  updateMarcacion(id: number, updateMarcacion: Partial<InsertMarcacion>): Promise<Marcacion | null>;
  deleteMarcacion(id: number): Promise<boolean>;

  // Permisos
  getPermisos(): Promise<Permiso[]>;
  getPermiso(id: number): Promise<Permiso | undefined>;
  createPermiso(insertPermiso: InsertPermiso): Promise<Permiso>;
  updatePermiso(id: number, updatePermiso: Partial<InsertPermiso>): Promise<Permiso | null>;
  deletePermiso(id: number): Promise<boolean>;

  // Vacaciones
  getVacaciones(): Promise<Vacacion[]>;
  getVacacion(id: number): Promise<Vacacion | undefined>;
  createVacacion(insertVacacion: InsertVacacion): Promise<Vacacion>;
  updateVacacion(id: number, updateVacacion: Partial<InsertVacacion>): Promise<Vacacion | null>;
  deleteVacacion(id: number): Promise<boolean>;

  // Publicaciones
  getPublicaciones(): Promise<Publicacion[]>;
  getPublicacion(id: number): Promise<Publicacion | undefined>;
  createPublicacion(insertPublicacion: InsertPublicacion): Promise<Publicacion>;
  updatePublicacion(id: number, updatePublicacion: Partial<InsertPublicacion>): Promise<Publicacion | null>;
  deletePublicacion(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private personas = new Map<number, Persona>();
  private contratos = new Map<number, Contrato>();
  private marcaciones = new Map<number, Marcacion>();
  private permisos = new Map<number, Permiso>();
  private vacaciones = new Map<number, Vacacion>();
  private publicaciones = new Map<number, Publicacion>();
  private nextId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Crear personas de ejemplo según especificación WsUtaSystem
    const persona1: Persona = {
      id: 1,
      identificacion: "1802890176",
      nombres: "Henry",
      apellidos: "Flores",
      emailInstitucional: "henry@uta.edu.ec",
      emailPersonal: null,
    };

    const persona2: Persona = {
      id: 2,
      identificacion: "1712345678",
      nombres: "María",
      apellidos: "González",
      emailInstitucional: "maria.gonzalez@uta.edu.ec",
      emailPersonal: "maria@gmail.com",
    };

    const persona3: Persona = {
      id: 3,
      identificacion: "1598765432",
      nombres: "Carlos",
      apellidos: "Rodríguez",
      emailInstitucional: "carlos.rodriguez@uta.edu.ec",
      emailPersonal: null,
    };

    this.personas.set(1, persona1);
    this.personas.set(2, persona2);
    this.personas.set(3, persona3);

    // Crear contratos de ejemplo
    const contrato1: Contrato = {
      id: 1,
      personaId: 1,
      puestoId: 1,
      tipo: "TITULAR",
      fechaInicio: "2025-01-01",
      fechaFin: null,
      sueldoBase: "1200.00",
    };

    const contrato2: Contrato = {
      id: 2,
      personaId: 2,
      puestoId: 2,
      tipo: "OCASIONAL",
      fechaInicio: "2025-02-01",
      fechaFin: "2025-12-31",
      sueldoBase: "800.00",
    };

    this.contratos.set(1, contrato1);
    this.contratos.set(2, contrato2);

    // Crear marcaciones de ejemplo
    const marcacion1: Marcacion = {
      id: 1,
      personaId: 1,
      timestamp: new Date("2025-08-14T08:00:00Z"),
      tipo: "ENTRADA",
      origen: "WEB",
      valido: true,
    };

    const marcacion2: Marcacion = {
      id: 2,
      personaId: 1,
      timestamp: new Date("2025-08-14T12:00:00Z"),
      tipo: "SALIDA",
      origen: "WEB",
      valido: true,
    };

    this.marcaciones.set(1, marcacion1);
    this.marcaciones.set(2, marcacion2);

    // Crear permisos de ejemplo
    const permiso1: Permiso = {
      id: 1,
      personaId: 1,
      tipo: "MEDICO",
      desde: new Date("2025-08-14T08:00:00Z"),
      hasta: new Date("2025-08-14T12:00:00Z"),
      horas: "4.00",
      estado: "SOLICITADO",
      motivo: "Cita médica",
    };

    this.permisos.set(1, permiso1);

    // Crear vacaciones de ejemplo
    const vacacion1: Vacacion = {
      id: 1,
      personaId: 1,
      periodoInicio: "2025-01-01",
      periodoFin: "2025-12-31",
      diasGenerados: "30.00",
      diasTomados: "5.00",
    };

    this.vacaciones.set(1, vacacion1);

    // Crear publicaciones de ejemplo
    const publicacion1: Publicacion = {
      id: 1,
      personaId: 1,
      tipo: "ARTICULO",
      titulo: "Redes de alto rendimiento en campus",
      anio: 2024,
      revistaEditorial: "IEEE Network",
      doi: "10.1234/uta.2024.001",
    };

    this.publicaciones.set(1, publicacion1);

    this.nextId = 4; // Continuar desde el siguiente ID disponible
  }

  // Personas methods
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
      emailInstitucional: insertPersona.emailInstitucional || null,
      emailPersonal: insertPersona.emailPersonal || null,
    };
    this.personas.set(id, persona);
    return persona;
  }

  async updatePersona(id: number, updatePersona: Partial<InsertPersona>): Promise<Persona | null> {
    const persona = this.personas.get(id);
    if (!persona) return null;

    const updated: Persona = { ...persona, ...updatePersona };
    this.personas.set(id, updated);
    return updated;
  }

  async deletePersona(id: number): Promise<boolean> {
    return this.personas.delete(id);
  }

  // Contratos methods
  async getContratos(): Promise<Contrato[]> {
    return Array.from(this.contratos.values());
  }

  async getContrato(id: number): Promise<Contrato | undefined> {
    return this.contratos.get(id);
  }

  async createContrato(insertContrato: InsertContrato): Promise<Contrato> {
    const id = this.nextId++;
    const contrato: Contrato = {
      ...insertContrato,
      id,
      fechaFin: insertContrato.fechaFin || null,
      sueldoBase: insertContrato.sueldoBase.toString(),
    };
    this.contratos.set(id, contrato);
    return contrato;
  }

  async updateContrato(id: number, updateContrato: Partial<InsertContrato>): Promise<Contrato | null> {
    const contrato = this.contratos.get(id);
    if (!contrato) return null;

    const updated: Contrato = { 
      ...contrato, 
      ...updateContrato,
      sueldoBase: updateContrato.sueldoBase ? updateContrato.sueldoBase.toString() : contrato.sueldoBase,
    };
    this.contratos.set(id, updated);
    return updated;
  }

  async deleteContrato(id: number): Promise<boolean> {
    return this.contratos.delete(id);
  }

  // Marcaciones methods
  async getMarcaciones(): Promise<Marcacion[]> {
    return Array.from(this.marcaciones.values());
  }

  async getMarcacion(id: number): Promise<Marcacion | undefined> {
    return this.marcaciones.get(id);
  }

  async createMarcacion(insertMarcacion: InsertMarcacion): Promise<Marcacion> {
    const id = this.nextId++;
    const marcacion: Marcacion = {
      ...insertMarcacion,
      id,
      origen: insertMarcacion.origen || "WEB",
      valido: insertMarcacion.valido !== undefined ? insertMarcacion.valido : true,
    };
    this.marcaciones.set(id, marcacion);
    return marcacion;
  }

  async updateMarcacion(id: number, updateMarcacion: Partial<InsertMarcacion>): Promise<Marcacion | null> {
    const marcacion = this.marcaciones.get(id);
    if (!marcacion) return null;

    const updated: Marcacion = { ...marcacion, ...updateMarcacion };
    this.marcaciones.set(id, updated);
    return updated;
  }

  async deleteMarcacion(id: number): Promise<boolean> {
    return this.marcaciones.delete(id);
  }

  // Permisos methods
  async getPermisos(): Promise<Permiso[]> {
    return Array.from(this.permisos.values());
  }

  async getPermiso(id: number): Promise<Permiso | undefined> {
    return this.permisos.get(id);
  }

  async createPermiso(insertPermiso: InsertPermiso): Promise<Permiso> {
    const id = this.nextId++;
    const permiso: Permiso = {
      ...insertPermiso,
      id,
      horas: insertPermiso.horas.toString(),
      estado: insertPermiso.estado || "SOLICITADO",
      motivo: insertPermiso.motivo || null,
    };
    this.permisos.set(id, permiso);
    return permiso;
  }

  async updatePermiso(id: number, updatePermiso: Partial<InsertPermiso>): Promise<Permiso | null> {
    const permiso = this.permisos.get(id);
    if (!permiso) return null;

    const updated: Permiso = { 
      ...permiso, 
      ...updatePermiso,
      horas: updatePermiso.horas ? updatePermiso.horas.toString() : permiso.horas,
    };
    this.permisos.set(id, updated);
    return updated;
  }

  async deletePermiso(id: number): Promise<boolean> {
    return this.permisos.delete(id);
  }

  // Vacaciones methods
  async getVacaciones(): Promise<Vacacion[]> {
    return Array.from(this.vacaciones.values());
  }

  async getVacacion(id: number): Promise<Vacacion | undefined> {
    return this.vacaciones.get(id);
  }

  async createVacacion(insertVacacion: InsertVacacion): Promise<Vacacion> {
    const id = this.nextId++;
    const vacacion: Vacacion = {
      ...insertVacacion,
      id,
      diasGenerados: insertVacacion.diasGenerados.toString(),
      diasTomados: insertVacacion.diasTomados ? insertVacacion.diasTomados.toString() : "0",
    };
    this.vacaciones.set(id, vacacion);
    return vacacion;
  }

  async updateVacacion(id: number, updateVacacion: Partial<InsertVacacion>): Promise<Vacacion | null> {
    const vacacion = this.vacaciones.get(id);
    if (!vacacion) return null;

    const updated: Vacacion = { 
      ...vacacion, 
      ...updateVacacion,
      diasGenerados: updateVacacion.diasGenerados ? updateVacacion.diasGenerados.toString() : vacacion.diasGenerados,
      diasTomados: updateVacacion.diasTomados ? updateVacacion.diasTomados.toString() : vacacion.diasTomados,
    };
    this.vacaciones.set(id, updated);
    return updated;
  }

  async deleteVacacion(id: number): Promise<boolean> {
    return this.vacaciones.delete(id);
  }

  // Publicaciones methods
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
      revistaEditorial: insertPublicacion.revistaEditorial || null,
      doi: insertPublicacion.doi || null,
    };
    this.publicaciones.set(id, publicacion);
    return publicacion;
  }

  async updatePublicacion(id: number, updatePublicacion: Partial<InsertPublicacion>): Promise<Publicacion | null> {
    const publicacion = this.publicaciones.get(id);
    if (!publicacion) return null;

    const updated: Publicacion = { ...publicacion, ...updatePublicacion };
    this.publicaciones.set(id, updated);
    return updated;
  }

  async deletePublicacion(id: number): Promise<boolean> {
    return this.publicaciones.delete(id);
  }
}

export const storage = new MemStorage();