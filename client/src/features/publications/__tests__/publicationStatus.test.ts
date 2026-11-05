import { describe, expect, it } from "vitest";
import {
  isPendingReview,
  isPublicationLocked,
  lockedMessage,
  publicationBadge,
  publicationCounts,
} from "../publicationStatus";

describe("publicationBadge", () => {
  it("lo histórico o manual sin revisión no lleva insignia", () => {
    expect(publicationBadge({ approvalStatus: "SIN_REVISION", requiresApproval: false })).toBeNull();
  });

  it("lo sincronizado sin aprobar es 'En revisión'", () => {
    expect(publicationBadge({ approvalStatus: "SIN_REVISION", requiresApproval: true })).toEqual({
      label: "En revisión",
      tone: "review",
    });
  });

  it("aprobada y rechazada", () => {
    expect(publicationBadge({ approvalStatus: "APROBADA" })?.tone).toBe("approved");
    expect(publicationBadge({ approvalStatus: "RECHAZADA" })?.tone).toBe("rejected");
  });
});

describe("isPublicationLocked", () => {
  it("usa lo que informa el servidor", () => {
    expect(isPublicationLocked({ isLocked: true })).toBe(true);
    expect(isPublicationLocked({ isLocked: false, approvalStatus: "APROBADA" })).toBe(false);
  });

  it("sin dato del servidor, deduce del estado; un registro antiguo sin estado es editable", () => {
    expect(isPublicationLocked({ approvalStatus: "APROBADA" })).toBe(true);
    expect(isPublicationLocked({ approvalStatus: "RECHAZADA" })).toBe(true);
    expect(isPublicationLocked({ approvalStatus: "SIN_REVISION" })).toBe(false);
    expect(isPublicationLocked({})).toBe(false);
  });
});

describe("publicationCounts / isPendingReview", () => {
  it("cuenta lo que dice el servidor", () => {
    expect(publicationCounts({ countsForCv: false })).toBe(false);
    expect(publicationCounts({ countsForCv: true })).toBe(true);
  });

  it("sin dato del servidor, solo las rechazadas no cuentan", () => {
    expect(publicationCounts({ approvalStatus: "RECHAZADA" })).toBe(false);
    expect(publicationCounts({})).toBe(true);
  });

  it("pendiente de revisión: sincronizada y sin decisión", () => {
    expect(isPendingReview({ requiresApproval: true, approvalStatus: "SIN_REVISION" })).toBe(true);
    expect(isPendingReview({ requiresApproval: true, approvalStatus: "APROBADA" })).toBe(false);
    expect(isPendingReview({ requiresApproval: false, approvalStatus: "SIN_REVISION" })).toBe(false);
  });
});

describe("lockedMessage", () => {
  it("distingue aprobada de rechazada", () => {
    expect(lockedMessage("APROBADA")).toContain("aprobada");
    expect(lockedMessage("RECHAZADA")).toContain("rechazada");
  });
});
