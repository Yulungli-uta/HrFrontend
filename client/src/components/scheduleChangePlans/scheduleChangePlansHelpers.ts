// src/components/scheduleChangePlans/scheduleChangePlansHelpers.ts
import type {
  BossStatusFilterValue,
  CreateScheduleChangePlanRequest,
  PlanFormState,
  ScheduleOption,
  EmployeeDetailOption,
} from "@/types/sheduleChangePlansType";
import { STATUS_META } from "@/features/sheduleChangePlansConstant";

export function getStatusMeta(
  statusTypeID: number,
  statusCatalog?: Record<number, { label: string }>
) {
  if (statusCatalog?.[statusTypeID]) {
    return {
      label: statusCatalog[statusTypeID].label,
      variant: resolveStatusVariant(statusCatalog[statusTypeID].label),
    };
  }

  return (
    STATUS_META[statusTypeID] ?? {
      label: `Estado ${statusTypeID}`,
      variant: "outline" as const,
    }
  );
}

function resolveStatusVariant(label: string) {
  const normalized = label.toLowerCase();

  if (
    normalized.includes("aprobado") ||
    normalized.includes("aplicado") ||
    normalized.includes("ejecutado")
  ) {
    return "default" as const;
  }

  if (
    normalized.includes("rechazado") ||
    normalized.includes("omitido")
  ) {
    return "destructive" as const;
  }

  if (normalized.includes("cancelado")) {
    return "outline" as const;
  }

  return "secondary" as const;
}

export function normalizeEmployeeDetail(item: any): EmployeeDetailOption {
  return {
    employeeID: Number(item.employeeID ?? item.employeeId ?? 0),
    firstName: item.firstName ?? "",
    lastName: item.lastName ?? "",
    fullName:
      item.fullName ||
      [item.firstName, item.lastName].filter(Boolean).join(" ") ||
      item.email ||
      `Empleado ${item.employeeID ?? ""}`,
    idCard: item.idCard ?? "",
    email: item.email ?? "",
    employeeType: item.employeeType ?? undefined,
    ImmediateBossID: item.ImmediateBossID ?? item.immediateBossID ?? undefined,
    department: item.department ?? item.departmentName ?? "",
    faculty: item.faculty ?? "",
    scheduleID: Number(item.scheduleID ?? item.scheduleId ?? 0),
    baseSalary: item.baseSalary ?? undefined,
    hireDate: item.hireDate ?? undefined,
    hasActiveSalary: item.hasActiveSalary ?? true,
  };
}

export function normalizeSchedule(item: any): ScheduleOption {
  return {
    scheduleId: Number(
      item.scheduleId ??
        item.ScheduleId ??
        item.scheduleID ??
        item.ScheduleID ??
        item.id ??
        item.Id ??
        0
    ),
    name:
      item.name ??
      item.Name ??
      item.description ??
      item.Description ??
      "Horario sin nombre",
    description: item.description ?? item.Description ?? null,
    startTime:
      item.startTime ??
      item.StartTime ??
      item.entryTime ??
      item.EntryTime ??
      null,
    endTime:
      item.endTime ??
      item.EndTime ??
      item.exitTime ??
      item.ExitTime ??
      null,
    workingDays: item.workingDays ?? item.WorkingDays ?? null,
  };
}

export function matchesStatusFilter(
  statusTypeID: number,
  filter: BossStatusFilterValue,
  statusName?: string | null
) {
  if (filter === "all") return true;

  const normalized = (statusName ?? "").toLowerCase();

  if (filter === "approved") {
    return normalized.includes("aprobado") || normalized.includes("ejecutado");
  }

  if (filter === "pending") {
    return normalized.includes("pendiente") || normalized.includes("borrador");
  }

  if (filter === "rejected") {
    return normalized.includes("rechazado");
  }

  if (filter === "cancelled") {
    return normalized.includes("cancelado");
  }

  return false;
}

export function validateForm(form: PlanFormState): string | null {
  if (!form.title.trim()) return "El título es obligatorio.";
  if (!form.justification.trim()) return "La justificación es obligatoria.";
  if (!form.newScheduleID) return "Debe seleccionar un nuevo horario.";
  if (!form.effectiveDate) return "Debe seleccionar la fecha efectiva de inicio.";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 2);

  const selectedDate = new Date(form.effectiveDate + "T00:00:00");
  if (selectedDate < minDate) {
    return "La fecha efectiva debe planificarse con al menos 48 horas de anticipación.";
  }

  if (!form.isPermanent && !form.temporalEndDate) {
    return "Debe seleccionar la fecha fin del cambio temporal.";
  }

  if (form.selectedEmployeeIds.length === 0) {
    return "Debe seleccionar al menos un colaborador.";
  }

  return null;
}

export function buildCreatePayload(
  form: PlanFormState,
  bossId: number
): CreateScheduleChangePlanRequest {
  return {
    title: form.title.trim(),
    justification: form.justification.trim(),
    requestedByBossID: bossId,
    newScheduleID: Number(form.newScheduleID),
    effectiveDate: form.effectiveDate,
    applyAfterHours: form.applyAfterHours ? Number(form.applyAfterHours) as 24 | 48 : 24,
    isPermanent: form.isPermanent,
    temporalEndDate: form.isPermanent ? null : form.temporalEndDate || null,
    details: form.selectedEmployeeIds.map((employeeID) => ({
      employeeID,
      notes: form.notesByEmployee[employeeID]?.trim() || null,
    })),
  };
}

export function getScheduleLabel(
  scheduleId: number | string | null | undefined,
  schedulesMap: Map<number, ScheduleOption>
) {
  if (!scheduleId) return "Sin horario";

  const id = Number(scheduleId);
  const schedule = schedulesMap.get(id);

  if (!schedule) return `Horario #${id}`;
  return schedule.name || `Horario #${id}`;
}

export function getScheduleTimeRange(schedule?: ScheduleOption | null) {
  if (!schedule) return "—";

  const start = schedule.startTime;
  const end = schedule.endTime;

  if (start && end) {
    return `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}`;
  }

  return "—";
}