import { useState, useMemo } from "react";
import type { ProcessHierarchy } from "@/types/docflow/docflow.types";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/docflow/status-badge";
import {
  Search,
  Plus,
  FileText,
  Eye,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Download,
  X,
  Calendar,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import { formatDate, formatExpedienteCode } from "@/lib/docflow/formatters";
import { ALL_STATUS_FILTER } from "@/lib/docflow/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import { DirectorySelect } from "@/components/docflow/directory-select";
import { exportToCSV, type ExportColumn } from "@/lib/docflow/export-utils";

type SortField = "date" | "status" | "process";

const ALL_PROCESSES_VALUE = "__all__";

function useInstanceFilters() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS_FILTER);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [processFilter, setProcessFilter] = useState(ALL_PROCESSES_VALUE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter !== ALL_STATUS_FILTER) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (processFilter !== ALL_PROCESSES_VALUE) count++;
    return count;
  }, [search, statusFilter, dateFrom, dateTo, processFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter(ALL_STATUS_FILTER);
    setDateFrom("");
    setDateTo("");
    setProcessFilter(ALL_PROCESSES_VALUE);
  };

  return {
    search, setSearch,
    statusFilter, setStatusFilter,
    sortField, sortDir, toggleSort,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    processFilter, setProcessFilter,
    activeFilterCount,
    clearFilters,
  };
}

const instanceExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: "instanceId", label: "Expediente", formatter: (val) => formatExpedienteCode(val as string | number) },
  { key: "processName", label: "Proceso" },
  { key: "currentStatus", label: "Estado" },
  { key: "createdByName", label: "Creado por" },
  { key: "createdAt", label: "Fecha de Creacion", formatter: (val) => val ? formatDate(String(val)) : "" },
  { key: "totalFiles", label: "Archivos", formatter: (val) => String(val ?? 0) },
];

function flattenProcesses(items: ProcessHierarchy[]): ProcessHierarchy[] {
  const result: ProcessHierarchy[] = [];
  for (const p of items) {
    result.push(p);
    if (p.children?.length) {
      result.push(...flattenProcesses(p.children));
    }
  }
  return result;
}

export default function InstancesList() {
  const service = useDocflowService();
  const allInstances = service.getInstances();
  const processes = useMemo(() => flattenProcesses(service.getProcesses()), [service]);
  const isMobile = useIsMobile();
  const {
    search, setSearch,
    statusFilter, setStatusFilter,
    sortField, sortDir, toggleSort,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    processFilter, setProcessFilter,
    activeFilterCount,
    clearFilters,
  } = useInstanceFilters();

  const filtered = useMemo(() => {
    let items = [...allInstances];

    if (statusFilter !== ALL_STATUS_FILTER) {
      items = items.filter((i) => i.currentStatus === statusFilter);
    }

    if (processFilter !== ALL_PROCESSES_VALUE) {
      const pid = Number(processFilter);
      items = items.filter((i) => i.processId === pid);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      items = items.filter((i) => new Date(i.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      items = items.filter((i) => new Date(i.createdAt) <= to);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.processName?.toLowerCase().includes(q) ||
          i.createdByName?.toLowerCase().includes(q) ||
          formatExpedienteCode(i.instanceId).toLowerCase().includes(q) ||
          JSON.stringify(i.dynamicMetadata || {}).toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "status") {
        cmp = a.currentStatus.localeCompare(b.currentStatus);
      } else {
        cmp = (a.processName || "").localeCompare(b.processName || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [allInstances, search, statusFilter, sortField, sortDir, dateFrom, dateTo, processFilter]);

  const handleExport = () => {
    const data = filtered.map((i) => ({ ...i } as unknown as Record<string, unknown>));
    const timestamp = new Date().toISOString().slice(0, 10);
    exportToCSV(data, instanceExportColumns, `expedientes_${timestamp}`);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="page-instances">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-instances-title">
            Expedientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion de expedientes y casos del flujo documental
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0} data-testid="button-export-instances">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Link href="/DocFlow/expedientes/nuevo">
            <Button data-testid="button-new-instance">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nuevo Expediente</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar expedientes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-instances"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" data-testid="badge-filter-count">
                    {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
                  </Badge>
                )}
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
              <div className="w-full sm:w-40">
                <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                <DirectorySelect
                  directoryType="instance_statuses"
                  value={statusFilter === ALL_STATUS_FILTER ? "__all__" : statusFilter}
                  onValueChange={(val) => setStatusFilter(val === "__all__" ? ALL_STATUS_FILTER : val)}
                  placeholder="Estado"
                  includeAllOption
                  allOptionLabel="Todos"
                  data-testid="select-status-filter"
                />
              </div>

              <div className="w-full sm:w-48">
                <label className="text-xs text-muted-foreground mb-1 block">Proceso</label>
                <Select
                  value={processFilter}
                  onValueChange={setProcessFilter}
                >
                  <SelectTrigger data-testid="select-process-filter">
                    <SelectValue placeholder="Todos los procesos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PROCESSES_VALUE}>Todos los procesos</SelectItem>
                    {processes.map((p) => (
                      <SelectItem key={p.processId} value={String(p.processId)} data-testid={`select-process-option-${p.processId}`}>
                        {p.processName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-40">
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Desde
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-date-from"
                />
              </div>

              <div className="w-full sm:w-40">
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Hasta
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-date-to"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3" />
              <p className="text-base font-medium">No se encontraron expedientes</p>
              <p className="text-sm mt-1">Intenta ajustar los filtros de busqueda</p>
            </div>
          ) : isMobile ? (
            <div className="flex flex-col gap-3">
              {filtered.map((instance) => (
                <Link
                  key={instance.instanceId}
                  href={`/DocFlow/expedientes/${instance.instanceId}`}
                >
                  <div
                    className="flex items-center gap-3 p-3 rounded-md border border-border hover-elevate cursor-pointer"
                    data-testid={`card-instance-mobile-${instance.instanceId}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {formatExpedienteCode(instance.instanceId)}
                        </span>
                        <StatusBadge status={instance.currentStatus} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {instance.processName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {instance.createdByName} &middot;{" "}
                        {formatDate(instance.createdAt)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>{instance.totalFiles} archivo{instance.totalFiles !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Expediente</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("process")}
                        data-testid="button-sort-process"
                      >
                        Proceso
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("status")}
                        data-testid="button-sort-status"
                      >
                        Estado
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort("date")}
                        data-testid="button-sort-date"
                      >
                        Fecha
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="text-center">Archivos</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((instance) => (
                    <TableRow
                      key={instance.instanceId}
                      className="cursor-pointer"
                      data-testid={`row-instance-${instance.instanceId}`}
                    >
                      <TableCell className="font-semibold text-sm">
                        {formatExpedienteCode(instance.instanceId)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {instance.processName}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={instance.currentStatus} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {instance.createdByName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(instance.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          {instance.totalFiles}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/DocFlow/expedientes/${instance.instanceId}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-view-instance-${instance.instanceId}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Ver expediente</TooltipContent>
                          </Tooltip>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border flex-wrap">
            <p className="text-xs text-muted-foreground" data-testid="text-results-count">
              {filtered.length} de {allInstances.length} expedientes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
