// src/components/job-activities/catalogCombos.tsx
import { PagedCatalogCombobox } from "@/components/ui/PagedCatalogCombobox";
import { DegreeAPI, OccupationalGroupAPI } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import { mapPagedItems } from "./mapPagedItems";
import {
  normalizeDegree,
  normalizeOccupationalGroup,
  type Degree,
  type OccupationalGroup,
} from "@/types/Job-activities";

type PageParams = { page: number; pageSize: number; search?: string };

// Funciones a nivel de módulo: referencia estable para el hook de combobox.
const fetchDegrees = async (p: PageParams) =>
  mapPagedItems(await DegreeAPI.listPaged({ ...p, sortBy: "description" }), normalizeDegree);
const fetchDegreeById = async (id: number) => {
  const res = await DegreeAPI.get(id);
  return res.status === "success" ? { ...res, data: normalizeDegree(res.data) } : (res as ApiResponse<Degree>);
};
const degreeOption = (d: Degree) => ({
  value: d.degreeId,
  label: d.description,
  detail: d.isActive ? undefined : "Inactivo",
});

const fetchGroups = async (p: PageParams) =>
  mapPagedItems(await OccupationalGroupAPI.listPaged({ ...p, sortBy: "description" }), normalizeOccupationalGroup);
const fetchGroupById = async (id: number) => {
  const res = await OccupationalGroupAPI.get(id);
  return res.status === "success"
    ? { ...res, data: normalizeOccupationalGroup(res.data) }
    : (res as ApiResponse<OccupationalGroup>);
};
const groupOption = (g: OccupationalGroup) => ({
  value: g.groupId,
  label: g.description,
  detail: `$${g.rmu.toFixed(2)}${g.isActive ? "" : " · Inactivo"}`,
});

interface ComboProps<T> {
  value: number | null;
  onChange: (id: number | null, item: T | null) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Texto de la opción que quita la selección (p. ej. "Todos los grados"). */
  clearLabel?: string;
}

/** Selector de grados con búsqueda al escribir y paginado en el servidor. */
export function DegreeCombobox({ value, onChange, disabled, placeholder = "Seleccione un grado", clearLabel }: ComboProps<Degree>) {
  return (
    <PagedCatalogCombobox<Degree>
      value={value}
      onChange={onChange}
      queryKey="degree-combobox"
      fetchPage={fetchDegrees}
      fetchById={fetchDegreeById}
      toOption={degreeOption}
      placeholder={placeholder}
      searchPlaceholder="Escriba para buscar grados…"
      emptyText="No se encontraron grados."
      pluralNoun="grados"
      clearLabel={clearLabel}
      disabled={disabled}
    />
  );
}

/** Selector de grupos ocupacionales con búsqueda al escribir y paginado en el servidor. */
export function OccupationalGroupCombobox({
  value,
  onChange,
  disabled,
  placeholder = "Seleccione un grupo ocupacional",
  clearLabel,
}: ComboProps<OccupationalGroup>) {
  return (
    <PagedCatalogCombobox<OccupationalGroup>
      value={value}
      onChange={onChange}
      queryKey="occupational-group-combobox"
      fetchPage={fetchGroups}
      fetchById={fetchGroupById}
      toOption={groupOption}
      placeholder={placeholder}
      searchPlaceholder="Escriba para buscar grupos ocupacionales…"
      emptyText="No se encontraron grupos ocupacionales."
      pluralNoun="grupos"
      clearLabel={clearLabel}
      disabled={disabled}
    />
  );
}
