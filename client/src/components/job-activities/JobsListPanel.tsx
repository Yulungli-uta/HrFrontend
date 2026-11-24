// src/components/job-activities/JobsListPanel.tsx
import { useMemo, useState } from "react";
import { RecordAvatar, RecordCard } from "@/components/ui/RecordCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { Briefcase as JobIcon } from "lucide-react";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Briefcase, Plus, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/DataPagination";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CargosAPI } from "@/lib/api";
import { useCatalogPaged, toIsActive, type ActiveFilter } from "@/hooks/useCatalogPaged";
import { normalizeJob, type Job } from "@/types/Job-activities";
import { CatalogFilterBar } from "./CatalogFilterBar";
import { CatalogStateRow } from "./CatalogStateRow";
import { clickableRow } from "./clickableRow";
import { OccupationalGroupCombobox } from "./catalogCombos";
import { mapPagedItems } from "./mapPagedItems";
import { JOB_ACTIVITIES_KEYS } from "./queryKeys";
import { useGroupDetails } from "./useCatalogLabels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";

interface Props {
  selectedJobId: number | null;
  onSelect: (job: Job) => void;
  onNew: () => void;
  onEdit: (job: Job) => void;
}

/** Listado de cargos: búsqueda al escribir, filtros por estado y grupo ocupacional, y paginado en el servidor. */
export function JobsListPanel({ selectedJobId, onSelect, onNew, onEdit }: Props) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [uepId, setUepId] = useState<number | null>(null);
  const filters = useMemo(
    () => ({ isActive: toIsActive(activeFilter), groupId: groupId ?? undefined, uepScaleTypeId: uepId ?? undefined }),
    [activeFilter, groupId, uepId],
  );

  const list = useCatalogPaged<Job, typeof filters>({
    queryKey: JOB_ACTIVITIES_KEYS.jobs,
    filters,
    fetcher: async (params) => mapPagedItems(await CargosAPI.listPaged(params), normalizeJob),
  });

  const groups = useGroupDetails(list.items.map((j) => j.groupId));
  const uepScales = useRefTypesByCategory(REF_TYPE_CATEGORIES.UEP_SCALE_TYPE);
  const uepNames = useMemo(() => new Map(uepScales.data.map((t) => [t.typeId, t.name])), [uepScales.data]);
  const isDesktop = useIsDesktop();
  const showCards = !isDesktop && list.items.length > 0;

  const hasFilters = activeFilter !== "all" || groupId != null || uepId != null || list.searchText.trim() !== "";

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Cargos
          </span>
          <Button size="sm" onClick={onNew} data-testid="button-add-job">
            <Plus className="mr-1 h-4 w-4" />
            Nuevo
          </Button>
        </CardTitle>
        <CardDescription>Seleccione un cargo para ver y editar su detalle y actividades.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CatalogFilterBar
          searchText={list.searchText}
          onSearchText={list.setSearchText}
          searchPlaceholder="Buscar cargo por descripción..."
          activeFilter={activeFilter}
          onActiveFilter={setActiveFilter}
          hasFilters={hasFilters}
          onClear={() => {
            list.setSearchText("");
            setActiveFilter("all");
            setGroupId(null);
            setUepId(null);
          }}
        >
          <div className="w-full">
            <OccupationalGroupCombobox value={groupId} onChange={(id) => setGroupId(id)} placeholder="Todos los grupos ocupacionales" clearLabel="Todos los grupos ocupacionales" />
          </div>
          <div className="w-full">
            <Select
              value={uepId != null ? String(uepId) : "all"}
              onValueChange={(v) => {
                if (v !== "") setUepId(v === "all" ? null : Number(v));
              }}
            >
              <SelectTrigger aria-label="Filtrar por clasificación adicional (UEP)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las clasificaciones (UEP)</SelectItem>
                {uepScales.data
                  .filter((t) => t.isActive !== false)
                  .map((t) => (
                    <SelectItem key={t.typeId} value={String(t.typeId)}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CatalogFilterBar>

        {showCards ? (
          <ul className="grid gap-3">
            {list.items.map((job) => {
              const group = job.groupId ? groups.get(job.groupId) : undefined;
              const uepName = group?.uepScaleTypeId ? uepNames.get(group.uepScaleTypeId) : undefined;
              const isSelected = selectedJobId === job.jobID;
              return (
                <li
                  key={job.jobID || `job-${job.description}`}
                  className={`rounded-lg border bg-card p-3 shadow-sm ${isSelected ? "border-primary" : "border-border"}`}
                >
                  <RecordCard
                    tone={job.isActive ? "success" : "muted"}
                    dimmed={!job.isActive}
                    leading={<RecordAvatar seed={String(job.jobID)} icon={JobIcon} />}
                    title={job.description || "(Sin descripción)"}
                    subtitle={group ? `Grupo: ${group.description}` : undefined}
                    badges={<StatusBadge tone={job.isActive ? "success" : "neutral"}>{job.isActive ? "Activo" : "Inactivo"}</StatusBadge>}
                    meta={uepName ? [{ label: "Clasificación", value: uepName }] : []}
                    onClick={() => onSelect(job)}
                    actions={<ActionIconButton icon={Wrench} label="Editar cargo" tone="primary" touch onClick={() => onEdit(job)} />}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
        <div className="rounded-md border">
          <Table>
            <TableBody>
              {list.items.map((job) => {
                const group = job.groupId ? groups.get(job.groupId) : undefined;
                const uepName = group?.uepScaleTypeId ? uepNames.get(group.uepScaleTypeId) : undefined;
                const isSelected = selectedJobId === job.jobID;
                return (
                  <TableRow key={job.jobID || `job-${job.description}`} {...clickableRow(() => onSelect(job), isSelected)}>
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{job.description || "(Sin descripción)"}</span>
                        {group && <span className="text-xs text-muted-foreground">Grupo: {group.description}</span>}
                        {uepName && <span className="text-xs text-muted-foreground">Clasificación: {uepName}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="w-[90px] text-right align-top">
                      <Badge
                        variant={job.isActive ? "default" : "secondary"}
                        className={job.isActive ? "bg-success/15 text-success" : "bg-muted text-foreground"}
                      >
                        {job.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="mt-1 h-7 w-7"
                        aria-label="Editar cargo"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(job);
                        }}
                      >
                        <Wrench className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              <CatalogStateRow
                colSpan={2}
                isLoading={list.isLoading}
                isError={list.isError}
                errorMessage={list.errorMessage}
                isEmpty={list.items.length === 0}
                emptyText={hasFilters ? "No hay cargos que coincidan con los filtros." : "No hay cargos registrados."}
              />
            </TableBody>
          </Table>
        </div>
        )}
        <DataPagination
          infinite={list.infinite}
          itemLabel="cargos"
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
