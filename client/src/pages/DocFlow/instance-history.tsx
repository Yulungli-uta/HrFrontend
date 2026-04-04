import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
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
import { StatusBadge } from "@/components/docflow/status-badge";
import {
  ArrowLeft,
  ArrowRightLeft,
  RotateCcw,
  Calendar,
  User,
  Hash,
  FileText,
  GitBranch,
  Building2,
  Filter,
  X,
  Download,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import { formatDate, formatDateTime, formatExpedienteCode } from "@/lib/docflow/formatters";
import { exportToCSV, type ExportColumn } from "@/lib/docflow/export-utils";
import type { WorkflowMovement } from "@/types/docflow/docflow.types";

const ALL_TYPES = "__ALL__";

const exportColumns: ExportColumn[] = [
  { key: "movementId", label: "ID Movimiento" },
  { key: "movementType", label: "Tipo", formatter: (val) => val === "RETURN" ? "Retorno" : "Avance" },
  { key: "fromStatus", label: "Estado Origen" },
  { key: "toStatus", label: "Estado Destino" },
  { key: "processName", label: "Proceso" },
  { key: "departmentName", label: "Departamento" },
  { key: "createdByName", label: "Realizado por" },
  { key: "assignedToName", label: "Asignado a" },
  { key: "comments", label: "Comentarios" },
  { key: "createdAt", label: "Fecha", formatter: (val) => val ? formatDateTime(String(val)) : "" },
];

export default function InstanceHistory() {
  const params = useParams<{ id: string }>();
  const instanceId = params.id;
  const service = useDocflowService();
  const instance = service.getInstanceById(instanceId!);
  const movements = service.getMovementsByInstance(instanceId!);
  const documents = service.getDocumentsByInstance(instanceId!);

  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());

  const toggleExpanded = (id: string | number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let items = [...movements];

    if (typeFilter !== ALL_TYPES) {
      items = items.filter((m) => m.movementType === typeFilter);
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(
        (m) =>
          m.createdByName?.toLowerCase().includes(lower) ||
          m.assignedToName?.toLowerCase().includes(lower) ||
          m.comments?.toLowerCase().includes(lower) ||
          m.processName?.toLowerCase().includes(lower) ||
          m.departmentName?.toLowerCase().includes(lower) ||
          m.fromStatus?.toLowerCase().includes(lower) ||
          m.toStatus?.toLowerCase().includes(lower)
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      items = items.filter((m) => new Date(m.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      items = items.filter((m) => new Date(m.createdAt) <= to);
    }

    return items;
  }, [movements, typeFilter, searchTerm, dateFrom, dateTo]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== ALL_TYPES) count++;
    if (searchTerm.trim()) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [typeFilter, searchTerm, dateFrom, dateTo]);

  const clearFilters = () => {
    setTypeFilter(ALL_TYPES);
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
  };

  const stats = useMemo(() => {
    const advances = movements.filter((m) => m.movementType !== "RETURN").length;
    const returns = movements.filter((m) => m.movementType === "RETURN").length;
    const uniqueUsers = new Set(movements.map((m) => m.createdByName).filter(Boolean)).size;
    return { total: movements.length, advances, returns, uniqueUsers };
  }, [movements]);

  const handleExport = () => {
    const data = filtered.map((m) => ({ ...m } as unknown as Record<string, unknown>));
    const code = formatExpedienteCode(instanceId!).replace(/\s+/g, "_");
    exportToCSV(data, exportColumns, `historial_${code}_${new Date().toISOString().slice(0, 10)}`);
  };

  if (!instance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <FileText className="h-12 w-12 mb-3" />
        <p className="text-base font-medium">Expediente no encontrado</p>
        <Link href="/DocFlow/expedientes">
          <Button variant="link" className="mt-2" data-testid="link-back-instances">
            Volver a expedientes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6" data-testid="page-instance-history">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/DocFlow/expedientes/${instanceId}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-detail">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Volver al expediente</TooltipContent>
          </Tooltip>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Clock className="h-5 w-5 text-primary" />
            Historial del Expediente
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="gap-1 text-xs" data-testid="text-instance-code">
              <Hash className="h-3 w-3" />
              {formatExpedienteCode(instanceId!)}
            </Badge>
            <StatusBadge status={instance.currentStatus} />
            <span className="text-sm text-muted-foreground">{instance.processName}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0} data-testid="button-export-history">
          <Download className="h-4 w-4 mr-1" />
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold" data-testid="stat-total-movements">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground">Movimientos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15">
              <ArrowRightLeft className="h-4 w-4 text-success dark:text-success/80" />
            </div>
            <div>
              <p className="text-lg font-bold" data-testid="stat-advances">{stats.advances}</p>
              <p className="text-[11px] text-muted-foreground">Avances</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15">
              <RotateCcw className="h-4 w-4 text-destructive dark:text-destructive/80" />
            </div>
            <div>
              <p className="text-lg font-bold" data-testid="stat-returns">{stats.returns}</p>
              <p className="text-[11px] text-muted-foreground">Retornos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 dark:bg-blue-900/30">
              <User className="h-4 w-4 text-primary dark:text-primary/70" />
            </div>
            <div>
              <p className="text-lg font-bold" data-testid="stat-users">{stats.uniqueUsers}</p>
              <p className="text-[11px] text-muted-foreground">Participantes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </CardTitle>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar en historial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm"
                data-testid="input-search-history"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-type-filter">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>Todos los tipos</SelectItem>
                <SelectItem value="ADVANCE">Avances</SelectItem>
                <SelectItem value="RETURN">Retornos</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-sm"
              placeholder="Desde"
              data-testid="input-date-from"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-sm"
              placeholder="Hasta"
              data-testid="input-date-to"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" data-testid="text-result-count">
          {filtered.length} movimiento{filtered.length !== 1 ? "s" : ""}
          {activeFilterCount > 0 ? " (filtrado)" : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {documents.length} documento{documents.length !== 1 ? "s" : ""} asociados
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ArrowRightLeft className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">Sin movimientos</p>
            <p className="text-xs mt-1">
              {activeFilterCount > 0
                ? "No se encontraron movimientos con los filtros aplicados"
                : "Este expediente aun no tiene movimientos registrados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="relative">
              <div className="absolute left-[29px] md:left-[33px] top-6 bottom-6 w-px bg-border" />
              <div className="flex flex-col">
                {filtered.map((mov, idx) => {
                  const isReturn = mov.movementType === "RETURN";
                  const isLast = idx === filtered.length - 1;
                  const isExpanded = expandedIds.has(mov.movementId);

                  return (
                    <div
                      key={mov.movementId}
                      className={`relative flex gap-4 p-4 md:px-6 transition-colors ${
                        isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
                      } ${idx !== filtered.length - 1 ? "border-b border-border/50" : ""}`}
                      data-testid={`timeline-movement-${mov.movementId}`}
                    >
                      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                        isReturn
                          ? "border-destructive/40 bg-destructive/15 dark:border-destructive/60"
                          : isLast
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card"
                      }`}>
                        {isReturn ? (
                          <RotateCcw className="h-4 w-4 text-destructive dark:text-destructive/80" />
                        ) : (
                          <ArrowRightLeft className="h-4 w-4 text-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${isReturn ? "text-destructive dark:text-destructive/80" : ""}`}>
                              {isReturn ? "Retorno" : "Avance"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {mov.fromStatus} &rarr; {mov.toStatus}
                            </Badge>
                          </div>
                          <button
                            onClick={() => toggleExpanded(mov.movementId)}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            data-testid={`button-expand-movement-${mov.movementId}`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {mov.createdByName}
                          </span>
                          {mov.assignedToName && (
                            <span className="flex items-center gap-1">
                              &rarr; {mov.assignedToName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(mov.createdAt)}
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            {(mov.processName || mov.departmentName) && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {mov.processName && (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                                    <GitBranch className="h-3 w-3" />
                                    {mov.processName}
                                  </span>
                                )}
                                {mov.departmentName && (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                    <Building2 className="h-3 w-3" />
                                    {mov.departmentName}
                                  </span>
                                )}
                              </div>
                            )}

                            {mov.comments && (
                              <div className="rounded-md bg-muted/50 border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1 font-medium">Comentarios:</p>
                                <p className="text-sm">{mov.comments}</p>
                              </div>
                            )}

                            {!mov.comments && !mov.processName && !mov.departmentName && (
                              <p className="text-xs text-muted-foreground italic">Sin detalles adicionales</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
