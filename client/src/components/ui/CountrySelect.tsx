// client/src/components/ui/CountrySelect.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchableSelect, type SearchItem } from "@/components/contracts/SearchableSelect";
import { PaisesAPI } from "@/lib/api";

interface CountrySelectProps {
  value?: string | null;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Selector de país con búsqueda paginada en servidor (233 países, ver
 * CountriesController.GetPaged) — extraído de EducationLevelForm.tsx 2026-09-19 para
 * reusar en todos los formularios que antes traían el catálogo completo con PaisesAPI.list()
 * dentro de un <Select> plano sin buscador (PersonForm, AddressForm, BookForm,
 * WorkExperienceForm, EducationLevelForm).
 *
 * Resuelve el país ya seleccionado por ID cuando no está en la página actual de la búsqueda
 * (ej. al abrir un registro para editar) — mismo patrón que EmployeeCombobox.tsx — para que
 * el combobox nunca se vea vacío por culpa de la paginación.
 */
export function CountrySelect({
  value,
  onChange,
  disabled,
  placeholder = "Seleccionar país",
}: CountrySelectProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [search]);

  const { data: pagedResp, isFetching: loading } = useQuery({
    queryKey: ["countries-paged", debouncedSearch],
    queryFn: () => PaisesAPI.listPaged({ page: 1, pageSize: 20, search: debouncedSearch }),
  });

  const items: SearchItem[] = useMemo(() => {
    const list = pagedResp?.status === "success" ? pagedResp.data?.items ?? [] : [];
    return list.map((c: any) => ({ value: String(c.countryId), label: c.countryName }));
  }, [pagedResp]);

  const { data: resolved } = useQuery({
    queryKey: ["country-resolve", value],
    queryFn: () => PaisesAPI.get(value as string),
    enabled: !!value,
  });

  const itemsResolved: SearchItem[] = useMemo(() => {
    if (!value) return items;
    if (items.some((i) => i.value === value)) return items;
    const name = resolved?.status === "success" ? (resolved.data as any)?.countryName : undefined;
    if (!name) return items;
    return [{ value, label: name }, ...items];
  }, [items, value, resolved]);

  return (
    <SearchableSelect
      value={value ?? null}
      items={itemsResolved}
      disabled={disabled}
      isLoading={loading}
      placeholder={placeholder}
      searchPlaceholder="Escribe el nombre del país..."
      emptyText="No se encontraron países."
      onSearchChange={setSearch}
      onChange={(v) => onChange(v ?? undefined)}
    />
  );
}
