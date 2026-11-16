// src/components/job-activities/OccupationalGroupsPanel.tsx
import { useMemo, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/DataPagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OccupationalGroupAPI } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { useCatalogPaged, toIsActive, type ActiveFilter } from "@/hooks/useCatalogPaged";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { normalizeOccupationalGroup, type OccupationalGroup } from "@/types/Job-activities";
import { CatalogFilterBar } from "./CatalogFilterBar";
import { CatalogStateRow } from "./CatalogStateRow";
import { clickableRow } from "./clickableRow";
import { DegreeCombobox } from "./catalogCombos";
import { mapPagedItems } from "./mapPagedItems";
import { JOB_ACTIVITIES_KEYS } from "./queryKeys";
import { useDegreeNames } from "./useCatalogLabels";

interface Props {
  onNew: () => void;
  onEdit: (group: OccupationalGroup) => void;
}

const toNumber = (text: string): number | undefined => {
  const value = Number(text.replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value >= 0 ? value : undefined;
};

/** Grupos ocupacionales: búsqueda al escribir, filtros por estado, grado y rango de RMU, y paginado en el servidor. */
export function OccupationalGroupsPanel({ onNew, onEdit }: Props) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [degreeId, setDegreeId] = useState<number | null>(null);
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [rmuMinText, setRmuMinText] = useState("");
  const [rmuMaxText, setRmuMaxText] = useState("");
  const rmuMin = useDebouncedValue(rmuMinText, 400);
  const rmuMax = useDebouncedValue(rmuMaxText, 400);

  const filters = useMemo(
    () => ({ isActive: toIsActive(activeFilter), degreeId: degreeId ?? undefined, familyTypeId: familyId ?? undefined, rmuMin: toNumber(rmuMin), rmuMax: toNumber(rmuMax) }),
    [activeFilter, degreeId, familyId, rmuMin, rmuMax],
  );

  const list = useCatalogPaged<OccupationalGroup, typeof filters>({
    queryKey: JOB_ACTIVITIES_KEYS.groups,
    filters,
    fetcher: async (params) => mapPagedItems(await OccupationalGroupAPI.listPaged(params), normalizeOccupationalGroup),
  });

  const degreeNames = useDegreeNames(list.items.map((g) => g.degreeId));
  const families = useRefTypesByCategory(REF_TYPE_CATEGORIES.OCCUPATIONAL_GROUP_FAMILY);
  const familyNames = useMemo(() => new Map(families.data.map((t) => [t.typeId, t.name])), [families.data]);
  const hasFilters = activeFilter !== "all" || degreeId != null || familyId != null || rmuMinText !== "" || rmuMaxText !== "" || list.searchText.trim() !== "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-success" />
            Grupos Ocupacionales
          </span>
          <Button size="sm" onClick={onNew}>
            <Plus className="mr-1 h-4 w-4" />
            Nuevo
          </Button>
        </CardTitle>
        <CardDescription>Cada grupo une un grado y un RMU; la familia (p. ej. Personal Académico Titular) reúne los de una misma escala.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CatalogFilterBar
          searchText={list.searchText}
          onSearchText={list.setSearchText}
          searchPlaceholder="Buscar grupo ocupacional..."
          activeFilter={activeFilter}
          onActiveFilter={setActiveFilter}
          hasFilters={hasFilters}
          onClear={() => {
            list.setSearchText("");
            setActiveFilter("all");
            setDegreeId(null);
            setFamilyId(null);
            setRmuMinText("");
            setRmuMaxText("");
          }}
        >
          <Select
            value={familyId != null ? String(familyId) : "all"}
            onValueChange={(v) => {
              if (v !== "") setFamilyId(v === "all" ? null : Number(v));
            }}
          >
            <SelectTrigger className="w-[210px]" aria-label="Filtrar por familia">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las familias</SelectItem>
              {families.data.map((t) => (
                <SelectItem key={t.typeId} value={String(t.typeId)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="min-w-[200px] flex-1">
            <DegreeCombobox value={degreeId} onChange={(id) => setDegreeId(id)} placeholder="Todos los grados" clearLabel="Todos los grados" />
          </div>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={rmuMinText}
            onChange={(e) => setRmuMinText(e.target.value)}
            placeholder="RMU desde"
            className="w-[110px]"
            aria-label="RMU desde"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={rmuMaxText}
            onChange={(e) => setRmuMaxText(e.target.value)}
            placeholder="RMU hasta"
            className="w-[110px]"
            aria-label="RMU hasta"
          />
        </CatalogFilterBar>

        <div className="rounded-md border">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Familia</TableHead>
                <TableHead>Grado</TableHead>
                <TableHead className="w-[100px] text-center">Estado</TableHead>
                <TableHead className="w-[110px] text-right">RMU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((g) => (
                <TableRow key={g.groupId} {...clickableRow(() => onEdit(g))}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{g.description}</span>
                      <span className="text-xs text-muted-foreground">ID: {g.groupId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{g.familyTypeId ? (familyNames.get(g.familyTypeId) ?? "-") : "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{degreeNames.get(g.degreeId) ?? "-"}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={g.isActive ? "default" : "secondary"}
                      className={g.isActive ? "bg-success/15 text-success" : "bg-muted text-foreground"}
                    >
                      {g.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-sm">${g.rmu.toFixed(2)}</span>
                  </TableCell>
                </TableRow>
              ))}
              <CatalogStateRow
                colSpan={5}
                isLoading={list.isLoading}
                isError={list.isError}
                errorMessage={list.errorMessage}
                isEmpty={list.items.length === 0}
                emptyText={hasFilters ? "No hay grupos ocupacionales que coincidan con los filtros." : "No hay grupos ocupacionales registrados."}
              />
            </TableBody>
          </Table>
        </div>
        <DataPagination
          page={list.page}
          totalPages={list.totalPages}
          totalCount={list.totalCount}
          pageSize={list.pageSize}
          hasPreviousPage={list.hasPreviousPage}
          hasNextPage={list.hasNextPage}
          onPageChange={list.goToPage}
          onPageSizeChange={list.setPageSize}
          pageSizeOptions={[10, 20, 50]}
        />
      </CardContent>
    </Card>
  );
}
