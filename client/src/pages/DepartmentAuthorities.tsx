// src/pages/catalogs/DepartmentAuthorities.tsx
/**
 * Página de catálogo: Autoridades de Departamento.
 *
 * Funcionalidades:
 *  - Listado paginado con búsqueda en tiempo real
 *  - Filtro por estado (activos / todos)
 *  - Consulta de denominación por cédula
 *  - CRUD completo: crear, editar, cambiar estado, eliminar
 *  - Diseño UX profesional con dark/light mode
 */
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Building2,
  User2,
  Calendar,
  FileText,
  IdCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataPagination } from "@/components/ui/DataPagination";
import { useToast } from "@/hooks/use-toast";
import {
  DepartmentAuthoritiesAPI,
  type DepartmentAuthorityDto,
  type DepartmentAuthorityDenominationDto,
} from "@/lib/api";
import { DepartmentAuthorityForm } from "@/components/forms/DepartmentAuthorityForm";

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-EC", {
      day:   "2-digit",
      month: "short",
      year:  "numeric",
    });
  } catch {
    return dateStr;
  }
}

function normalizePagedResponse(res: any) {
  const raw = res?.data ?? res ?? {};
  const nested = raw?.data ?? raw;
  return {
    items:           nested?.items          ?? nested?.data ?? [],
    page:            nested?.page           ?? 1,
    pageSize:        nested?.pageSize       ?? 20,
    totalCount:      nested?.totalCount     ?? 0,
    totalPages:      nested?.totalPages     ?? 0,
    hasPreviousPage: nested?.hasPreviousPage ?? false,
    hasNextPage:     nested?.hasNextPage     ?? false,
  };
}

// =============================================================================
// Subcomponente: Panel de estadísticas
// =============================================================================

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

function StatsCard({ label, value, icon: Icon, colorClass }: StatsCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {label}
            </p>
            <p className={`text-2xl font-bold mt-0.5 ${colorClass}`}>{value}</p>
          </div>
          <div className={`rounded-full p-2.5 ${colorClass.replace("text-", "bg-").replace("primary", "primary/10").replace("success", "success/10").replace("warning", "warning/10").replace("destructive", "destructive/10")}`}>
            <Icon className={`h-5 w-5 ${colorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Subcomponente: Modal de consulta por cédula
// =============================================================================

function DenominationLookup() {
  const [idCard, setIdCard] = useState("");
  const [result, setResult] = useState<DepartmentAuthorityDenominationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!idCard.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await DepartmentAuthoritiesAPI.getDenominationByIdCard(idCard.trim());
      const data = (res as any)?.data ?? res;
      if (data) {
        setResult(data);
      } else {
        setError("No se encontró denominación para la cédula ingresada.");
      }
    } catch {
      setError("No se encontró denominación para la cédula ingresada.");
    } finally {
      setLoading(false);
    }
  }, [idCard]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <IdCard className="h-4 w-4 text-primary" />
          Consultar Denominación por Cédula
        </CardTitle>
        <CardDescription className="text-xs">
          Ingrese el número de cédula para obtener la denominación vigente del funcionario.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Ej: 1803456789"
            value={idCard}
            onChange={(e) => setIdCard(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            maxLength={13}
            className="bg-background text-foreground"
          />
          <Button
            onClick={handleSearch}
            disabled={loading || !idCard.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{result.employeeFullName}</span>
              <Badge
                variant={result.isActive ? "default" : "secondary"}
                className={result.isActive ? "bg-success/15 text-success border-success/30" : ""}
              >
                {result.isActive ? "Vigente" : "Inactiva"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <span className="text-xs font-medium text-foreground/70">Cédula:</span>
              <span className="text-xs">{result.idCard}</span>
              <span className="text-xs font-medium text-foreground/70">Denominación:</span>
              <span className="text-xs font-semibold text-primary">{result.denomination ?? "—"}</span>
              <span className="text-xs font-medium text-foreground/70">Tipo:</span>
              <span className="text-xs">{result.authorityTypeName}</span>
              <span className="text-xs font-medium text-foreground/70">Departamento:</span>
              <span className="text-xs">{result.departmentName}</span>
              <span className="text-xs font-medium text-foreground/70">Desde:</span>
              <span className="text-xs">{formatDate(result.startDate)}</span>
              {result.endDate && (
                <>
                  <span className="text-xs font-medium text-foreground/70">Hasta:</span>
                  <span className="text-xs">{formatDate(result.endDate)}</span>
                </>
              )}
              {result.resolutionCode && (
                <>
                  <span className="text-xs font-medium text-foreground/70">Resolución:</span>
                  <span className="text-xs">{result.resolutionCode}</span>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Página principal
// =============================================================================

export default function DepartmentAuthoritiesPage() {
  // ── Estado ───────────────────────────────────────────────────────────────────
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(20);
  const [search, setSearch]       = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DepartmentAuthorityDto | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [showLookup, setShowLookup] = useState(false);

  const { toast }        = useToast();
  const queryClient      = useQueryClient();

  // ── Query paginada ────────────────────────────────────────────────────────────
  const queryKey = ["department-authorities", page, pageSize, search, onlyActive];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await DepartmentAuthoritiesAPI.listPaged({
        page,
        pageSize,
        search:     search.trim() || undefined,
        onlyActive: onlyActive || undefined,
      });
      return normalizePagedResponse(res);
    },
    placeholderData: (prev) => prev,
  });

  const items       = data?.items       ?? [] as DepartmentAuthorityDto[];
  const totalCount  = data?.totalCount  ?? 0;
  const totalPages  = data?.totalPages  ?? 0;
  const hasPrev     = data?.hasPreviousPage ?? false;
  const hasNext     = data?.hasNextPage     ?? false;

  // ── Estadísticas derivadas ────────────────────────────────────────────────────
  const activeCount   = useMemo(() => items.filter((i: DepartmentAuthorityDto) => i.isActive).length, [items]);
  const inactiveCount = useMemo(() => items.filter((i: DepartmentAuthorityDto) => !i.isActive).length, [items]);
  const currentCount  = useMemo(() => items.filter((i: DepartmentAuthorityDto) => i.isActive && !i.endDate).length, [items]);

  // ── Mutación: eliminar ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => DepartmentAuthoritiesAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-authorities"] });
      toast({ title: "Registro eliminado", description: "La autoridad fue eliminada exitosamente." });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({
        title:       "Error al eliminar",
        description: err?.message ?? "No se pudo eliminar el registro.",
        variant:     "destructive",
      });
    },
  });

  // ── Mutación: cambiar estado ──────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      DepartmentAuthoritiesAPI.changeStatus(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["department-authorities"] });
      toast({
        title: variables.isActive ? "Autoridad activada" : "Autoridad desactivada",
        description: `El registro fue ${variables.isActive ? "activado" : "desactivado"} exitosamente.`,
      });
    },
    onError: (err: any) => {
      toast({
        title:       "Error al cambiar estado",
        description: err?.message ?? "No se pudo cambiar el estado.",
        variant:     "destructive",
      });
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: DepartmentAuthorityDto) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
  }, []);

  const handleFormCancel = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">

        {/* ── Encabezado ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-primary/10 p-2">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Autoridades de Departamento
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestión de autoridades y denominaciones por unidad organizacional
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLookup((v) => !v)}
              className="gap-1.5"
            >
              <IdCard className="h-4 w-4" />
              Consultar por Cédula
              {showLookup ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Nueva Autoridad
            </Button>
          </div>
        </div>

        {/* ── Panel de consulta por cédula (colapsable) ── */}
        {showLookup && (
          <div className="max-w-lg">
            <DenominationLookup />
          </div>
        )}

        {/* ── Estadísticas ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatsCard
            label="Total"
            value={totalCount}
            icon={Shield}
            colorClass="text-primary"
          />
          <StatsCard
            label="Activas"
            value={activeCount}
            icon={CheckCircle2}
            colorClass="text-success"
          />
          <StatsCard
            label="Vigentes"
            value={currentCount}
            icon={Calendar}
            colorClass="text-warning"
          />
          <StatsCard
            label="Inactivas"
            value={inactiveCount}
            icon={XCircle}
            colorClass="text-destructive"
          />
        </div>

        {/* ── Filtros ── */}
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar por empleado, departamento, denominación o resolución..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 bg-background text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={onlyActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setOnlyActive((v) => !v); setPage(1); }}
                  className={onlyActive ? "bg-success/15 text-success border-success/30 hover:bg-success/25" : ""}
                >
                  {onlyActive ? (
                    <ToggleRight className="h-4 w-4 mr-1.5" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 mr-1.5" />
                  )}
                  {onlyActive ? "Solo activas" : "Todos los estados"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tabla ── */}
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-0 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Listado de Autoridades
              </CardTitle>
              <CardDescription className="text-xs">
                {totalCount > 0
                  ? `${totalCount.toLocaleString()} registro${totalCount !== 1 ? "s" : ""} encontrado${totalCount !== 1 ? "s" : ""}`
                  : "Sin resultados"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0 mt-3">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <AlertTriangle className="h-10 w-10 text-destructive/60" />
                <p className="text-sm text-muted-foreground">
                  No se pudo cargar la información. Intente recargar.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            ) : isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Shield className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "No se encontraron registros con ese criterio de búsqueda."
                    : "No hay autoridades registradas aún."}
                </p>
                {!search && (
                  <Button size="sm" onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Registrar primera autoridad
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs font-semibold uppercase">
                        <div className="flex items-center gap-1.5">
                          <User2 className="h-3.5 w-3.5" />
                          Empleado
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold uppercase">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          Departamento
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold uppercase">
                        <div className="flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5" />
                          Tipo / Denominación
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold uppercase">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Vigencia
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold uppercase">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          Resolución
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold uppercase text-center">
                        Estado
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold uppercase text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: DepartmentAuthorityDto) => (
                      <TableRow
                        key={item.authorityId}
                        className="border-border hover:bg-muted/40 transition-colors"
                      >
                        {/* Empleado */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">
                              {item.employeeFullName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              CI: {item.employeeIdCard}
                            </span>
                          </div>
                        </TableCell>

                        {/* Departamento */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-foreground">
                              {item.departmentName}
                            </span>
                            {item.departmentCode && (
                              <span className="text-xs text-muted-foreground">
                                {item.departmentCode}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Tipo / Denominación */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className="text-xs w-fit border-primary/30 text-primary bg-primary/5"
                            >
                              {item.authorityTypeName}
                            </Badge>
                            {item.denomination && (
                              <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {item.denomination}
                              </span>
                            )}
                            {item.jobName && (
                              <span className="text-xs text-muted-foreground/70 italic">
                                {item.jobName}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Vigencia */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-foreground">
                              {formatDate(item.startDate)}
                            </span>
                            {item.endDate ? (
                              <span className="text-xs text-muted-foreground">
                                hasta {formatDate(item.endDate)}
                              </span>
                            ) : (
                              <span className="text-xs text-success font-medium">
                                Indefinida
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Resolución */}
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {item.resolutionCode ?? "—"}
                          </span>
                        </TableCell>

                        {/* Estado */}
                        <TableCell className="text-center">
                          <Badge
                            variant={item.isActive ? "default" : "secondary"}
                            className={
                              item.isActive
                                ? "bg-success/15 text-success border-success/30 text-xs"
                                : "bg-muted text-muted-foreground text-xs"
                            }
                          >
                            {item.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => handleOpenEdit(item)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${
                                    item.isActive
                                      ? "hover:bg-warning/10 hover:text-warning"
                                      : "hover:bg-success/10 hover:text-success"
                                  }`}
                                  onClick={() =>
                                    statusMutation.mutate({
                                      id:       item.authorityId,
                                      isActive: !item.isActive,
                                    })
                                  }
                                  disabled={statusMutation.isPending}
                                >
                                  {item.isActive ? (
                                    <ToggleRight className="h-3.5 w-3.5" />
                                  ) : (
                                    <ToggleLeft className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {item.isActive ? "Desactivar" : "Activar"}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setDeleteId(item.authorityId)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginación */}
            {totalPages > 0 && (
              <div className="border-t border-border">
                <DataPagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  hasPreviousPage={hasPrev}
                  hasNextPage={hasNext}
                  onPageChange={(p) => setPage(p)}
                  onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                  disabled={isLoading}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Dialog: Formulario Crear / Editar ── */}
        <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleFormCancel(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Shield className="h-5 w-5 text-primary" />
                {editingItem ? "Editar Autoridad" : "Nueva Autoridad de Departamento"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editingItem
                  ? "Modifique los datos de la autoridad de departamento."
                  : "Complete la información para registrar una nueva autoridad."}
              </DialogDescription>
            </DialogHeader>
            <DepartmentAuthorityForm
              authority={editingItem}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>

        {/* ── AlertDialog: Confirmar eliminación ── */}
        <AlertDialog
          open={deleteId !== null}
          onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        >
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirmar eliminación
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Esta acción eliminará permanentemente el registro de autoridad. Esta operación
                no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </TooltipProvider>
  );
}
