import { useState, useMemo } from "react";
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
  Calendar,
  Download,
  ArrowUpDown,
  Hash,
  Clock,
  Filter,
  History,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import { formatDate, formatDateTime, formatExpedienteCode } from "@/lib/docflow/formatters";
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

type SortField = "instanceId" | "createdAt" | "currentStatus" | "processName";

export default function GeneralSearch() {
  const service = useDocflowService();
  const allInstances = service.getInstances();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [hasSearched, setHasSearched] = useState(false);

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
    if (searchQuery.trim()) count++;
    if (statusFilter !== ALL_STATUS) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [searchQuery, statusFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter(ALL_STATUS);
    setDateFrom("");
    setDateTo("");
    setHasSearched(false);
  };

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const results = useMemo(() => {
    if (!hasSearched && activeFilterCount === 0) return [];

    let items = [...allInstances];

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      items = items.filter((i) => {
        const code = formatExpedienteCode(i.instanceId).toLowerCase();
        const idStr = String(i.instanceId);
        return (
          code.includes(lower) ||
          idStr.includes(lower) ||
          i.processName?.toLowerCase().includes(lower) ||
          i.createdByName?.toLowerCase().includes(lower) ||
          (i.dynamicMetadata && JSON.stringify(i.dynamicMetadata).toLowerCase().includes(lower))
        );
      });
    }

    if (statusFilter !== ALL_STATUS) {
      items = items.filter((i) => i.currentStatus === statusFilter);
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
      else if (sortField === "processName") cmp = (a.processName || "").localeCompare(b.processName || "");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [allInstances, searchQuery, statusFilter, dateFrom, dateTo, sortField, sortDir, hasSearched, activeFilterCount]);

  const handleExport = () => {
    const data = results.map((i) => ({ ...i } as unknown as Record<string, unknown>));
    exportToCSV(data, exportColumns, `busqueda_general_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6" data-testid="page-general-search">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Search className="h-5 w-5 text-primary" />
          Busqueda General
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Busca expedientes por codigo, nombre, creador o fecha
        </p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ingresa codigo de expediente (EXP-0001), nombre de proceso o creador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 text-sm"
                  data-testid="input-general-search"
                />
              </div>
              <Button onClick={handleSearch} data-testid="button-search">
                <Search className="h-4 w-4 mr-1" />
                Buscar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setHasSearched(true); }}>
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
                  onChange={(e) => { setDateFrom(e.target.value); setHasSearched(true); }}
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
                  onChange={(e) => { setDateTo(e.target.value); setHasSearched(true); }}
                  className="h-9 text-sm"
                  data-testid="input-date-to"
                />
              </div>

              <div className="flex items-end gap-2">
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9" data-testid="button-clear-filters">
                    <X className="h-4 w-4 mr-1" />
                    Limpiar ({activeFilterCount})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasSearched && activeFilterCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-base font-medium">Ingresa un termino de busqueda</p>
            <p className="text-sm mt-1 text-center max-w-md">
              Puedes buscar por codigo de expediente (ej: EXP-0001), nombre del proceso,
              nombre del creador, o filtrar por estado y rango de fechas
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground" data-testid="text-result-count">
                {results.length} resultado{results.length !== 1 ? "s" : ""}
              </p>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Filter className="h-3 w-3" />
                  {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={results.length === 0} data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">No se encontraron expedientes</p>
                <p className="text-xs mt-1">Intenta con otro termino o ajusta los filtros</p>
              </CardContent>
            </Card>
          ) : isMobile ? (
            <div className="flex flex-col gap-2">
              {results.map((instance) => (
                <Card key={instance.instanceId} className="hover:bg-muted/50 transition-colors" data-testid={`card-instance-${instance.instanceId}`}>
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
                    <div className="flex items-center gap-1.5 mt-2">
                      <Link href={`/DocFlow/expedientes/${instance.instanceId}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs" data-testid={`button-view-${instance.instanceId}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      </Link>
                      <Link href={`/DocFlow/expedientes/${instance.instanceId}/historial`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" data-testid={`button-history-${instance.instanceId}`}>
                          <History className="h-3 w-3 mr-1" />
                          Historial
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
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
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("processName")} data-testid="button-sort-process">
                        Proceso
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
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
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((instance) => (
                    <TableRow key={instance.instanceId} data-testid={`row-instance-${instance.instanceId}`}>
                      <TableCell className="font-medium" data-testid={`text-instance-code-${instance.instanceId}`}>
                        {formatExpedienteCode(instance.instanceId)}
                      </TableCell>
                      <TableCell className="text-sm">{instance.processName}</TableCell>
                      <TableCell>
                        <StatusBadge status={instance.currentStatus} />
                      </TableCell>
                      <TableCell className="text-sm">{instance.createdByName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(instance.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">{instance.totalFiles ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
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
                          <Link href={`/DocFlow/expedientes/${instance.instanceId}/historial`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-history-${instance.instanceId}`}>
                                  <History className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Ver historial</TooltipContent>
                            </Tooltip>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
