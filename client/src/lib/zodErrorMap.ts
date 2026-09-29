// client/src/lib/zodErrorMap.ts
import { z, ZodIssueCode, type ZodErrorMap } from "zod";

/**
 * Mensajes de error de Zod en español para los ~11 formularios de Hoja de Vida.
 *
 * La mayoría de los schemas ya traen su propio mensaje (ej. z.string().min(1, "El nombre es
 * requerido")), pero varios campos numéricos usan validadores "pelados" (z.number().int(),
 * .positive(), .nonnegative(), .min(0), etc. sin segundo argumento) — esos caen en los
 * mensajes por defecto de Zod, que están en inglés ("Number must be greater than 0",
 * "Expected number, received nan", ...). Hallazgo informe UTA-DITIC-PS-027-2026,
 * observación 32. En vez de perseguir cada validador suelto en cada formulario, se traduce
 * una sola vez a nivel global — mismo enfoque que trimDeep (observación 2) para no repetir
 * la misma lógica once veces.
 *
 * Solo traduce los códigos de issue que realmente aparecen en los schemas de este módulo
 * (invalid_type, too_small, too_big, invalid_string, invalid_date). Un mensaje custom
 * (ctx.addIssue / .refine con message) SIEMPRE tiene prioridad — Zod nunca llama a este
 * mapa cuando el issue ya trae su propio mensaje explícito.
 */
export const spanishErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type: {
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: "Este campo es requerido" };
      }
      if (issue.expected === "number") {
        return { message: "Debe ser un número válido" };
      }
      if (issue.expected === "string") {
        return { message: "Debe ser un texto válido" };
      }
      return { message: `Tipo de dato inválido (se esperaba ${issue.expected})` };
    }

    case ZodIssueCode.too_small: {
      if (issue.type === "number") {
        if (issue.minimum === 0 && issue.inclusive) {
          return { message: "El valor no puede ser negativo" };
        }
        return {
          message: issue.inclusive
            ? `El valor debe ser mayor o igual a ${issue.minimum}`
            : `El valor debe ser mayor a ${issue.minimum}`,
        };
      }
      if (issue.type === "string") {
        return issue.minimum === 1
          ? { message: "Este campo es requerido" }
          : { message: `Debe tener al menos ${issue.minimum} caracteres` };
      }
      if (issue.type === "array") {
        return { message: `Debe seleccionar al menos ${issue.minimum}` };
      }
      return { message: "El valor es menor al mínimo permitido" };
    }

    case ZodIssueCode.too_big: {
      if (issue.type === "number") {
        return {
          message: issue.inclusive
            ? `El valor debe ser menor o igual a ${issue.maximum}`
            : `El valor debe ser menor a ${issue.maximum}`,
        };
      }
      if (issue.type === "string") {
        return { message: `No puede exceder ${issue.maximum} caracteres` };
      }
      return { message: "El valor excede el máximo permitido" };
    }

    case ZodIssueCode.invalid_string:
      return { message: "Formato inválido" };

    case ZodIssueCode.invalid_date:
      return { message: "Fecha inválida" };

    case ZodIssueCode.not_multiple_of:
      return { message: `El valor debe ser múltiplo de ${issue.multipleOf}` };

    default:
      return { message: ctx.defaultError };
  }
};

export function installSpanishZodErrorMap(): void {
  z.setErrorMap(spanishErrorMap);
}
