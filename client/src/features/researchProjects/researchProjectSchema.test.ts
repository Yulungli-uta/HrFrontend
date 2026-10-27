import { describe, expect, it } from "vitest";
import {
  buildResearchProjectSchema,
  participantBounds,
  type ParticipantFormValues,
  type ResearchProjectFormValues,
} from "./researchProjectSchema";

const ctx = {
  isEdit: false,
  today: "2026-10-20",
  roleNameById: { "10": "COORDINADOR_PRINCIPAL", "11": "COORDINADOR_SUBROGANTE", "12": "INVESTIGADOR" },
};

const pdf = new File(["%PDF"], "r.pdf", { type: "application/pdf" });

const person = (id: number) => ({ personId: id, idCard: String(id), fullName: `Persona ${id}` });

const participant = (over: Partial<ParticipantFormValues> = {}): ParticipantFormValues => ({
  key: "k",
  isExternal: false,
  person: person(1),
  externalFullName: "",
  externalIdentification: "",
  roleTypeId: "10",
  startDate: "2023-01-01",
  endDate: "2024-12-31",
  ...over,
});

const valid = (over: Partial<ResearchProjectFormValues> = {}): ResearchProjectFormValues => ({
  name: "Proyecto",
  startDate: "2023-01-01",
  endDate: "2024-12-31",
  approvalNumber: "RES-1",
  approvalFile: pdf,
  hasExtension: true,
  extensionNumber: "RES-2",
  extensionEndDate: "2025-06-30",
  extensionFile: pdf,
  completionNumber: "RES-3",
  completionFile: pdf,
  participants: [participant()],
  ...over,
});

const noExtension = (over: Partial<ResearchProjectFormValues> = {}) =>
  valid({ hasExtension: false, extensionNumber: "", extensionEndDate: "", extensionFile: null, ...over });

const messages = (v: ResearchProjectFormValues, c = ctx) => {
  const r = buildResearchProjectSchema(c).safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("esquema de proyectos de investigación", () => {
  it("acepta un proyecto válido", () => {
    expect(messages(valid())).toEqual([]);
  });

  it("la finalización del proyecto no puede ser posterior a hoy", () => {
    expect(messages(noExtension({ endDate: "2026-10-21", participants: [participant({ endDate: "2026-10-20" })] }))).toContain(
      "endDate: La fecha de finalización no puede ser posterior a hoy",
    );
  });

  it("el inicio no puede ser posterior a la finalización", () => {
    expect(messages(valid({ startDate: "2025-01-01" }))).toContain("startDate: La fecha de inicio no puede ser posterior a la de finalización");
  });

  it("la prórroga no puede terminar después de hoy ni antes del fin del proyecto", () => {
    expect(messages(valid({ extensionEndDate: "2027-01-01" }))).toContain("extensionEndDate: La fecha de fin de la prórroga no puede ser posterior a hoy");
    expect(messages(valid({ extensionEndDate: "2024-12-31" }))).toContain("extensionEndDate: Debe ser posterior a la fecha de finalización del proyecto");
  });

  it("los archivos son opcionales, pero el número de cada resolución es obligatorio", () => {
    expect(messages(valid({ approvalFile: null, completionFile: null, extensionFile: null }))).toEqual([]);
    const m = messages(valid({ approvalNumber: "", completionNumber: "", extensionNumber: "" }));
    expect(m).toContain("approvalNumber: El número de la resolución de aprobación es obligatorio");
    expect(m).toContain("completionNumber: El número de la resolución de finalización es obligatorio");
    expect(m).toContain("extensionNumber: El número de la resolución de prórroga es obligatorio");
  });

  it("sin prórroga no se exige ningún campo de prórroga", () => {
    const m = messages(noExtension());
    expect(m.filter((x) => x.startsWith("extension"))).toEqual([]);
  });

  it("participante: inicio no posterior al fin y fin no posterior a hoy", () => {
    const m = messages(valid({ participants: [participant({ startDate: "2024-06-01", endDate: "2024-01-01" })] }));
    expect(m.some((x) => x.includes("participants.0.startDate: El inicio no puede ser posterior al fin"))).toBe(true);
    expect(messages(noExtension({ endDate: "2026-10-20", participants: [participant({ endDate: "2026-10-21" })] }))).toContain("participants.0.endDate: No puede ser posterior a hoy");
  });

  it("participante: dentro del período del proyecto (con prórroga, hasta su fin)", () => {
    expect(messages(valid({ participants: [participant({ startDate: "2022-12-01" })] }))).toContain("participants.0.startDate: Fuera del período del proyecto");
    expect(messages(valid({ participants: [participant({ startDate: "2025-01-01", endDate: "2025-06-30" })] }))).toEqual([]);
    expect(messages(valid({ participants: [participant({ startDate: "2025-01-01", endDate: "2025-07-01" })] }))).toContain("participants.0.startDate: Fuera del período del proyecto");
    expect(messages(noExtension({ participants: [participant({ startDate: "2025-01-01", endDate: "2025-06-30" })] }))).toContain("participants.0.startDate: Fuera del período del proyecto");
  });

  it("con prórroga, una participación puede abarcar todo el período (proyecto + prórroga)", () => {
    expect(messages(valid({ participants: [participant({ startDate: "2024-06-01", endDate: "2025-03-01" })] }))).toEqual([]);
  });

  it("la misma persona no puede cruzarse en fechas aunque el rol sea distinto", () => {
    const m = messages(valid({ participants: [participant(), participant({ roleTypeId: "12", startDate: "2024-06-01", endDate: "2024-12-31" })] }));
    expect(m).toContain("participants.1.startDate: Se cruza con la participación 1 de la misma persona");
  });

  it("personas distintas sí pueden coincidir; dos coordinadores principales no", () => {
    expect(messages(valid({ participants: [participant(), participant({ person: person(2), roleTypeId: "12" })] }))).toEqual([]);
    expect(messages(valid({ participants: [participant(), participant({ person: person(2) })] }))).toContain(
      "participants.1.roleTypeId: No puede haber dos Coordinadores Principales al mismo tiempo",
    );
  });

  it("externo: exige nombre y cédula; se identifica por cédula", () => {
    const ext = (over: Partial<ParticipantFormValues> = {}) =>
      participant({ isExternal: true, person: null, externalFullName: "Ext", externalIdentification: "0102", roleTypeId: "12", ...over });
    expect(messages(valid({ participants: [ext({ externalFullName: "", externalIdentification: "" })] }))).toEqual(
      expect.arrayContaining(["participants.0.externalFullName: El nombre completo es obligatorio", "participants.0.externalIdentification: La cédula es obligatoria"]),
    );
    expect(messages(valid({ participants: [ext(), ext({ roleTypeId: "11", startDate: "2024-01-01" })] }))).toContain(
      "participants.1.startDate: Se cruza con la participación 1 de la misma persona",
    );
  });
});

describe("participantBounds", () => {
  const project = { startDate: "2023-01-01", endDate: "2024-12-31", hasExtension: true, extensionEndDate: "2025-06-30" };

  it("llega hasta el fin de la prórroga si la hubo, o hasta el fin del proyecto", () => {
    expect(participantBounds(project, "2026-10-20")).toEqual({ min: "2023-01-01", max: "2025-06-30" });
    expect(participantBounds({ ...project, hasExtension: false }, "2026-10-20")).toEqual({ min: "2023-01-01", max: "2024-12-31" });
  });

  it("nunca pasa de hoy", () => {
    expect(participantBounds({ ...project, hasExtension: false, endDate: "2030-01-01" }, "2026-10-20").max).toBe("2026-10-20");
  });
});
