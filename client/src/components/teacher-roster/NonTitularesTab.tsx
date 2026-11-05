import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataPagination } from "@/components/ui/DataPagination";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import { NonTitularRosterSummaryCards } from "@/components/teacher-roster/NonTitularRosterSummaryCards";
import { NonTitularRosterTable } from "@/components/teacher-roster/NonTitularRosterTable";
import { contractTypeLabel } from "@/components/teacher-roster/nonTitularLabels";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useNonTitularRosterList, useNonTitularRosterSummary } from "@/hooks/useTeacherRoster";
import { dedicationLabel } from "@/lib/academicLabels";
import type { NonTitularRosterFilter, NonTitularRosterStatus } from "@/lib/api";

const DEFAULT_PAGE_SIZE = 20;

interface NonTitularesTabProps {
  /** Mismo criterio que la pestaña Titulares: el servidor solo entrega el RMU con permiso, esto solo decide si hay columna. */
  showSalary: boolean;
  /** Total con los filtros de esta pestaña (lo muestra la etiqueta de la pestaña). */
  onTotalChange?: (total: number | undefined) => void;
}

/**
 * Pestaña "No titulares": docentes con contrato ocasional. Tiene su propio estado de filtros, sus propias tarjetas y su
 * propio listado; nada se comparte con "Titulares". Las tarjetas reaccionan a los filtros de esta pestaña.
 */
export function NonTitularesTab({ showSalary, onTotalChange }: NonTitularesTabProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<NonTitularRosterStatus>("ACTIVE");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [dedicationTypeId, setDedicationTypeId] = useState<number | null>(null);
  const [contractTypeId, setContractTypeId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const filter = useMemo<NonTitularRosterFilter>(() => ({
    search: debouncedSearch || undefined,
    status,
    departmentId,
    dedicationTypeId,
    contractTypeId,
  }), [debouncedSearch, status, departmentId, dedicationTypeId, contractTypeId]);

  const list = useNonTitularRosterList(filter, page, pageSize);
  const summary = useNonTitularRosterSummary(filter);

  const summaryTotal = summary.data?.total;
  useEffect(() => { onTotalChange?.(summaryTotal); }, [summaryTotal, onTotalChange]);

  const items = list.data?.items ?? [];
  const totalCount = Number(list.data?.totalCount ?? 0);
  const totalPages = Math.max(1, Number(list.data?.totalPages ?? 1));

  /** Cualquier cambio de filtro vuelve a la primera página. */
  const apply = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  const hasFilters =
    !!search || status !== "ACTIVE" || departmentId != null || dedicationTypeId != null || contractTypeId != null;

  const clearFilters = () => {
    setSearch(""); setStatus("ACTIVE"); setDepartmentId(null); setDedicationTypeId(null); setContractTypeId(null); setPage(1);
  };

  const selectedDedicationName = summary.data?.byDedication.find((d) => d.typeId === dedicationTypeId)?.name;
  const selectedContractTypeName = summary.data?.byContractType.find((c) => c.typeId === contractTypeId)?.name;

  return (
    <div>
      <NonTitularRosterSummaryCards
        summary={summary.data}
        isLoading={summary.isLoading}
        selectedDedicationId={dedicationTypeId}
        selectedContractTypeId={contractTypeId}
        onSelectDedication={apply(setDedicationTypeId)}
        onSelectContractType={apply(setContractTypeId)}
        onClearAll={() => { setDedicationTypeId(null); setContractTypeId(null); setPage(1); }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Listado de docentes no titulares</CardTitle>
          <CardDescription>
            {list.isLoading ? "Cargando…" : `${totalCount} docente(s) con los filtros aplicados`}
          </CardDescription>
        </CardHeader>
        <CardContent>

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nombre o cédula…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={status} onValueChange={(v) => apply(setStatus)(v as NonTitularRosterStatus)}>
              <SelectTrigger aria-label="Estado del contrato"><SelectValue placeholder="Estado del contrato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Contrato vigente</SelectItem>
                <SelectItem value="EXPIRED">Contrato vencido</SelectItem>
                <SelectItem value="ALL">Todos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <div className="flex-1 min-w-0">
                <DepartmentSelect
                  value={departmentId}
                  onChange={(id) => apply(setDepartmentId)(id)}
                  placeholder="Todas las dependencias"
                />
              </div>
              {departmentId != null && (
                <Button type="button" variant="ghost" size="icon" aria-label="Quitar dependencia" onClick={() => apply(setDepartmentId)(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtros elegidos desde las tarjetas */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {dedicationTypeId != null && (
              <Badge variant="secondary" className="gap-1">
                {dedicationLabel(selectedDedicationName)}
                <button type="button" aria-label="Quitar dedicación" onClick={() => apply(setDedicationTypeId)(null)}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {contractTypeId != null && (
              <Badge variant="secondary" className="gap-1">
                {contractTypeLabel(selectedContractTypeName)}
                <button type="button" aria-label="Quitar tipo de contrato" onClick={() => apply(setContractTypeId)(null)}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {hasFilters && (
              <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>Limpiar filtros</Button>
            )}
          </div>

          {list.isError && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {list.error instanceof Error ? list.error.message : "Error al cargar los docentes no titulares."}
              <Button type="button" size="sm" variant="outline" className="ml-3" onClick={() => list.refetch()}>Reintentar</Button>
            </div>
          )}

          <NonTitularRosterTable items={items} isLoading={list.isLoading} showSalary={showSalary} />

          {totalCount > 0 && (
            <div className="border-t border-border mt-4">
              <DataPagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                hasPreviousPage={page > 1}
                hasNextPage={page < totalPages}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                disabled={list.isFetching}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default NonTitularesTab;
