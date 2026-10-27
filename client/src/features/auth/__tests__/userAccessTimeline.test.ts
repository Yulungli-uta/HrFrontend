import { describe, expect, it } from "vitest";
import type { UserAccessEvent } from "@/lib/api/services/security";
import { groupRenewals, mergeTimeline, punchToEvent, unwrapApiData } from "../services/userAccessTimeline";

const event = (timestamp: string, type: UserAccessEvent["type"]): UserAccessEvent => ({
  timestamp,
  type,
  title: type,
  detail: null,
  ipAddress: null,
  device: null,
  sessionId: null,
});

describe("punchToEvent", () => {
  it("convierte una picada web de entrada", () => {
    const e = punchToEvent({ punchTime: "2026-10-23T13:00:28", punchType: "In", deviceId: "WEB-MOBILE", ipAddress: "10.85.4.234" });
    expect(e.type).toBe("PUNCH");
    expect(e.title).toBe("Picada de entrada");
    expect(e.device).toBe("Web · móvil");
    expect(e.ipAddress).toBe("10.85.4.234");
  });

  it("marca como reloj biométrico las picadas sin dispositivo", () => {
    const e = punchToEvent({ punchTime: "2026-10-23T07:40:00", punchType: "Out", deviceId: null });
    expect(e.title).toBe("Picada de salida");
    expect(e.device).toBe("Reloj biométrico");
  });
});

describe("mergeTimeline", () => {
  it("ordena de la más reciente a la más antigua mezclando accesos y picadas", () => {
    const merged = mergeTimeline(
      [event("2026-10-23T13:45:27", "LOGIN"), event("2026-10-23T07:47:38", "SESSION_RENEWED")],
      [{ punchTime: "2026-10-23T13:00:28", punchType: "In", deviceId: "WEB-MOBILE" }]
    );
    expect(merged.map((e) => e.type)).toEqual(["LOGIN", "PUNCH", "SESSION_RENEWED"]);
  });
});

describe("groupRenewals", () => {
  it("agrupa renovaciones consecutivas y respeta los demás eventos", () => {
    const rows = groupRenewals([
      event("2026-10-23T14:09:59", "LOGIN"),
      event("2026-10-23T13:00:21", "SESSION_RENEWED"),
      event("2026-10-23T07:47:38", "SESSION_RENEWED"),
      event("2026-10-22T16:59:58", "LOGIN"),
      event("2026-10-22T12:59:13", "SESSION_RENEWED"),
    ]);

    expect(rows.map((r) => r.kind)).toEqual(["event", "renewals", "event", "renewals"]);
    const first = rows[1];
    expect(first.kind === "renewals" && first.count).toBe(2);
    expect(first.kind === "renewals" && first.newest).toBe("2026-10-23T13:00:21");
    expect(first.kind === "renewals" && first.oldest).toBe("2026-10-23T07:47:38");
  });

  it("devuelve lista vacía sin eventos", () => {
    expect(groupRenewals([])).toEqual([]);
  });
});

describe("unwrapApiData", () => {
  it("lee la respuesta del cliente HTTP", () => {
    expect(unwrapApiData<number[]>({ status: "success", data: [1, 2] })).toEqual([1, 2]);
  });

  it("lee la respuesta envuelta también por el servidor", () => {
    expect(unwrapApiData<{ a: number }>({ status: "success", data: { success: true, data: { a: 1 } } })).toEqual({ a: 1 });
  });

  it("devuelve null ante un error o una respuesta vacía", () => {
    expect(unwrapApiData({ status: "error", error: { message: "x" } })).toBeNull();
    expect(unwrapApiData(undefined)).toBeNull();
    expect(unwrapApiData({ status: "success", data: null })).toBeNull();
  });
});
