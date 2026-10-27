// features/auth/services/userAccessTimeline.ts
import type { UserAccessEvent } from "@/lib/api/services/security";

/** Picada tal como la devuelve HrBackend (solo los campos que usa la línea de tiempo). */
export interface PunchRecord {
  punchTime: string;
  punchType: string;
  deviceId?: string | null;
  ipAddress?: string | null;
}

export type TimelineRow =
  | { kind: "event"; event: UserAccessEvent }
  | { kind: "renewals"; count: number; newest: string; oldest: string; events: UserAccessEvent[] };

const DEVICE_LABELS: Record<string, string> = {
  "WEB-MOBILE": "Web · móvil",
  "WEB-DESKTOP": "Web · escritorio",
};

export function describePunchDevice(deviceId?: string | null): string {
  if (!deviceId) return "Reloj biométrico";
  return DEVICE_LABELS[deviceId] ?? deviceId;
}

export function punchToEvent(punch: PunchRecord): UserAccessEvent {
  const isIn = punch.punchType?.toLowerCase() === "in";
  return {
    timestamp: punch.punchTime,
    type: "PUNCH",
    title: isIn ? "Picada de entrada" : "Picada de salida",
    detail: null,
    ipAddress: punch.ipAddress ?? null,
    device: describePunchDevice(punch.deviceId),
    sessionId: null,
  };
}

/** Une los eventos de acceso con las picadas y los ordena de la más reciente a la más antigua. */
export function mergeTimeline(events: UserAccessEvent[], punches: PunchRecord[]): UserAccessEvent[] {
  const all = [...events, ...punches.map(punchToEvent)];
  return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Agrupa las renovaciones de sesión consecutivas en una sola fila: son la mayoría de los accesos
 * y, sin agrupar, tapan los inicios de sesión y las anomalías.
 */
export function groupRenewals(events: UserAccessEvent[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  for (const event of events) {
    const last = rows[rows.length - 1];
    if (event.type === "SESSION_RENEWED") {
      if (last?.kind === "renewals") {
        last.count += 1;
        last.oldest = event.timestamp;
        last.events.push(event);
      } else {
        rows.push({ kind: "renewals", count: 1, newest: event.timestamp, oldest: event.timestamp, events: [event] });
      }
    } else {
      rows.push({ kind: "event", event });
    }
  }
  return rows;
}

/**
 * Extrae el contenido de una respuesta de la API, que llega envuelta de dos formas:
 * { status: "success", data } del cliente HTTP y { success, data } del servidor (a veces las dos).
 * Devuelve null si la respuesta es un error o viene vacía.
 */
export function unwrapApiData<T>(res: unknown): T | null {
  const r = res as { status?: string; success?: boolean; data?: unknown } | null | undefined;
  if (!r || r.status === "error") return null;
  let data: unknown = r.data;
  if (data && typeof data === "object" && "success" in data && "data" in data) {
    data = (data as { data: unknown }).data;
  }
  return (data ?? null) as T | null;
}
