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

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// API helper function según especificación WsUtaSystem
async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`${res.status}: ${errorText}`);
  }
  
  // 204 No Content no tiene body
  return res.status === 204 ? (null as any) : res.json();
}

// Personas API - Siguiendo especificación WsUtaSystem
export const PersonasAPI = {
  list: (): Promise<Persona[]> => api("/api/personas"),
  get: (id: number): Promise<Persona> => api(`/api/personas/${id}`),
  create: (data: InsertPersona): Promise<Persona> =>
    api("/api/personas", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Persona): Promise<void> =>
    api(`/api/personas/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
  remove: (id: number): Promise<void> =>
    api(`/api/personas/${id}`, { method: "DELETE" }),
};

// Puestos API
export const PuestosAPI = {
  list: () => api("/api/puestos"),
  get: (id: number) => api(`/api/puestos/${id}`),
  create: (data: any) => api("/api/puestos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => api(`/api/puestos/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
  remove: (id: number) => api(`/api/puestos/${id}`, { method: "DELETE" }),
};

// Contratos API
export const ContratosAPI = {
  list: (): Promise<Contrato[]> => api("/api/contratos"),
  get: (id: number): Promise<Contrato> => api(`/api/contratos/${id}`),
  create: (data: InsertContrato): Promise<Contrato> =>
    api("/api/contratos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Contrato): Promise<void> =>
    api(`/api/contratos/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
  remove: (id: number): Promise<void> =>
    api(`/api/contratos/${id}`, { method: "DELETE" }),
};

// Turnos APIs
export const TurnosAPI = {
  planes: {
    list: () => api("/api/turnos/planes"),
    create: (data: any) => api("/api/turnos/planes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/api/turnos/planes/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
    remove: (id: number) => api(`/api/turnos/planes/${id}`, { method: "DELETE" }),
  },
  detalles: {
    list: () => api("/api/turnos/detalles"),
    create: (data: any) => api("/api/turnos/detalles", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/api/turnos/detalles/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
    remove: (id: number) => api(`/api/turnos/detalles/${id}`, { method: "DELETE" }),
  },
  asignaciones: {
    list: () => api("/api/turnos/asignaciones"),
    create: (data: any) => api("/api/turnos/asignaciones", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/api/turnos/asignaciones/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
    remove: (id: number) => api(`/api/turnos/asignaciones/${id}`, { method: "DELETE" }),
  },
};

// Marcaciones API (Asistencia)
export const MarcacionesAPI = {
  list: (): Promise<Marcacion[]> => api("/api/marcaciones"),
  get: (id: number): Promise<Marcacion> => api(`/api/marcaciones/${id}`),
  create: (data: InsertMarcacion): Promise<Marcacion> =>
    api("/api/marcaciones", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Marcacion): Promise<void> =>
    api(`/api/marcaciones/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
  remove: (id: number): Promise<void> =>
    api(`/api/marcaciones/${id}`, { method: "DELETE" }),
};

// Permisos API
export const PermisosAPI = {
  list: (): Promise<Permiso[]> => api("/api/permisos"),
  get: (id: number): Promise<Permiso> => api(`/api/permisos/${id}`),
  create: (data: InsertPermiso): Promise<Permiso> =>
    api("/api/permisos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Permiso): Promise<void> =>
    api(`/api/permisos/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
  remove: (id: number): Promise<void> =>
    api(`/api/permisos/${id}`, { method: "DELETE" }),
};

// Vacaciones API
export const VacacionesAPI = {
  list: (): Promise<Vacacion[]> => api("/api/vacaciones"),
  get: (id: number): Promise<Vacacion> => api(`/api/vacaciones/${id}`),
  create: (data: InsertVacacion): Promise<Vacacion> =>
    api("/api/vacaciones", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Vacacion): Promise<void> =>
    api(`/api/vacaciones/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
  remove: (id: number): Promise<void> =>
    api(`/api/vacaciones/${id}`, { method: "DELETE" }),
};

// Recuperaciones API
export const RecuperacionesAPI = {
  list: () => api("/api/recuperaciones"),
  get: (id: number) => api(`/api/recuperaciones/${id}`),
  create: (data: any) => api("/api/recuperaciones", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => api(`/api/recuperaciones/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
  remove: (id: number) => api(`/api/recuperaciones/${id}`, { method: "DELETE" }),
};

// Subrogaciones API
export const SubrogacionesAPI = {
  list: () => api("/api/subrogaciones"),
  get: (id: number) => api(`/api/subrogaciones/${id}`),
  create: (data: any) => api("/api/subrogaciones", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => api(`/api/subrogaciones/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
  remove: (id: number) => api(`/api/subrogaciones/${id}`, { method: "DELETE" }),
};

// Nómina API
export const NominaAPI = {
  periodos: {
    list: () => api("/api/nomina/periodos"),
    get: (id: number) => api(`/api/nomina/periodos/${id}`),
    create: (data: any) => api("/api/nomina/periodos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/api/nomina/periodos/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
    remove: (id: number) => api(`/api/nomina/periodos/${id}`, { method: "DELETE" }),
  },
  conceptos: {
    list: () => api("/api/nomina/conceptos"),
    get: (id: number) => api(`/api/nomina/conceptos/${id}`),
    create: (data: any) => api("/api/nomina/conceptos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/api/nomina/conceptos/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
    remove: (id: number) => api(`/api/nomina/conceptos/${id}`, { method: "DELETE" }),
  },
  movimientos: {
    list: () => api("/api/nomina/movimientos"),
    get: (id: number) => api(`/api/nomina/movimientos/${id}`),
    create: (data: any) => api("/api/nomina/movimientos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/api/nomina/movimientos/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
    remove: (id: number) => api(`/api/nomina/movimientos/${id}`, { method: "DELETE" }),
  },
};

// CV APIs
export const CVAPI = {
  educacion: {
    list: () => api("/api/cv/educacion"),
    get: (id: number) => api(`/api/cv/educacion/${id}`),
    create: (data: any) => api("/api/cv/educacion", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/api/cv/educacion/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
    remove: (id: number) => api(`/api/cv/educacion/${id}`, { method: "DELETE" }),
  },
  experiencia: {
    list: () => api("/api/cv/experiencia"),
    get: (id: number) => api(`/api/cv/experiencia/${id}`),
    create: (data: any) => api("/api/cv/experiencia", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/api/cv/experiencia/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
    remove: (id: number) => api(`/api/cv/experiencia/${id}`, { method: "DELETE" }),
  },
  certificaciones: {
    list: () => api("/api/cv/certificaciones"),
    get: (id: number) => api(`/api/cv/certificaciones/${id}`),
    create: (data: any) => api("/api/cv/certificaciones", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/api/cv/certificaciones/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
    remove: (id: number) => api(`/api/cv/certificaciones/${id}`, { method: "DELETE" }),
  },
};

// Publicaciones API
export const PublicacionesAPI = {
  list: (): Promise<Publicacion[]> => api("/api/publicaciones"),
  get: (id: number): Promise<Publicacion> => api(`/api/publicaciones/${id}`),
  create: (data: InsertPublicacion): Promise<Publicacion> =>
    api("/api/publicaciones", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Publicacion): Promise<void> =>
    api(`/api/publicaciones/${id}`, { method: "PUT", body: JSON.stringify({ ...data, id }) }),
  remove: (id: number): Promise<void> =>
    api(`/api/publicaciones/${id}`, { method: "DELETE" }),
};