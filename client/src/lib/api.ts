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
  NominaPeriodo,
  InsertNominaPeriodo,
  NominaConcepto,
  InsertNominaConcepto,
  NominaMovimiento,
  InsertNominaMovimiento,
  Publicacion,
  InsertPublicacion,
} from "@shared/schema";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

// Personas API
export const PersonasAPI = {
  list: (): Promise<Persona[]> => api("/api/personas"),
  get: (id: number): Promise<Persona> => api(`/api/personas/${id}`),
  create: (data: InsertPersona): Promise<Persona> =>
    api("/api/personas", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<InsertPersona>): Promise<Persona> =>
    api(`/api/personas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number): Promise<void> =>
    api(`/api/personas/${id}`, { method: "DELETE" }),
};

// Contratos API
export const ContratosAPI = {
  list: (): Promise<Contrato[]> => api("/api/contratos"),
  create: (data: InsertContrato): Promise<Contrato> =>
    api("/api/contratos", { method: "POST", body: JSON.stringify(data) }),
};

// Marcaciones API
export const MarcacionesAPI = {
  list: (params?: {
    personaId?: number;
    desde?: string;
    hasta?: string;
  }): Promise<Marcacion[]> => {
    const searchParams = new URLSearchParams();
    if (params?.personaId) searchParams.set("personaId", params.personaId.toString());
    if (params?.desde) searchParams.set("desde", params.desde);
    if (params?.hasta) searchParams.set("hasta", params.hasta);
    const query = searchParams.toString();
    return api(`/api/marcaciones${query ? `?${query}` : ""}`);
  },
  create: (data: InsertMarcacion): Promise<Marcacion> =>
    api("/api/marcaciones", { method: "POST", body: JSON.stringify(data) }),
  remove: (id: number): Promise<void> =>
    api(`/api/marcaciones/${id}`, { method: "DELETE" }),
};

// Permisos API
export const PermisosAPI = {
  list: (personaId?: number): Promise<Permiso[]> => {
    const query = personaId ? `?personaId=${personaId}` : "";
    return api(`/api/permisos${query}`);
  },
  create: (data: InsertPermiso): Promise<Permiso> =>
    api("/api/permisos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<InsertPermiso>): Promise<Permiso> =>
    api(`/api/permisos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
};

// Vacaciones API
export const VacacionesAPI = {
  list: (personaId?: number): Promise<Vacacion[]> => {
    const query = personaId ? `?personaId=${personaId}` : "";
    return api(`/api/vacaciones${query}`);
  },
  create: (data: InsertVacacion): Promise<Vacacion> =>
    api("/api/vacaciones", { method: "POST", body: JSON.stringify(data) }),
};

// Nómina API
export const NominaAPI = {
  periodos: {
    list: (): Promise<NominaPeriodo[]> => api("/api/nomina/periodos"),
    create: (data: InsertNominaPeriodo): Promise<NominaPeriodo> =>
      api("/api/nomina/periodos", { method: "POST", body: JSON.stringify(data) }),
  },
  conceptos: {
    list: (): Promise<NominaConcepto[]> => api("/api/nomina/conceptos"),
    create: (data: InsertNominaConcepto): Promise<NominaConcepto> =>
      api("/api/nomina/conceptos", { method: "POST", body: JSON.stringify(data) }),
  },
  movimientos: {
    list: (periodoId?: number): Promise<NominaMovimiento[]> => {
      const query = periodoId ? `?periodoId=${periodoId}` : "";
      return api(`/api/nomina/movimientos${query}`);
    },
    create: (data: InsertNominaMovimiento): Promise<NominaMovimiento> =>
      api("/api/nomina/movimientos", { method: "POST", body: JSON.stringify(data) }),
  },
};

// Publicaciones API
export const PublicacionesAPI = {
  list: (): Promise<Publicacion[]> => api("/api/publicaciones"),
  get: (id: number): Promise<Publicacion> => api(`/api/publicaciones/${id}`),
  create: (data: InsertPublicacion): Promise<Publicacion> =>
    api("/api/publicaciones", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<InsertPublicacion>): Promise<Publicacion> =>
    api(`/api/publicaciones/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number): Promise<void> =>
    api(`/api/publicaciones/${id}`, { method: "DELETE" }),
};
