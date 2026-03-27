//src/components/schedules/ActiveSchedulePicker.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { HorariosAPI } from "@/lib/api";
import {
  SearchableEntityPicker,
  type PickerOption,
} from "@/components/share/SearchableEntityPicker";

interface ActiveSchedulePickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const pickScheduleId = (schedule: any): number => {
  const raw =
    schedule?.scheduleId ??
    schedule?.ScheduleId ??
    schedule?.scheduleID ??
    schedule?.ScheduleID ??
    schedule?.id ??
    schedule?.Id ??
    schedule?.ID ??
    0;

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getScheduleName = (schedule: any): string =>
  schedule?.name ??
  schedule?.Name ??
  schedule?.description ??
  schedule?.Description ??
  "Horario sin nombre";

const getScheduleStart = (schedule: any): string =>
  schedule?.startTime ??
  schedule?.StartTime ??
  schedule?.entryTime ??
  schedule?.EntryTime ??
  "";

const getScheduleEnd = (schedule: any): string =>
  schedule?.endTime ??
  schedule?.EndTime ??
  schedule?.exitTime ??
  schedule?.ExitTime ??
  "";

const getWorkingDays = (schedule: any): string =>
  schedule?.workingDays ??
  schedule?.WorkingDays ??
  "";

const fmtTime = (value?: string) => {
  if (!value) return "";
  return value.includes(":") ? value.substring(0, 5) : value;
};

export function ActiveSchedulePicker({
  value,
  onChange,
  disabled = false,
}: ActiveSchedulePickerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => HorariosAPI.list(),
    staleTime: 5 * 60_000,
    retry: 2,
  });

  const options = useMemo<PickerOption[]>(() => {
    if (data?.status !== "success") return [];

    return (data.data ?? [])
      .map((schedule: any) => {
        const scheduleId = pickScheduleId(schedule);
        const name = getScheduleName(schedule);
        const startTime = fmtTime(getScheduleStart(schedule));
        const endTime = fmtTime(getScheduleEnd(schedule));
        const workingDays = getWorkingDays(schedule);

        return {
          value: String(scheduleId),
          label: name,
          description: [workingDays, startTime && endTime ? `${startTime} - ${endTime}` : ""]
            .filter(Boolean)
            .join(" · "),
          keywords: [
            name,
            workingDays,
            startTime,
            endTime,
            schedule?.description ?? "",
          ],
          meta: schedule,
        };
      })
      .filter((option) => Number(option.value) > 0);
  }, [data]);

  return (
    <SearchableEntityPicker
      value={value}
      onChange={onChange}
      options={options}
      placeholder={isLoading ? "Cargando horarios..." : "Seleccione un horario"}
      searchPlaceholder="Buscar horario..."
      emptyMessage="No se encontraron horarios."
      loading={isLoading}
      disabled={disabled || isLoading}
    />
  );
}