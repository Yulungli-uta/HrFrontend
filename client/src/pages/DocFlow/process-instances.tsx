import { useState, useMemo, useCallback } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  ArrowLeft,
  FileText,
  Eye,
  FolderTree,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Circle,
  Layers,
  FileStack,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import type { IDocflowService } from "@/services/docflow/docflow-service.interface";
import type { ProcessHierarchy, WorkflowInstance } from "@/types/docflow/docflow.types";
import { formatDate, formatExpedienteCode } from "@/lib/docflow/formatters";
import { computeMandatoryCompletion } from "@/lib/docflow/process-visibility";
import { useIsMobile } from "@/hooks/use-mobile";

function processMatchesSearch(process: ProcessHierarchy, term: string): boolean {
  const lower = term.toLowerCase();
  if (process.processName.toLowerCase().includes(lower)) return true;
  if (process.children?.some((c) => c.processName.toLowerCase().includes(lower))) return true;
  return false;
}

function ProcessTree({
  processes,
  selectedId,
  onSelect,
  service,
}: {
  processes: ProcessHierarchy[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  service: IDocflowService;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const set = new Set<number>();
    for (const p of processes) {
      if (p.children && p.children.length > 0) {
        set.add(p.processId);
      }
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
    <div className="flex flex-col gap-2" data-testid="process-tree">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proceso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-8 h-9 text-sm"
          data-testid="input-search-process-tree"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-process-search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filteredProcesses.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No se encontraron procesos</p>
          <p className="text-xs mt-1">Intenta con otro termino de busqueda</p>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {filteredProcesses.map((process) => {
          const isExpanded = isSearching || expanded.has(process.processId);
          const hasChildren = process.children && process.children.length > 0;
          const isMacro = hasChildren;
          const visibleChildren = filteredChildren(process);
          const showChildren = isMacro && isExpanded && visibleChildren.length > 0;
          const macroInstanceCount = hasChildren
            ? allInstances.filter((i) =>
                process.children!.some((c) => c.processId === i.processId)
              ).length
            : allInstances.filter((i) => i.processId === process.processId).length;

          return (
            <div key={process.processId}>
              <button
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  selectedId === process.processId && !isMacro
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-muted/80"
                }`}
                onClick={() => {
                  if (isMacro) {
                    toggleExpand(process.processId);
                  } else {
                    onSelect(process.processId);
                  }
                }}
                data-testid={`button-process-${process.processId}`}
              >
                {isMacro ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )
                ) : (
                  <div className="w-4" />
                )}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  isMacro ? "bg-primary/10" : "bg-muted"
                }`}>
                  {isMacro ? (
                    <FolderTree className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${isMacro ? "font-semibold" : "font-medium"}`}>
                    {process.processName}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {macroInstanceCount}
                </Badge>
              </button>

              {showChildren && (
                <div className="ml-4 pl-3 border-l border-border">
                  {visibleChildren.map((child) => {
                    const childCount = allInstances.filter(
                      (i) => i.processId === child.processId
                    ).length;
                    const rules = service.getRulesByProcess(child.processId);
                    const mandatoryCount = rules.filter((r) => r.isMandatory).length;
                    const optionalCount = rules.filter((r) => !r.isMandatory).length;

                    return (
                      <button
                        key={child.processId}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                          selectedId === child.processId
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "hover:bg-muted/80"
                        }`}
                        onClick={() => onSelect(child.processId)}
                        data-testid={`button-process-${child.processId}`}
                      >
                        <div className="w-4" />
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                          <FileStack className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{child.processName}</span>
                          {rules.length > 0 && (
                            <div className="flex items-center gap-2 mt-0.5">
                              {mandatoryCount > 0 && (
                                <span className="text-[10px] text-red-600 dark:text-red-400">
                                  {mandatoryCount} oblig.
                                </span>
                              )}
                              {optionalCount > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {optionalCount} opc.
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
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

function InstanceCompletionBadge({
  instance,
  service,
}: {
  instance: WorkflowInstance;
  service: IDocflowService;
}) {
  const completion = computeMandatoryCompletion(
    instance.processId,
    instance.instanceId,
    {
      getProcessById: (id) => service.getProcessById(id),
      getRulesByProcess: (pid) => service.getRulesByProcess(pid),
      getDocumentsByInstance: (iid) => service.getDocumentsByInstance(iid),
      getInstances: () => service.getInstances(),
      getProcesses: () => service.getProcesses(),
    }
  );

  if (completion.total === 0) return null;

  if (completion.allComplete) {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700 gap-1 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        Completo
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1 text-xs">
      <AlertCircle className="h-3 w-3" />
      {completion.pending} pendiente{completion.pending !== 1 ? "s" : ""}
    </Badge>
  );
}

function ProcessRulesOverview({
  processId,
  service,
}: {
  processId: number;
  service: IDocflowService;
}) {
  const rules = service.getRulesByProcess(processId);
  if (rules.length === 0) return null;

  const mandatory = rules.filter((r) => r.isMandatory);
  const optional = rules.filter((r) => !r.isMandatory);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Requisitos Documentales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rules.map((rule) => (
            <div
              key={rule.ruleId}
              className={`flex items-center gap-2 p-2 rounded-md border text-sm ${
                rule.isMandatory
                  ? "border-red-200 bg-red-50/50 dark:border-red-800/40 dark:bg-red-950/20"
                  : "border-muted bg-muted/30"
              }`}
              data-testid={`rule-overview-${rule.ruleId}`}
            >
              {rule.isMandatory ? (
                <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1 min-w-0 truncate">{rule.docTypeName}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${
                  rule.isMandatory
                    ? "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {rule.isMandatory ? "Obligatorio" : "Opcional"}
              </Badge>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-500" />
            {mandatory.length} obligatorio{mandatory.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Circle className="h-3 w-3" />
            {optional.length} opcional{optional.length !== 1 ? "es" : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function InstancesForProcess({
  processId,
  service,
  isMobile,
}: {
  processId: number;
  service: IDocflowService;
  isMobile: boolean;
}) {
  const allInstances = service.getInstances();
  const process = service.getProcessById(processId);

  const instances = useMemo(
    () => allInstances.filter((i) => i.processId === processId),
    [allInstances, processId]
  );

  if (!process) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-selected-process">
            {process.processName}
          </h2>
          {process.description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {process.description}
            </p>
          )}
        </div>
        <Link href="/expedientes/nuevo">
          <Button size="sm" data-testid="button-new-instance-process">
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </Link>
      </div>

      <ProcessRulesOverview processId={processId} service={service} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Expedientes ({instances.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3" />
              <p className="text-base font-medium">Sin expedientes</p>
              <p className="text-sm mt-1">
                Este subproceso no tiene expedientes registrados
              </p>
            </div>
          ) : isMobile ? (
            <div className="flex flex-col gap-2">
              {instances.map((instance) => (
                <Link
                  key={instance.instanceId}
                  href={`/expedientes/${instance.instanceId}`}
                >
                  <div
                    className="flex items-center gap-3 p-3 rounded-md border border-border hover-elevate cursor-pointer"
                    data-testid={`card-process-instance-${instance.instanceId}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {formatExpedienteCode(instance.instanceId)}
                        </span>
                        <StatusBadge status={instance.currentStatus} />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <InstanceCompletionBadge
                          instance={instance}
                          service={service}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {instance.createdByName} &middot;{" "}
                        {formatDate(instance.createdAt)}
                      </p>
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
                    <TableHead>Estado</TableHead>
                    <TableHead>Obligatorios</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-center">Archivos</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map((instance) => (
                    <TableRow
                      key={instance.instanceId}
                      data-testid={`row-process-instance-${instance.instanceId}`}
                    >
                      <TableCell className="font-semibold text-sm">
                        {formatExpedienteCode(instance.instanceId)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={instance.currentStatus} />
                      </TableCell>
                      <TableCell>
                        <InstanceCompletionBadge
                          instance={instance}
                          service={service}
                        />
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
                        <Link href={`/expedientes/${instance.instanceId}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-view-process-instance-${instance.instanceId}`}
                              >
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProcessInstances() {
  const service = useDocflowService();
  const params = useParams<{ id: string }>();
  const processes = service.getProcesses();
  const isMobile = useIsMobile();

  const parsedId = params.id ? parseInt(params.id) : 0;
  const validInitialId = parsedId > 0 && service.getProcessById(parsedId) ? parsedId : null;
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(validInitialId);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="page-process-instances">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/procesos">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-back-processes">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Volver a procesos</TooltipContent>
          </Tooltip>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-process-instances-title">
            Expedientes por Proceso
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consulta los expedientes agrupados por subproceso
          </p>
        </div>
      </div>

      <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-[280px_1fr]"}`}>
        <Card className={isMobile && selectedProcessId ? "hidden" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              Procesos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ProcessTree
              processes={processes}
              selectedId={selectedProcessId}
              onSelect={(id) => setSelectedProcessId(id)}
              service={service}
            />
          </CardContent>
        </Card>

        <div>
          {isMobile && selectedProcessId && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-3"
              onClick={() => setSelectedProcessId(null)}
              data-testid="button-back-to-tree"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver a procesos
            </Button>
          )}

          {selectedProcessId ? (
            <InstancesForProcess
              processId={selectedProcessId}
              service={service}
              isMobile={isMobile}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FolderTree className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">
                  Selecciona un subproceso
                </p>
                <p className="text-sm mt-1 text-center max-w-sm">
                  Elige un subproceso del arbol para ver sus expedientes y el
                  estado de cumplimiento documental
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
