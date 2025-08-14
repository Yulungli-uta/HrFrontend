
# FRONTEND SPEC — WsUtaSystem (React)

> Documento listo para IA (Replit u otro) que describe **todos los recursos, campos, validaciones y ejemplos** para construir el frontend de Gestión de Talento Humano que consume la API **WsUtaSystem**.

## 0) Base
- **API base (local):** `http://localhost:5000`
- **Swagger UI:** `/swagger` → **Esquema JSON:** `/swagger/v1/swagger.json`
- **Formato JSON:** camelCase
- **CORS:** habilitado para `http://localhost:3000`, `http://localhost:5173`, `https://*.replit.app`
- **Fechas:**
  - `DateOnly` → enviar y mostrar como **YYYY-MM-DD**.
  - `DateTime` → **ISO 8601** (ej: `2025-08-14T12:30:00Z`).

---

## 1) Modelos, campos y validaciones

### 1.1 Persona
```ts
interface Persona {
  id: number;                         // autogenerado en BD
  identificacion: string;             // requerido, 10 dígitos (cédula EC) o pasaporte
  nombres: string;                    // requerido, 2–100 chars
  apellidos: string;                  // requerido, 2–100 chars
  emailInstitucional?: string | null; // opcional, email válido @uta.edu.ec idealmente
  emailPersonal?: string | null;      // opcional, email válido
}
```
**Validaciones sugeridas frontend:**
- `identificacion`: `^[0-9A-Za-z]{8,20}$` (o algoritmo cédula EC si aplica).
- `nombres/apellidos`: longitud 2–100, solo letras/espacios.
- `email*`: formato email.

**Endpoints:**
- `GET /api/personas`
- `GET /api/personas/{id}`
- `POST /api/personas`
- `PUT /api/personas/{id}`
- `DELETE /api/personas/{id}`

### 1.2 Puesto
```ts
interface Puesto {
  id: number;
  nombre: string; // requerido, 2–100
  unidad: string; // requerido, 2–100 (texto simple; en versión posterior será catálogo UNIDAD)
}
```
**Endpoints:** `/api/puestos` (CRUD)

### 1.3 Contrato
```ts
type TipoContrato = "TITULAR" | "OCASIONAL" | "CONTRATO" | "SERV_PROF";
interface Contrato {
  id: number;
  personaId: number;                 // FK Persona
  puestoId: number;                  // FK Puesto
  tipo: TipoContrato;                // requerido (enum)
  fechaInicio: string;               // YYYY-MM-DD
  fechaFin?: string | null;          // YYYY-MM-DD (opcional)
  sueldoBase: number;                // >= 0
}
```
**Reglas UI:** evitar solapes de contratos activos por persona.  
**Endpoints:** `/api/contratos` (CRUD)

### 1.4 Turnos
```ts
interface PlanTurno { id: number; puestoId: number; nombre: string; }
interface DetalleTurno {
  id: number;
  planTurnoId: number;
  diaSemana: 0|1|2|3|4|5|6;      // 0=Domingo
  horaEntrada: string;           // "HH:mm:ss" (recomendado "HH:mm")
  horaSalida: string;
  toleranciaMin: number;         // >= 0
  descanso: boolean;
}
interface AsignacionTurno {
  id: number;
  personaId: number;
  planTurnoId: number;
  desde: string;                 // YYYY-MM-DD
  hasta?: string | null;         // YYYY-MM-DD
}
```
**Endpoints:**
- `/api/turnos/planes` (CRUD)
- `/api/turnos/detalles` (CRUD)
- `/api/turnos/asignaciones` (CRUD)

### 1.5 Marcación (Asistencia)
```ts
type TipoMarcacion = "ENTRADA" | "SALIDA";
interface Marcacion {
  id: number;
  personaId: number;
  timestamp: string;     // ISO 8601
  tipo: TipoMarcacion;
  origen: string;        // por defecto "WEB"
  valido: boolean;       // por defecto true
}
```
**Endpoints:** `/api/marcaciones` (CRUD)

### 1.6 Permisos / Vacaciones / Recuperaciones
```ts
type EstadoSolicitud = "SOLICITADO" | "APROBADO" | "RECHAZADO" | "REGISTRADO";

interface Permiso {
  id: number;
  personaId: number;
  tipo: string;          // ejemplo "PERSONAL"|"MEDICO"|... (texto libre en esta versión)
  desde: string;         // ISO 8601
  hasta: string;         // ISO 8601 (>= desde)
  horas: number;         // >= 0
  estado: EstadoSolicitud;
  motivo?: string | null;
}

interface Vacacion {
  id: number;
  personaId: number;
  periodoInicio: string; // YYYY-MM-DD
  periodoFin: string;    // YYYY-MM-DD
  diasGenerados: number; // >= 0
  diasTomados: number;   // >= 0
}

interface Recuperacion {
  id: number;
  permisoId: number;     // FK Permiso
  personaId: number;     // FK Persona
  desde: string;         // ISO 8601
  hasta: string;         // ISO 8601
  horas: number;         // >= 0
  estado: EstadoSolicitud;
}
```
**Endpoints:**
- `/api/permisos` (CRUD)
- `/api/vacaciones` (CRUD)
- `/api/recuperaciones` (CRUD)

### 1.7 Subrogación
```ts
interface Subrogacion {
  id: number;
  personaTitularId: number;     // FK Persona
  personaSubroganteId: number;  // FK Persona
  puestoId: number;             // FK Puesto
  desde: string;                // YYYY-MM-DD
  hasta?: string | null;        // YYYY-MM-DD
  estado: string;               // "VIGENTE" | "PROGRAMADA" | "TERMINADA" (texto libre en esta versión)
}
```
**Endpoints:** `/api/subrogaciones` (CRUD)

### 1.8 Nómina
```ts
type TipoConcepto = "INGRESO" | "DESCUENTO" | "APORTE" | "PROVISION";

interface Nomina {
  id: number;
  periodo: string;     // YYYY-MM-DD (día 1 del mes)
  estado: string;      // "ABIERTA"|"CALCULADA"|"CERRADA"|"PAGADA" (texto libre aquí)
}
interface ConceptoNomina {
  id: number;
  codigo: string;      // requerido, único deseable (UI validarlo)
  nombre: string;      // requerido
  tipo: TipoConcepto;  // enum
  imponible: boolean;  // default true
}
interface MovimientoNomina {
  id: number;
  nominaId: number;        // FK Nomina
  personaId: number;       // FK Persona
  contratoId?: number|null;// FK Contrato
  conceptoNominaId: number;// FK ConceptoNomina
  cantidad: number;        // >= 0
  valor: number;           // puede ser negativo para descuentos
  fuente: string;          // "MANUAL" | "CALCULO"
}
```
**Endpoints:**
- `/api/nomina/periodos` (CRUD)
- `/api/nomina/conceptos` (CRUD)
- `/api/nomina/movimientos` (CRUD)

> **Nota:** La versión actual no incluye el endpoint `POST /api/nomina/{id}/calcular` en este proyecto; si se habilita, documentarlo aquí.

### 1.9 CV / Publicaciones
```ts
interface Educacion {
  id: number;
  personaId: number;
  nivel: string;         // p.ej. "Maestría"
  titulo: string;
  institucion: string;
  inicio?: string|null;  // YYYY-MM-DD
  fin?: string|null;     // YYYY-MM-DD
}
interface Experiencia {
  id: number;
  personaId: number;
  institucion: string;
  cargo: string;
  inicio: string;        // YYYY-MM-DD
  fin?: string|null;     // YYYY-MM-DD
}
interface Certificacion {
  id: number;
  personaId: number;
  nombre: string;
  entidad: string;
  emision: string;       // YYYY-MM-DD
  vencimiento?: string|null; // YYYY-MM-DD
}
interface Publicacion {
  id: number;
  personaId: number;
  tipo: string;          // "ARTICULO"|"LIBRO"|"CAPITULO"|"CONGRESO" (libre en esta versión)
  titulo: string;
  anio: number;          // 1900..2100
  revistaEditorial?: string|null;
  doi?: string|null;
}
```
**Endpoints:**
- `/api/cv/educacion` (CRUD)
- `/api/cv/experiencia` (CRUD)
- `/api/cv/certificaciones` (CRUD)
- `/api/publicaciones` (CRUD)

---

## 2) Especificación de endpoints (CRUD genérico)
Para todos los recursos anteriores se sigue el mismo patrón:

- **Listar**: `GET /api/<recurso>` → `200 OK` `[ {...}, ... ]`
- **Obtener**: `GET /api/<recurso>/{id}` → `200 OK` `{...}` | `404 NotFound`
- **Crear**: `POST /api/<recurso>` → body: objeto **sin `id`** → `201 Created` + Location header
- **Actualizar**: `PUT /api/<recurso>/{id}` → body: objeto **con `id` = ruta** → `204 NoContent`
- **Eliminar**: `DELETE /api/<recurso>/{id}` → `204 NoContent`

**Códigos de error comunes**: `400 BadRequest`, `404 NotFound`, `500 Internal Server Error`.

---

## 3) Tipos TypeScript y validaciones (zod)

### 3.1 Tipos y esquemas (extracto)
```ts
import { z } from "zod";

export const zPersona = z.object({
  id: z.number().int().nonnegative().optional(),
  identificacion: z.string().min(8).max(20),
  nombres: z.string().min(2).max(100),
  apellidos: z.string().min(2).max(100),
  emailInstitucional: z.string().email().optional().nullable(),
  emailPersonal: z.string().email().optional().nullable(),
});
export type Persona = z.infer<typeof zPersona>;

export const zContrato = z.object({
  id: z.number().int().nonnegative().optional(),
  personaId: z.number().int().positive(),
  puestoId: z.number().int().positive(),
  tipo: z.enum(["TITULAR","OCASIONAL","CONTRATO","SERV_PROF"]),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sueldoBase: z.number().min(0),
});
export type Contrato = z.infer<typeof zContrato>;

// Repite patrón para los demás modelos…
```

### 3.2 Helper HTTP
```ts
export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";
async function api<T=any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? (null as any) : res.json();
}
export const PersonasApi = {
  list: () => api<Persona[]>("/api/personas"),
  get: (id:number) => api<Persona>(`/api/personas/${id}`),
  create: (data:Persona) => api<Persona>("/api/personas", { method:"POST", body: JSON.stringify(data) }),
  update: (id:number, data:Persona) => api(`/api/personas/${id}`, { method:"PUT", body: JSON.stringify(data) }),
  remove: (id:number) => api(`/api/personas/${id}`, { method:"DELETE" }),
};
```

---

## 4) Flujo UI sugerido

1. **Dashboard:** métricas rápidas (conteo personas, contratos activos, marcaciones hoy).
2. **Personas:** tabla + filtros, crear/editar (zod + react-hook-form), detalle con tabs:
   - Contratos, Turnos, Asistencia (marcaciones por fecha), Permisos/Vacaciones/Recuperaciones, Nómina, CV, Publicaciones.
3. **Turnos:** plan semanal (grid 7×N), ABM de asignaciones.
4. **Permisos/Vacaciones:** formulario con vista de saldo (en esta versión saldo se calcula client-side o por reportes ad-hoc).
5. **Nómina:** periodo, conceptos y movimientos (CRUD).

---

## 5) Ejemplos de payloads

**Crear Persona**
```http
POST /api/personas
Content-Type: application/json

{
  "identificacion": "1802890176",
  "nombres": "Henry",
  "apellidos": "Flores",
  "emailInstitucional": "henry@uta.edu.ec"
}
```

**Crear Contrato**
```http
POST /api/contratos
Content-Type: application/json

{
  "personaId": 1,
  "puestoId": 1,
  "tipo": "TITULAR",
  "fechaInicio": "2025-01-01",
  "sueldoBase": 1200
}
```

**Crear Permiso**
```http
POST /api/permisos
Content-Type: application/json

{
  "personaId": 1,
  "tipo": "MEDICO",
  "desde": "2025-08-14T08:00:00Z",
  "hasta": "2025-08-14T12:00:00Z",
  "horas": 4,
  "estado": "SOLICITADO",
  "motivo": "Cita médica"
}
```

**Crear Publicación**
```http
POST /api/publicaciones
Content-Type: application/json

{
  "personaId": 1,
  "tipo": "ARTICULO",
  "titulo": "Redes de alto rendimiento en campus",
  "anio": 2024,
  "doi": "10.1234/uta.2024.001"
}
```

---

## 6) Variables de entorno (Frontend Vite)
```
VITE_API_BASE=http://localhost:5000
```

---

## 7) Consideraciones adicionales
- La API actual no implementa paginación/ordenamiento/filtrado server-side; hacerlo en cliente inicialmente.
- Manejar errores de red/validación mostrando `toast`/mensajes claros.
- Normalizar manejo de fechas (usar `dayjs` o `date-fns`).

---

## 8) Checklist para IA
- [ ] Leer `VITE_API_BASE`.
- [ ] Implementar `api()` con JSON y manejo de errores.
- [ ] Tipos + Validación (zod) para **todas** las entidades listadas.
- [ ] Páginas: Dashboard, Personas, Turnos, Asistencia, Permisos/Vacaciones, Nómina, Publicaciones.
- [ ] Formularios con `react-hook-form` + `zodResolver`.
- [ ] Tablas con `@tanstack/react-table`.
- [ ] Rutas con `react-router-dom`.
