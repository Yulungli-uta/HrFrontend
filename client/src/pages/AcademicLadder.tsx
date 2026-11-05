import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataPagination } from "@/components/ui/DataPagination";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useActionPermission } from "@/hooks/useActionPermission";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth";
import { ACTION_PERMISSIONS } from "@/features/actionPermissions";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { categoryLabel, dedicationLabel, levelLabel } from "@/lib/academicLabels";
import { GraduationCap, Plus, Pencil, ArrowRight, Search, Users } from "lucide-react";
import {
  AcademicLadderAPI,
  type ApiResponse,
  type AcademicLadderDto,
} from "@/lib/api";
import { LadderFormDialog, type LadderFormSubmit } from "@/components/academic-ladder/LadderFormDialog";
import { LadderProgressionChain } from "@/components/academic-ladder/LadderProgressionChain";

const QUERY_KEY = ["/api/v1/rh/academic-ladder"];
const DEFAULT_PAGE_SIZE = 20;

/** `apiFetch` no lanza: devuelve `status: 'error'`. Sin esto la pantalla mostraba "éxito" ante un rechazo del servidor. */
function ensureSuccess<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (res.status === "error") {
    throw new Error(res.error.message || defaultMessage);
  }
  return res.data;
}

const money = (v: number | null): string =>
  v == null ? "—" : v.toLocaleString("es-EC", { style: "currency", currency: "USD" });

export default function AcademicLadderPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { can } = useActionPermission();
  // Si la sesión no trae la lista de permisos de acción no se esconden los controles: el backend los exige igual.
  const permissionsLoaded = Array.isArray(user?.actionPermissions);
  const canCreate = permissionsLoaded ? can(ACTION_PERMISSIONS.CATALOGS_CREATE) : true;
  const canUpdate = permissionsLoaded ? can(ACTION_PERMISSIONS.CATALOGS_UPDATE) : true;

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicLadderDto | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("active");
  const [kind, setKind] = useState<"all" | "titular" | "other">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dedicationFilter, setDedicationFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { setIsFormDirty, handleOpenChange, close, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard((open) => {
      setIsOpen(open);
      if (!open) setEditing(null);
    });

  const { data: categories } = useRefTypesByCategory(REF_TYPE_CATEGORIES.ACADEMIC_CATEGORY);
  const { data: levels } = useRefTypesByCategory(REF_TYPE_CATEGORIES.ACADEMIC_LEVEL);
  const { data: dedications } = useRefTypesByCategory(REF_TYPE_CATEGORIES.ACADEMIC_DEDICATION);

  const { data, isLoading, error } = useQuery<AcademicLadderDto[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => ensureSuccess(await AcademicLadderAPI.getAll(), "Error al cargar el escalafón docente"),
  });

  const ladders = useMemo<AcademicLadderDto[]>(() => data ?? [], [data]);

  const createMut = useMutation({
    mutationFn: async (v: LadderFormSubmit) =>
      ensureSuccess(
        await AcademicLadderAPI.create({
          code: v.code!,
          name: v.name,
          categoryTypeId: v.categoryTypeId,
          levelTypeId: v.levelTypeId,
          dedicationTypeId: v.dedicationTypeId,
          baseRmu: v.baseRmu,
          sequence: v.sequence,
          nextLadderId: v.nextLadderId,
          minYearsService: v.minYearsService,
        }),
        "Error al crear el escalafón",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Escalafón creado correctamente" });
      close();
    },
    onError: (e: Error) => toast({ title: "No se pudo crear el escalafón", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, v }: { id: number; v: LadderFormSubmit }) =>
      ensureSuccess(
        // Se envían TODOS los campos: el backend reemplaza el registro completo, omitir uno lo borraría.
        await AcademicLadderAPI.update(id, {
          name: v.name,
          categoryTypeId: v.categoryTypeId,
          levelTypeId: v.levelTypeId,
          dedicationTypeId: v.dedicationTypeId,
          baseRmu: v.baseRmu,
          sequence: v.sequence,
          nextLadderId: v.nextLadderId,
          minYearsService: v.minYearsService,
          isActive: v.isActive,
        }),
        "Error al actualizar el escalafón",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Escalafón actualizado correctamente" });
      close();
    },
    onError: (e: Error) => toast({ title: "No se pudo actualizar el escalafón", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setIsOpen(true);
  };
  const openEdit = (ladder: AcademicLadderDto) => {
    setEditing(ladder);
    setIsOpen(true);
  };

  const handleSubmit = (v: LadderFormSubmit) => {
    if (editing) updateMut.mutate({ id: editing.ladderId, v });
    else createMut.mutate(v);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...ladders]
      .filter((l) => status === "all" || (status === "active" ? l.isActive : !l.isActive))
      .filter((l) => kind === "all" || (kind === "titular" ? l.isTitular : !l.isTitular))
      .filter((l) => categoryFilter === "all" || String(l.categoryTypeId ?? "") === categoryFilter)
      .filter((l) =>
        dedicationFilter === "all"
          ? true
          : dedicationFilter === "none"
            ? !l.dedicationTypeId
            : String(l.dedicationTypeId ?? "") === dedicationFilter)
      .filter((l) => !term || l.name.toLowerCase().includes(term) || l.code.toLowerCase().includes(term))
      .sort((a, b) => a.sequence - b.sequence);
  }, [ladders, search, status, kind, categoryFilter, dedicationFilter]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetPage = () => setPage(1);
  const refId = (t: { typeId?: number; typeID?: number }) => String(t.typeId ?? t.typeID);

  const stats = useMemo(() => ({
    total: ladders.length,
    active: ladders.filter((l) => l.isActive).length,
    titular: ladders.filter((l) => l.isTitular && l.isActive).length,
    teachers: ladders.reduce((sum, l) => sum + (l.activeTeachers ?? 0), 0),
  }), [ladders]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error al cargar el escalafón docente{error instanceof Error && error.message ? `: ${error.message}` : "."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            Escalafón Docente
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Progresión secuencial de categorías y niveles según la LOES
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Escalafón
          </Button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Escalafones", value: stats.total },
          { label: "Activos", value: stats.active },
          { label: "Titulares activos", value: stats.titular },
          { label: "Docentes asignados", value: stats.teachers, icon: true },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {s.icon && <Users className="h-3 w-3" />}{s.label}
              </p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <LadderProgressionChain ladders={ladders} />

      {/* Listado */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Escalafones</CardTitle>
          <CardDescription>
            {totalCount} de {ladders.length} escalafones
          </CardDescription>
        </CardHeader>
        <CardContent>

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nombre o código…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); resetPage(); }}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kind} onValueChange={(v) => { setKind(v as typeof kind); resetPage(); }}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Titulares y no titulares</SelectItem>
                <SelectItem value="titular">Solo titulares</SelectItem>
                <SelectItem value="other">Solo no titulares</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); resetPage(); }}>
              <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((t) => (
                  <SelectItem key={refId(t)} value={refId(t)}>{categoryLabel(t.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dedicationFilter} onValueChange={(v) => { setDedicationFilter(v); resetPage(); }}>
              <SelectTrigger><SelectValue placeholder="Dedicación" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las dedicaciones</SelectItem>
                <SelectItem value="none">Sin dedicación (base)</SelectItem>
                {dedications.map((t) => (
                  <SelectItem key={refId(t)} value={refId(t)}>{dedicationLabel(t.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Seq.</TableHead>
                  <TableHead className="hidden sm:table-cell">Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Nivel</TableHead>
                  <TableHead className="hidden lg:table-cell">Dedicación</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">RMU base</TableHead>
                  <TableHead className="hidden xl:table-cell">Años mín.</TableHead>
                  <TableHead className="hidden xl:table-cell">Siguiente</TableHead>
                  <TableHead className="text-right">Docentes</TableHead>
                  <TableHead>Estado</TableHead>
                  {canUpdate && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canUpdate ? 12 : 11} className="text-center text-sm text-muted-foreground py-8">
                      No hay escalafones que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
                {pageItems.map((ladder) => (
                  <TableRow key={ladder.ladderId}>
                    <TableCell className="font-mono font-bold text-primary">{ladder.sequence}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">{ladder.code}</TableCell>
                    <TableCell className="font-medium">
                      {ladder.name}
                      {/* En pantallas chicas las columnas de detalle se ocultan: se resumen bajo el nombre. */}
                      <span className="md:hidden block text-xs font-normal text-muted-foreground">
                        {[categoryLabel(ladder.categoryName), ladder.levelName ? levelLabel(ladder.levelName) : null,
                          ladder.dedicationName ? dedicationLabel(ladder.dedicationName) : null]
                          .filter(Boolean).join(" · ")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {categoryLabel(ladder.categoryName)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {levelLabel(ladder.levelName)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {ladder.dedicationName ? dedicationLabel(ladder.dedicationName) : "Base"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-right tabular-nums">
                      {money(ladder.baseRmu)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {ladder.minYearsService != null ? `${ladder.minYearsService} años` : "—"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {ladder.nextLadderName ? (
                        <span className="flex items-center gap-1 text-sm text-primary">
                          <ArrowRight className="h-3 w-3" />
                          {ladder.nextLadderName}
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Nivel máximo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{ladder.activeTeachers ?? 0}</TableCell>
                    <TableCell>
                      <Badge
                        className={ladder.isActive
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"}
                      >
                        {ladder.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    {canUpdate && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEdit(ladder)}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalCount > 0 && (
            <div className="border-t border-border mt-4">
              <DataPagination
                page={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                hasPreviousPage={currentPage > 1}
                hasNextPage={currentPage < totalPages}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <LadderFormDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        onDirtyChange={setIsFormDirty}
        editing={editing}
        ladders={ladders}
        categories={categories}
        levels={levels}
        dedications={dedications}
        isSaving={createMut.isPending || updateMut.isPending}
        onSubmit={handleSubmit}
      />
      <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />
    </div>
  );
}
