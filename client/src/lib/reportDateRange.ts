import { addMonths, firstDayOfCurrentMonthEcuador, todayEcuador } from "@/lib/clock";

/** Rango a partir del cual se avisa que el reporte puede tardar; solo advierte, nunca bloquea. */
export const MAX_RECOMMENDED_RANGE_MONTHS = 12;

export interface DateRangeIssue {
  /** Impide generar el reporte. */
  error?: string;
  /** Solo informa; el usuario puede continuar. */
  warning?: string;
}

/** Valida un rango de fechas "yyyy-MM-dd" (comparación de texto: el formato ordena igual que el calendario). */
export function getDateRangeIssue(startDate?: string, endDate?: string): DateRangeIssue {
  if (!startDate || !endDate) return {};

  if (startDate > endDate) {
    return { error: "La fecha de inicio no puede ser mayor que la fecha de fin." };
  }

  if (addMonths(startDate, MAX_RECOMMENDED_RANGE_MONTHS) < endDate) {
    return {
      warning: `El rango supera ${MAX_RECOMMENDED_RANGE_MONTHS} meses: el reporte puede tardar mucho o no completarse. Considere acotarlo.`,
    };
  }

  return {};
}

/** Del primer día del mes actual de Ecuador a hoy, para reportes que arrancan con el mes en curso. */
export function currentMonthRange(): { startDate: string; endDate: string } {
  return { startDate: firstDayOfCurrentMonthEcuador(), endDate: todayEcuador() };
}
