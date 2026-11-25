// src/components/job-activities/DegreesPanel.tsx
import { useMemo, useState } from "react";
import { RecordAvatar, RecordCard } from "@/components/ui/RecordCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { GraduationCap as DegreeIcon } from "lucide-react";
import { GraduationCap, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/DataPagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DegreeAPI } from "@/lib/api";
import { useCatalogPaged, toIsActive, type ActiveFilter } from "@/hooks/useCatalogPaged";
import { normalizeDegree, type Degree } from "@/types/Job-activities";
import { CatalogFilterBar } from "./CatalogFilterBar";
import { CatalogStateRow } from "./CatalogStateRow";
import { clickableRow } from "./clickableRow";
import { mapPagedItems } from "./mapPagedItems";
import { JOB_ACTIVITIES_KEYS } from "./queryKeys";

interface Props {
  onNew: () => void;
  onEdit: (degree: Degree) => void;
}

/** Grados: búsqueda al escribir, filtro de estado y paginado en el servidor. */
export function DegreesPanel({ onNew, onEdit }: Props) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const filters = useMemo(() => ({ isActive: toIsActive(activeFilter) }), [activeFilter]);

  const list = useCatalogPaged<Degree, typeof filters>({
    queryKey: JOB_ACTIVITIES_KEYS.degrees,
    filters,
    fetcher: async (params) => mapPagedItems(await DegreeAPI.listPaged(params), normalizeDegree),
  });

  const isDesktop = useIsDesktop();
  const showCards = !isDesktop && list.items.length > 0;

  const hasFilters = activeFilter !== "all" || list.searchText.trim() !== "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Grados
          </span>
          <Button size="sm" onClick={onNew}>
            <Plus className="mr-1 h-4 w-4" />
            Nuevo
          </Button>
        </CardTitle>
        {/* <CardDescription>Grados académicos / jerárquicos utilizados para agrupar puestos y grupos ocupacionales.</CardDescription> */}
      </CardHeader>
      <CardContent className="space-y-3">
        <CatalogFilterBar
          searchText={list.searchText}
          onSearchText={list.setSearchText}
          searchPlaceholder="Buscar grado..."
          activeFilter={activeFilter}
          onActiveFilter={setActiveFilter}
          hasFilters={hasFilters}
          onClear={() => {
            list.setSearchText("");
            setActiveFilter("all");
          }}
        />
        {showCards ? (
          <ul className="grid gap-3">
            {list.items.map((deg) => (
              <li key={deg.degreeId} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <RecordCard
                  tone={deg.isActive ? "success" : "muted"}
                  dimmed={!deg.isActive}
                  leading={<RecordAvatar seed={String(deg.degreeId)} icon={DegreeIcon} />}
                  title={deg.description}
                  badges={<StatusBadge tone={deg.isActive ? "success" : "neutral"}>{deg.isActive ? "Activo" : "Inactivo"}</StatusBadge>}
                  onClick={() => onEdit(deg)}
                />
              </li>
            ))}
          </ul>
        ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[120px] text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((deg) => (
                <TableRow key={deg.degreeId} {...clickableRow(() => onEdit(deg))}>
                  <TableCell>
                    <span className="text-sm font-medium">{deg.description}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={deg.isActive ? "default" : "secondary"}
                      className={deg.isActive ? "bg-success/15 text-success" : "bg-muted text-foreground"}
                    >
                      {deg.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <CatalogStateRow
                colSpan={2}
                isLoading={list.isLoading}
                isError={list.isError}
                errorMessage={list.errorMessage}
                isEmpty={list.items.length === 0}
                emptyText={hasFilters ? "No hay grados que coincidan con los filtros." : "No hay grados registrados."}
              />
            </TableBody>
          </Table>
        </div>
        )}
        <DataPagination
          infinite={list.infinite}
          itemLabel="títulos"
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
