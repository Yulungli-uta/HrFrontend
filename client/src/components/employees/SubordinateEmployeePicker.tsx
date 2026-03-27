import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { VistaDetallesEmpleadosAPI } from "@/lib/api";
import {
  SearchableEntityPicker,
  type PickerOption,
} from "@/components/share/SearchableEntityPicker";

interface SubordinateEmployeePickerProps {
  bossId: number;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export function SubordinateEmployeePicker({
  bossId,
  values,
  onChange,
  disabled = false,
}: SubordinateEmployeePickerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["vw-employee-details", "subordinates", bossId],
    queryFn: () => VistaDetallesEmpleadosAPI.byImmediateBoss(bossId),
    enabled: !!bossId,
    staleTime: 5 * 60_000,
  });

  const options = useMemo<PickerOption[]>(() => {
    if (data?.status !== "success") return [];

    return (data.data ?? []).map((employee: any) => ({
      value: String(employee.employeeID),
      label: employee.fullName,
      description: `${employee.department} · ${employee.email}`,
      keywords: [
        employee.fullName ?? "",
        employee.email ?? "",
        employee.idCard ?? "",
        employee.department ?? "",
        employee.faculty ?? "",
        String(employee.scheduleID ?? ""),
      ],
      meta: employee,
    }));
  }, [data]);

  return (
    <SearchableEntityPicker
      multiple
      values={values}
      onMultiChange={onChange}
      options={options}
      placeholder={
        isLoading
          ? "Cargando subordinados..."
          : "Buscar subordinados del jefe logueado"
      }
      searchPlaceholder="Buscar por nombre, correo, cédula o departamento..."
      emptyMessage="No se encontraron subordinados."
      loading={isLoading}
      disabled={disabled || isLoading || !bossId}
    />
  );
}