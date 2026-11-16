// src/components/job-activities/CatalogFilterBar.tsx
import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActiveFilter } from "@/hooks/useCatalogPaged";

interface Props {
  searchText: string;
  onSearchText: (value: string) => void;
  searchPlaceholder: string;
  activeFilter: ActiveFilter;
  onActiveFilter: (value: ActiveFilter) => void;
  /** Texto de las opciones de estado según el género del catálogo (Activo/Activa). */
  activeLabels?: { active: string; inactive: string };
  /** Filtros propios de cada catálogo (grado, RMU, tipo…). */
  children?: ReactNode;
  /** true si hay algún filtro aplicado (muestra "Limpiar"). */
  hasFilters: boolean;
  onClear: () => void;
}

/** Barra de búsqueda y filtros de los listados de cargos, grados, grupos y actividades. */
export function CatalogFilterBar({
  searchText,
  onSearchText,
  searchPlaceholder,
  activeFilter,
  onActiveFilter,
  activeLabels = { active: "Activos", inactive: "Inactivos" },
  children,
  hasFilters,
  onClear,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchText}
          onChange={(e) => onSearchText(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
          aria-label={searchPlaceholder}
        />
      </div>
      <Select value={activeFilter} onValueChange={(v) => onActiveFilter(v as ActiveFilter)}>
        <SelectTrigger className="w-[130px]" aria-label="Filtrar por estado">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">{activeLabels.active}</SelectItem>
          <SelectItem value="inactive">{activeLabels.inactive}</SelectItem>
        </SelectContent>
      </Select>
      {children}
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
