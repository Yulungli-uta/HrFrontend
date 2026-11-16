// src/components/job-activities/ActivitiesPanel.tsx
import { useMemo, useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/DataPagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActivityAPI } from "@/lib/api";
import { useCatalogPaged, toIsActive, type ActiveFilter } from "@/hooks/useCatalogPaged";
import { normalizeActivity, type Activity } from "@/types/Job-activities";
import { CatalogFilterBar } from "./CatalogFilterBar";
import { CatalogStateRow } from "./CatalogStateRow";
import { mapPagedItems } from "./mapPagedItems";
import { JOB_ACTIVITIES_KEYS } from "./queryKeys";

interface Props {
  onNew: () => void;
  onEdit: (activity: Activity) => void;
}

type TypeFilter = "all" | "LABORAL" | "ADICIONAL";

/** Catálogo de actividades: búsqueda al escribir, filtros por estado y tipo, y paginado en el servidor. */
export function ActivitiesPanel({ onNew, onEdit }: Props) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const filters = useMemo(
    () => ({ isActive: toIsActive(activeFilter), type: typeFilter === "all" ? undefined : typeFilter }),
    [activeFilter, typeFilter],
  );

  const list = useCatalogPaged<Activity, typeof filters>({
    queryKey: JOB_ACTIVITIES_KEYS.activities,
    filters,
    fetcher: async (params) => mapPagedItems(await ActivityAPI.listPaged(params), normalizeActivity),
  });

  const hasFilters = activeFilter !== "all" || typeFilter !== "all" || list.searchText.trim() !== "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Actividades laborales
          </span>
          <Button size="sm" onClick={onNew}>
            <Plus className="mr-1 h-4 w-4" />
            Nueva
          </Button>
        </CardTitle>
        <CardDescription>Actividades propias del perfil del cargo, consideradas en la descripción de puesto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CatalogFilterBar
          searchText={list.searchText}
          onSearchText={list.setSearchText}
          searchPlaceholder="Buscar actividad..."
          activeFilter={activeFilter}
          onActiveFilter={setActiveFilter}
          activeLabels={{ active: "Activas", inactive: "Inactivas" }}
          hasFilters={hasFilters}
          onClear={() => {
            list.setSearchText("");
            setActiveFilter("all");
            setTypeFilter("all");
          }}
        >
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-[140px]" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="LABORAL">Laboral</SelectItem>
              <SelectItem value="ADICIONAL">Adicional</SelectItem>
            </SelectContent>
          </Select>
        </CatalogFilterBar>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[110px]">Tipo</TableHead>
                <TableHead className="w-[100px] text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((act) => (
                <TableRow key={act.activitiesID} className="cursor-pointer hover:bg-primary/10" onClick={() => onEdit(act)}>
                  <TableCell>
                    <span className="text-sm">{act.description || "(Sin descripción)"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {act.activitiesType === "LABORAL" ? "Laboral" : "Adicional"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={act.isActive ? "default" : "secondary"}
                      className={act.isActive ? "bg-success/15 text-success" : "bg-muted text-foreground"}
                    >
                      {act.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <CatalogStateRow
                colSpan={3}
                isLoading={list.isLoading}
                isError={list.isError}
                errorMessage={list.errorMessage}
                isEmpty={list.items.length === 0}
                emptyText={hasFilters ? "No hay actividades que coincidan con los filtros." : "No hay actividades registradas."}
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
