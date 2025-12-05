import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ReferenceType, ActiveFilter } from "@/types/department";

interface DepartmentsFiltersProps {
  search: string;
  onlyActive: ActiveFilter;
  typeFilter: string;
  refTypes: ReferenceType[];
  onSearchChange: (value: string) => void;
  onOnlyActiveChange: (value: ActiveFilter) => void;
  onTypeFilterChange: (value: string) => void;
  visibleCount: number;
}

export function DepartmentsFilters({
  search,
  onlyActive,
  typeFilter,
  refTypes,
  onSearchChange,
  onOnlyActiveChange,
  onTypeFilterChange,
  visibleCount
}: DepartmentsFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">Buscar</Label>
            <Input
              id="search"
              placeholder="Buscar por nombre, código o alias…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="w-full sm:w-[180px]">
            <Label htmlFor="active-filter" className="sr-only">Filtrar por estado</Label>
            <select
              id="active-filter"
              value={onlyActive}
              onChange={(e) => onOnlyActiveChange(e.target.value as ActiveFilter)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>
          
          <div className="w-full sm:w-[200px]">
            <Label htmlFor="type-filter" className="sr-only">Filtrar por tipo</Label>
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger id="type-filter">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {refTypes.map(t => (
                  <SelectItem key={t.typeId} value={String(t.typeId)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {search.trim() && (
          <p className="text-sm text-gray-600 mt-3">
            {visibleCount} departamento(s) encontrado(s) para "{search}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}