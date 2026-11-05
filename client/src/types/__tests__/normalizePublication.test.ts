import { describe, expect, it } from "vitest";
import { normalizePublication } from "../person";

describe("normalizePublication", () => {
  it("conserva el estado de revisión que decide el servidor", () => {
    const p = normalizePublication({
      publicationId: 5,
      title: "Un artículo",
      sourceProviderTypeId: 3529,
      externalId: "123",
      approvalStatus: "APROBADA",
      approvedAt: "2026-11-04T12:00:00",
      approvedBy: 4,
      reviewNotes: "ok",
      lastSyncedAt: "2026-11-04T11:00:00",
      isLocked: true,
      requiresApproval: true,
      countsForCv: true,
    });

    expect(p.approvalStatus).toBe("APROBADA");
    expect(p.isLocked).toBe(true);
    expect(p.requiresApproval).toBe(true);
    expect(p.countsForCv).toBe(true);
    expect(p.sourceProviderTypeId).toBe(3529);
    expect(p.externalId).toBe("123");
    expect(p.reviewNotes).toBe("ok");
  });

  it("no inventa estado cuando el servidor no lo envía (registro de siempre)", () => {
    const p = normalizePublication({ publicationId: 1, title: "Antigua" });
    expect(p.approvalStatus).toBeUndefined();
    expect(p.isLocked).toBeUndefined();
    expect(p.requiresApproval).toBeUndefined();
  });
});
