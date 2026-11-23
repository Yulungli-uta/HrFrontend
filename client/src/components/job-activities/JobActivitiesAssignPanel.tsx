// src/components/job-activities/JobActivitiesAssignPanel.tsx
import { useMemo, useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  /** Ids de las actividades ya asignadas al cargo seleccionado. */
  assignedIds: Set<number>;
  isWorking: boolean;
  onToggle: (activity: Activity) => void;
}

type TypeFilter = "all" | "LABORAL" | "ADICIONAL";

/** Actividades que se pueden asignar al cargo seleccionado: filtro al escribir y paginado en el servidor. */
export function JobActivitiesAssignPanel({ assignedIds, isWorking, onToggle }: Props) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const filters = useMemo(
    () => ({ isActive: toIsActive(activeFilter), type: typeFilter === "all" ? undefined : typeFilter }),
    [activeFilter, typeFilter],
  );

  const list = useCatalogPaged<Activity, typeof filters>({
    queryKey: JOB_ACTIVITIES_KEYS.assignActivities,
    filters,
    fetcher: async (params) => mapPagedItems(await ActivityAPI.listPaged(params), normalizeActivity),
  });

  const hasFilters = activeFilter !== "all" || typeFilter !== "all" || list.searchText.trim() !== "";

  return (
    <div className="space-y-3">
      <CatalogFilterBar
        searchText={list.searchText}
        onSearchText={list.setSearchText}
        searchPlaceholder="Filtrar actividades..."
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
              <TableHead>Actividad</TableHead>
              <TableHead className="w-[110px]">Tipo</TableHead>
              <TableHead className="w-[130px] text-center">Estado</TableHead>
              <TableHead className="w-[120px] text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((act) => {
              const isAssigned = assignedIds.has(act.activitiesID);
              return (
                <TableRow key={act.activitiesID}>
                  <TableCell>
                    <div className="text-sm">{act.description || "(Sin descripción)"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        act.activitiesType === "LABORAL"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-warning/40 bg-warning/15 text-warning"
                      }
                    >
                      {act.activitiesType === "LABORAL" ? "Laboral" : "Adicional"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {isAssigned ? (
                      <Badge className="bg-success/15 text-success">Asignada</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        No asignada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" variant={isAssigned ? "outline" : "default"} disabled={isWorking} onClick={() => onToggle(act)} aria-label="Desvincular">
                      {isAssigned ? (
                        <>
                          <Link2Off className="mr-1 h-4 w-4" />
                          Quitar
                        </>
                      ) : (
                        <>
                          <Link2 className="mr-1 h-4 w-4" />
                          Asignar
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            <CatalogStateRow
                colSpan={4}
                isLoading={list.isLoading}
                isError={list.isError}
                errorMessage={list.errorMessage}
                isEmpty={list.items.length === 0}
                emptyText={"No hay actividades que coincidan con el filtro."}
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
    </div>
  );
}
