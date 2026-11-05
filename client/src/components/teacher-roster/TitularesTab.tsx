import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataPagination } from "@/components/ui/DataPagination";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import { TeacherRosterSummaryCards } from "@/components/teacher-roster/TeacherRosterSummaryCards";
import { TeacherRosterTable } from "@/components/teacher-roster/TeacherRosterTable";
import {
  TeacherStructureChangeDialog, type StructureChangeSubmit,
} from "@/components/teacher-roster/TeacherStructureChangeDialog";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useToast } from "@/hooks/use-toast";
import { useActionPermission } from "@/hooks/useActionPermission";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { useTeacherRosterList, useTeacherRosterSummary } from "@/hooks/useTeacherRoster";
import { useAuth } from "@/features/auth";
import { ACTION_PERMISSIONS } from "@/features/actionPermissions";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { categoryLabel, levelLabel } from "@/lib/academicLabels";
import {
  AcademicLadderAPI, TeacherStructuresAPI,
  type AcademicLadderDto, type ApiResponse, type TeacherRosterFilter, type TeacherRosterItemDto, type TeacherRosterStatus,
} from "@/lib/api";

const DEFAULT_PAGE_SIZE = 20;
const ALL = "all";
// Misma clave que usan el catálogo de escalafón y el formulario de cargos: comparten caché.
const LADDERS_KEY = ["/api/v1/rh/academic-ladder"];

/** `apiFetch` no lanza: devuelve `status: 'error'`. Sin esto se mostraría "éxito" ante un rechazo del servidor. */
function ensureSuccess<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (res.status === "error") throw new Error(res.error.message || defaultMessage);
  return res.data;
}

interface TitularesTabProps {
  /** Total con los filtros de esta pestaña (lo muestra la etiqueta de la pestaña). */
  onTotalChange?: (total: number | undefined) => void;
}

/** Pestaña "Titulares": estado, filtros, tarjetas y listado propios (no se comparten con "No titulares"). */
export function TitularesTab({ onTotalChange }: TitularesTabProps) {
  const { user } = useAuth();
  const { can } = useActionPermission();
  // Si la sesión no trae la lista de permisos de acción no se esconde la columna: el servidor solo entrega el RMU con permiso.
  const permissionsLoaded = Array.isArray(user?.actionPermissions);
  const showSalary = permissionsLoaded ? can(ACTION_PERMISSIONS.SALARY_HISTORY_READ) : true;
  const canEditStructure = permissionsLoaded ? can(ACTION_PERMISSIONS.EMPLOYEES_UPDATE) : true;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TeacherRosterStatus>("ACTIVE");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [categoryTypeId, setCategoryTypeId] = useState<number | null>(null);
  const [levelTypeId, setLevelTypeId] = useState<number | null>(null);
  const [dedicationTypeId, setDedicationTypeId] = useState<number | null>(null);
  const [pendingScaleAction, setPendingScaleAction] = useState(false);
  const [ladderMismatch, setLadderMismatch] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [editing, setEditing] = useState<TeacherRosterItemDto | null>(null);
  const [isChangeOpen, setIsChangeOpen] = useState(false);
  const { setIsFormDirty, handleOpenChange, close, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard((open) => {
      setIsChangeOpen(open);
      if (!open) setEditing(null);
    });

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const filter = useMemo<TeacherRosterFilter>(() => ({
    search: debouncedSearch || undefined,
    status,
    departmentId,
    categoryTypeId,
    levelTypeId,
    dedicationTypeId,
    pendingScaleAction: pendingScaleAction ? true : null,
    ladderMismatch: ladderMismatch ? true : null,
  }), [debouncedSearch, status, departmentId, categoryTypeId, levelTypeId, dedicationTypeId, pendingScaleAction, ladderMismatch]);

  const { data: levels } = useRefTypesByCategory(REF_TYPE_CATEGORIES.ACADEMIC_LEVEL);
  const list = useTeacherRosterList(filter, page, pageSize);
  const summary = useTeacherRosterSummary(filter);

  const summaryTotal = summary.data?.total;
  useEffect(() => { onTotalChange?.(summaryTotal); }, [summaryTotal, onTotalChange]);

  // El catálogo de escalones solo se necesita para el diálogo de cambio.
  const ladders = useQuery<AcademicLadderDto[]>({
    queryKey: LADDERS_KEY,
    queryFn: async () => ensureSuccess(await AcademicLadderAPI.getAll(), "Error al cargar el escalafón docente"),
    enabled: canEditStructure,
    staleTime: 5 * 60_000,
  });

  const applyChange = useMutation({
    mutationFn: async (v: StructureChangeSubmit) => {
      if (!editing) throw new Error("No hay un docente seleccionado.");
      return ensureSuccess(
        await TeacherStructuresAPI.applyChange(editing.teacherStructureId, {
          newLadderId: v.ladderId,
          newDedicationTypeId: v.dedicationTypeId,
          weeklyClassHours: v.weeklyClassHours,
          effectiveDate: v.effectiveDate,
          departmentId: v.departmentId,
          reason: v.reason,
        }),
        "Error al actualizar la estructura docente",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-roster"] });
      queryClient.invalidateQueries({ queryKey: LADDERS_KEY });
      toast({ title: "Estructura docente actualizada", description: "Se cerró la anterior y se creó la nueva." });
      close();
    },
    onError: (e: Error) =>
      toast({ title: "No se pudo actualizar la estructura", description: e.message, variant: "destructive" }),
  });

  const items = list.data?.items ?? [];
  const totalCount = Number(list.data?.totalCount ?? 0);
  const totalPages = Math.max(1, Number(list.data?.totalPages ?? 1));

  const refId = (t: { typeId?: number; typeID?: number }) => (t.typeId ?? t.typeID) as number;

  /** Cualquier cambio de filtro vuelve a la primera página. */
  const apply = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  const hasFilters =
    !!search || status !== "ACTIVE" || departmentId != null || categoryTypeId != null || levelTypeId != null ||
    dedicationTypeId != null || pendingScaleAction || ladderMismatch;

  const clearFilters = () => {
    setSearch(""); setStatus("ACTIVE"); setDepartmentId(null); setCategoryTypeId(null); setLevelTypeId(null);
    setDedicationTypeId(null); setPendingScaleAction(false); setLadderMismatch(false); setPage(1);
  };

  return (
    <div>

      <TeacherRosterSummaryCards
        summary={summary.data}
        isLoading={summary.isLoading}
        selectedCategoryId={categoryTypeId}
        selectedLevelId={levelTypeId}
        selectedDedicationId={dedicationTypeId}
        // Elegir una categoría desde su tarjeta reinicia el nivel; la etiqueta de nivel fija categoría y nivel a la vez.
        onSelectCategory={(id) => { setCategoryTypeId(id); setLevelTypeId(null); setPage(1); }}
        onSelectLevel={(categoryId, levelId) => { setCategoryTypeId(categoryId); setLevelTypeId(levelId); setPage(1); }}
        onSelectDedication={apply(setDedicationTypeId)}
        onClearAll={() => { setCategoryTypeId(null); setLevelTypeId(null); setDedicationTypeId(null); setPage(1); }}
      />

      {summary.data && summary.data.activeWithScaleActionWithoutStructure > 0 && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardContent className="pt-4 pb-4 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <span>
              {summary.data.activeWithScaleActionWithoutStructure} empleado(s) activo(s) tienen una acción de escalafón
              firmada pero ninguna estructura docente activa, por eso no aparecen en este listado.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listado de docentes titulares</CardTitle>
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
            <Select value={status} onValueChange={(v) => apply(setStatus)(v as TeacherRosterStatus)}>
              <SelectTrigger aria-label="Estado"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="INACTIVE">Inactivos</SelectItem>
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
            <Select
              value={levelTypeId == null ? ALL : String(levelTypeId)}
              onValueChange={(v) => apply(setLevelTypeId)(v === ALL ? null : Number(v))}
            >
              <SelectTrigger aria-label="Nivel"><SelectValue placeholder="Nivel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los niveles</SelectItem>
                {levels.map((t) => (
                  <SelectItem key={refId(t)} value={String(refId(t))}>{levelLabel(t.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtros rápidos de consistencia */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              type="button" size="sm" variant={pendingScaleAction ? "default" : "outline"}
              onClick={() => apply(setPendingScaleAction)(!pendingScaleAction)}
            >
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Con acción posterior
              {summary.data && <Badge variant="secondary" className="ml-2">{summary.data.pendingScaleActionCount}</Badge>}
            </Button>
            <Button
              type="button" size="sm" variant={ladderMismatch ? "default" : "outline"}
              onClick={() => apply(setLadderMismatch)(!ladderMismatch)}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Cargo distinto
              {summary.data && <Badge variant="secondary" className="ml-2">{summary.data.ladderMismatchCount}</Badge>}
            </Button>
            {categoryTypeId != null && (
              <Badge variant="secondary" className="gap-1">
                {categoryLabel(summary.data?.byCategory.find((c) => c.typeId === categoryTypeId)?.name)}
                <button type="button" aria-label="Quitar categoría" onClick={() => apply(setCategoryTypeId)(null)}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {hasFilters && (
              <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>Limpiar filtros</Button>
            )}
          </div>

          {list.isError && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {list.error instanceof Error ? list.error.message : "Error al cargar los docentes titulares."}
              <Button type="button" size="sm" variant="outline" className="ml-3" onClick={() => list.refetch()}>Reintentar</Button>
            </div>
          )}

          <TeacherRosterTable
            items={items}
            isLoading={list.isLoading}
            showSalary={showSalary}
            onEdit={canEditStructure ? (it) => { setEditing(it); setIsChangeOpen(true); } : undefined}
          />

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

      {canEditStructure && (
        <>
          <TeacherStructureChangeDialog
            open={isChangeOpen}
            onOpenChange={handleOpenChange}
            onDirtyChange={setIsFormDirty}
            item={editing}
            ladders={ladders.data ?? []}
            isSaving={applyChange.isPending}
            onSubmit={(v) => applyChange.mutate(v)}
          />
          <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />
        </>
      )}
    </div>
  );
}
