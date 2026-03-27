//src/features/sheduleChangePlansConstant.ts
import type { BossStatusFilter, PlanFormState } from "@/types/sheduleChangePlansType";

export const QUERY_KEY = ["schedule-change-plans"] as const;

export const STATUS_META: Record<
  number,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  1: { label: "Pendiente", variant: "secondary" },
  2: { label: "Aprobado", variant: "default" },
  3: { label: "Rechazado", variant: "destructive" },
  4: { label: "Cancelado", variant: "outline" },
};

export const STATUS_FILTERS = [
  { label: "Todos", value: "all" },
  { label: "Por ejecutar", value: "pending" },
  { label: "Aprobados", value: "approved" },
  { label: "Rechazados", value: "rejected" },
  { label: "Cancelados", value: "cancelled" },
];

export const EMPTY_FORM: PlanFormState = {
  title: "",
  justification: "",
  newScheduleID: "",
  effectiveDate: "",
  applyAfterHours: "24",
  isPermanent: true,
  temporalEndDate: "",
  selectedEmployeeIds: [],
  notesByEmployee: {},
};