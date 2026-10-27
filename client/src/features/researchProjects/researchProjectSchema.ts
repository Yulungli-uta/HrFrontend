// src/features/researchProjects/researchProjectSchema.ts
//
// Esquema Zod (react-hook-form) del formulario de proyectos de investigación. Replica las reglas que valida el
// backend (ResearchProjectsService), que es quien decide: aquí solo se evita el viaje y se marca el campo exacto.
// Los archivos de las resoluciones son opcionales (el número de cada resolución sí es obligatorio).

import { z } from "zod";
import type { ResearchPersonLookup } from "@/lib/api";

export const ROLE_PRINCIPAL = "COORDINADOR_PRINCIPAL";

export interface ParticipantFormValues {
  /** Clave estable para la lista (useFieldArray); no se envía al servidor. */
  key: string;
  /** Id de la participación al editar una existente. */
  id?: number;
  isExternal: boolean;
  person: ResearchPersonLookup | null;
  externalFullName: string;
  externalIdentification: string;
  roleTypeId: string;
  startDate: string;
  endDate: string;
}

export interface ResearchProjectFormValues {
  name: string;
  startDate: string;
  endDate: string;
  approvalNumber: string;
  approvalFile: File | null;
  hasExtension: boolean;
  extensionNumber: string;
  extensionEndDate: string;
  extensionFile: File | null;
  completionNumber: string;
  completionFile: File | null;
  participants: ParticipantFormValues[];
}

/** Lo que el esquema necesita saber del contexto (edición, catálogos y fecha de hoy). */
export interface ResearchSchemaContext {
  isEdit: boolean;
  /** Fecha local de hoy, "yyyy-MM-dd". */
  today: string;
  roleNameById: Record<string, string>;
}

/**
 * Rango de fechas permitido para un participante: desde el inicio del proyecto hasta el fin de la prórroga (si la
 * hubo) o del proyecto, y nunca más allá de hoy.
 */
export function participantBounds(
  project: Pick<ResearchProjectFormValues, "startDate" | "endDate" | "hasExtension" | "extensionEndDate">,
  today: string,
): { min?: string; max?: string } {
  const lastDay = project.hasExtension && project.extensionEndDate ? project.extensionEndDate : project.endDate;
  const max = !lastDay || lastDay > today ? today : lastDay;
  return { min: project.startDate || undefined, max };
}

const required = (message: string) => z.string().trim().min(1, message);

export function buildResearchProjectSchema(ctx: ResearchSchemaContext) {
  const participant = z.object({
    key: z.string(),
    id: z.number().optional(),
    isExternal: z.boolean(),
    person: z.custom<ResearchPersonLookup | null>().nullable(),
    externalFullName: z.string().max(300, "Máximo 300 caracteres"),
    externalIdentification: z.string().max(30, "Máximo 30 caracteres"),
    roleTypeId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  });

  return z
    .object({
      name: required("El nombre del proyecto es obligatorio").max(500, "Máximo 500 caracteres"),
      startDate: required("La fecha de inicio es obligatoria"),
      endDate: required("La fecha de finalización es obligatoria"),
      approvalNumber: required("El número de la resolución de aprobación es obligatorio").max(100, "Máximo 100 caracteres"),
      approvalFile: z.custom<File | null>().nullable(),
      hasExtension: z.boolean(),
      extensionNumber: z.string().max(100, "Máximo 100 caracteres"),
      extensionEndDate: z.string(),
      extensionFile: z.custom<File | null>().nullable(),
      completionNumber: required("El número de la resolución de finalización es obligatorio").max(100, "Máximo 100 caracteres"),
      completionFile: z.custom<File | null>().nullable(),
      participants: z.array(participant).min(1, "Registre al menos un participante"),
    })
    .superRefine((v, c) => {
      const add = (path: (string | number)[], message: string) => c.addIssue({ code: z.ZodIssueCode.custom, path, message });

      // ── Proyecto ──
      if (v.startDate && v.endDate) {
        if (v.startDate > v.endDate) add(["startDate"], "La fecha de inicio no puede ser posterior a la de finalización");
        if (v.endDate > ctx.today) add(["endDate"], "La fecha de finalización no puede ser posterior a hoy");
      }

      // Los campos de prórroga solo se exigen si el proyecto tuvo prórroga.
      if (v.hasExtension) {
        if (!v.extensionNumber.trim()) add(["extensionNumber"], "El número de la resolución de prórroga es obligatorio");
        if (!v.extensionEndDate) add(["extensionEndDate"], "La fecha de fin de la prórroga es obligatoria");
        else {
          if (v.endDate && v.extensionEndDate <= v.endDate) add(["extensionEndDate"], "Debe ser posterior a la fecha de finalización del proyecto");
          if (v.extensionEndDate > ctx.today) add(["extensionEndDate"], "La fecha de fin de la prórroga no puede ser posterior a hoy");
        }
      }

      // ── Participantes ──
      const ranges = new Map<string, { start: string; end: string; index: number }[]>();
      const principals: { start: string; end: string }[] = [];

      v.participants.forEach((p, i) => {
        const at = (field: string, message: string) => add(["participants", i, field], message);

        if (p.isExternal) {
          if (!p.externalFullName.trim()) at("externalFullName", "El nombre completo es obligatorio");
          if (!p.externalIdentification.trim()) at("externalIdentification", "La cédula es obligatoria");
        } else if (!p.person) {
          at("person", "Elija la persona");
        }
        if (!p.roleTypeId) at("roleTypeId", "Elija el rol");
        if (!p.startDate) at("startDate", "Obligatoria");
        if (!p.endDate) at("endDate", "Obligatoria");
        if (!p.startDate || !p.endDate) return;

        if (p.startDate > p.endDate) at("startDate", "El inicio no puede ser posterior al fin");
        if (p.endDate > ctx.today) at("endDate", "No puede ser posterior a hoy");

        const { min, max } = participantBounds(v, ctx.today);
        if ((min && p.startDate < min) || (max && p.endDate > max)) at("startDate", "Fuera del período del proyecto");

        // Una misma persona no puede tener dos participaciones que se crucen en fechas, aunque el rol sea distinto.
        const identity = p.isExternal ? `E:${p.externalIdentification.trim().toUpperCase()}` : `I:${p.person?.personId}`;
        const previous = ranges.get(identity) ?? [];
        const clash = previous.find((r) => p.startDate <= r.end && p.endDate >= r.start);
        if (clash) at("startDate", `Se cruza con la participación ${clash.index + 1} de la misma persona`);
        previous.push({ start: p.startDate, end: p.endDate, index: i });
        ranges.set(identity, previous);

        if (ctx.roleNameById[p.roleTypeId] === ROLE_PRINCIPAL) {
          if (principals.some((r) => p.startDate <= r.end && p.endDate >= r.start)) {
            at("roleTypeId", "No puede haber dos Coordinadores Principales al mismo tiempo");
          }
          principals.push({ start: p.startDate, end: p.endDate });
        }
      });
    });
}
