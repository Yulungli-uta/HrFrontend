import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/docflow/status-badge";
import {
  Search,
  X,
  Eye,
  FileText,
  Filter,
  Download,
  Calendar,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Layers,
  FileStack,
  ArrowUpDown,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import type { IDocflowService } from "@/services/docflow/docflow-service.interface";
import type { ProcessHierarchy, WorkflowInstance } from "@/types/docflow/docflow.types";
import { formatDate, formatExpedienteCode } from "@/lib/docflow/formatters";
import { exportToCSV, type ExportColumn } from "@/lib/docflow/export-utils";
import { useIsMobile } from "@/hooks/use-mobile";

const ALL_STATUS = "__ALL__";
const STATUSES = ["Borrador", "Pendiente", "En Revision", "Aprobado", "Retornado", "Finalizado"];

const exportColumns: ExportColumn[] = [
  { key: "instanceId", label: "Expediente", formatter: (val) => formatExpedienteCode(val as string | number) },
  { key: "processName", label: "Proceso" },
  { key: "currentStatus", label: "Estado" },
  { key: "createdByName", label: "Creado por" },
  { key: "createdAt", label: "Fecha de Creacion", formatter: (val) => val ? formatDate(String(val)) : "" },
  { key: "totalFiles", label: "Archivos", formatter: (val) => String(val ?? 0) },
];

function processMatchesSearch(process: ProcessHierarchy, term: string): boolean {
  const lower = term.toLowerCase();
  if (process.processName.toLowerCase().includes(lower)) return true;
  if (process.children?.some((c) => c.processName.toLowerCase().includes(lower))) return true;
  return false;
}

function ProcessSelector({
  processes,
  selectedIds,
  onToggle,
  service,
}: {
  processes: ProcessHierarchy[];
  selectedIds: Set<number>;
  onToggle: (id: number, isMacro: boolean, children?: ProcessHierarchy[]) => void;
  service: IDocflowService;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const set = new Set<number>();
    for (const p of processes) {
      if (p.children && p.children.length > 0) set.add(p.processId);
    }
    return set;
  });

  const [searchTerm, setSearchTerm] = useState("");

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allInstances = service.getInstances();

  const filteredProcesses = useMemo(() => {
    if (!searchTerm.trim()) return processes;
    return processes.filter((p) => processMatchesSearch(p, searchTerm));
  }, [processes, searchTerm]);

  const isSearching = searchTerm.trim().length > 0;

  const filteredChildren = useCallback((parent: ProcessHierarchy) => {
    const children = parent.children;
    if (!children) return [];
    if (!isSearching) return children;
    const lower = searchTerm.toLowerCase();
    if (parent.processName.toLowerCase().includes(lower)) return children;
    return children.filter((c) => c.processName.toLowerCase().includes(lower));
  }, [searchTerm, isSearching]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proceso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-8 h-9 text-sm"
          data-testid="input-search-process"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filteredProcesses.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <Search className="h-6 w-6 mx-auto mb-1 opacity-40" />
          <p className="text-xs">No se encontraron procesos</p>
        </div>
      )}

      <div className="flex flex-col gap-0.5 max-h-[400px] overflow-y-auto">
        {filteredProcesses.map((process) => {
          const isExpanded = isSearching || expanded.has(process.processId);
          const hasChildren = process.children && process.children.length > 0;
          const visibleChildren = filteredChildren(process);
          const showChildren = hasChildren && isExpanded && visibleChildren.length > 0;
          const childIds = process.children?.map((c) => c.processId) || [];
          const allChildrenSelected = hasChildren && childIds.every((id) => selectedIds.has(id));
          const someChildrenSelected = hasChildren && childIds.some((id) => selectedIds.has(id));
          const instanceCount = hasChildren
            ? allInstances.filter((i) => childIds.includes(i.processId)).length
            : allInstances.filter((i) => i.processId === process.processId).length;

          return (
            <div key={process.processId}>
              <button
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  hasChildren
                    ? allChildrenSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/80"
                    : selectedIds.has(process.processId)
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted/80"
                }`}
                onClick={() => {
                  if (hasChildren) {
                    toggleExpand(process.processId);
                  } else {
                    onToggle(process.processId, false);
                  }
                }}
                data-testid={`button-search-process-${process.processId}`}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )
                ) : (
                  <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                    selectedIds.has(process.processId)
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/40"
                  }`}>
                    {selectedIds.has(process.processId) && (
                      <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                  hasChildren ? "bg-primary/10" : "bg-muted"
                }`}>
                  {hasChildren ? (
                    <FolderTree className="h-3 w-3 text-primary" />
                  ) : (
                    <Layers className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-sm flex-1 min-w-0 truncate ${hasChildren ? "font-semibold" : "font-medium"}`}>
                  {process.processName}
                </span>
                <Badge variant="secondary" className="text-[10px] shrink-0 h-5 px-1.5">
                  {instanceCount}
                </Badge>
              </button>

              {showChildren && (
                <div className="ml-4 pl-3 border-l border-border">
                  {visibleChildren.map((child) => {
                    const childCount = allInstances.filter((i) => i.processId === child.processId).length;
                    return (
                      <button
                        key={child.processId}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${
                          selectedIds.has(child.processId)
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "hover:bg-muted/80"
                        }`}
                        onClick={() => onToggle(child.processId, false)}
                        data-testid={`button-search-process-${child.processId}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                          selectedIds.has(child.processId)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/40"
                        }`}>
                          {selectedIds.has(child.processId) && (
                            <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted">
                          <FileStack className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">{child.processName}</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0 h-5 px-1.5">
                          {childCount}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type SortField = "instanceId" | "createdAt" | "currentStatus";

export default function SearchInstances() {
  const service = useDocflowService();
  const processes = service.getProcesses();
  const allInstances = service.getInstances();
  const isMobile = useIsMobile();

  const [selectedProcessIds, setSelectedProcessIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [textSearch, setTextSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleToggleProcess = (id: number, _isMacro: boolean) => {
    setSelectedProcessIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedProcessIds.size > 0) count++;
    if (statusFilter !== ALL_STATUS) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (textSearch.trim()) count++;
    return count;
  }, [selectedProcessIds, statusFilter, dateFrom, dateTo, textSearch]);

  const clearFilters = () => {
    setSelectedProcessIds(new Set());
    setStatusFilter(ALL_STATUS);
    setDateFrom("");
    setDateTo("");
    setTextSearch("");
  };

  const filtered = useMemo(() => {
    let items = [...allInstances];

    if (selectedProcessIds.size > 0) {
      items = items.filter((i) => selectedProcessIds.has(i.processId));
    }

    if (statusFilter !== ALL_STATUS) {
      items = items.filter((i) => i.currentStatus === statusFilter);
    }

    if (textSearch.trim()) {
      const lower = textSearch.toLowerCase();
      items = items.filter((i) =>
        i.processName?.toLowerCase().includes(lower) ||
        i.createdByName?.toLowerCase().includes(lower) ||
        String(i.instanceId).includes(lower) ||
        formatExpedienteCode(i.instanceId).toLowerCase().includes(lower)
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      items = items.filter((i) => new Date(i.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      items = items.filter((i) => new Date(i.createdAt) <= to);
    }

    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === "instanceId") cmp = Number(a.instanceId) - Number(b.instanceId);
      else if (sortField === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === "currentStatus") cmp = (a.currentStatus || "").localeCompare(b.currentStatus || "");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [allInstances, selectedProcessIds, statusFilter, dateFrom, dateTo, textSearch, sortField, sortDir]);

  const handleExport = () => {
    const data = filtered.map((i) => ({ ...i } as unknown as Record<string, unknown>));
    const timestamp = new Date().toISOString().slice(0, 10);
    exportToCSV(data, exportColumns, `busqueda_expedientes_${timestamp}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6" data-testid="page-search-instances">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Search className="h-5 w-5 text-primary" />
            Busqueda de Expedientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Busca expedientes por proceso, estado, fecha y mas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-active-filters">
              <Filter className="h-3 w-3" />
              {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-all-filters">
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-[280px_1fr]"}`}>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                Procesos
                {selectedProcessIds.size > 0 && (
                  <Badge variant="default" className="text-[10px] h-5 px-1.5">
                    {selectedProcessIds.size}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ProcessSelector
                processes={processes}
                selectedIds={selectedProcessIds}
                onToggle={handleToggleProcess}
                service={service}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Texto</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por codigo, nombre..."
                    value={textSearch}
                    onChange={(e) => setTextSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                    data-testid="input-text-search"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-status-filter">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATUS}>Todos los estados</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Desde
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 text-sm"
                  data-testid="input-date-from"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Hasta
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 text-sm"
                  data-testid="input-date-to"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground" data-testid="text-result-count">
              {filtered.length} expediente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </p>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0} data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">No se encontraron expedientes</p>
                <p className="text-xs mt-1">
                  {selectedProcessIds.size === 0
                    ? "Selecciona uno o mas procesos para ver sus expedientes"
                    : "Intenta ajustar los filtros de busqueda"}
                </p>
              </CardContent>
            </Card>
          ) : isMobile ? (
            <div className="flex flex-col gap-2">
              {filtered.map((instance) => (
                <Link key={instance.instanceId} href={`/DocFlow/expedientes/${instance.instanceId}`}>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors" data-testid={`card-instance-${instance.instanceId}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" data-testid={`text-instance-code-${instance.instanceId}`}>
                          {formatExpedienteCode(instance.instanceId)}
                        </span>
                        <StatusBadge status={instance.currentStatus} />
                      </div>
                      <p className="text-xs text-muted-foreground">{instance.processName}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{instance.createdByName}</span>
                        <span>{formatDate(instance.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("instanceId")} data-testid="button-sort-id">
                        Expediente
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>Proceso</TableHead>
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("currentStatus")} data-testid="button-sort-status">
                        Estado
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("createdAt")} data-testid="button-sort-date">
                        Fecha
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>Archivos</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((instance) => (
                    <TableRow key={instance.instanceId} data-testid={`row-instance-${instance.instanceId}`}>
                      <TableCell className="font-medium" data-testid={`text-instance-code-${instance.instanceId}`}>
                        {formatExpedienteCode(instance.instanceId)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{instance.processName}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={instance.currentStatus} />
                      </TableCell>
                      <TableCell className="text-sm">{instance.createdByName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(instance.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">{instance.totalFiles ?? 0}</TableCell>
                      <TableCell>
                        <Link href={`/DocFlow/expedientes/${instance.instanceId}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-view-${instance.instanceId}`}>
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
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
