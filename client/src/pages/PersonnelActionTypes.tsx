// src/pages/PersonnelActionTypes.tsx
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  ClipboardList,
  Plus,
  Search,
  Eye,
  Monitor,
  UserX,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PersonnelActionTypeForm } from "@/components/forms/PersonnelActionTypeForm";
import { PersonnelActionTypeAPI } from "@/lib/api/services/contracts";
import type { PersonnelActionTypeDto } from "@/lib/api/services/contracts";
import { DocumentTemplatesAPI } from "@/lib/api/services/documentTemplates";
import type { ApiResponse, PagedResult } from "@/lib/api";
import { usePaged } from "@/hooks/pagination/usePaged";
import { DataPagination } from "@/components/ui/DataPagination";

export default function PersonnelActionTypesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selected, setSelected] = useState<PersonnelActionTypeDto | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<PersonnelActionTypeDto | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const {
    items: actionTypes,
    isLoading,
    isError,
    errorMessage,
    page,
    pageSize,
    totalCount: totalPagedCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
    setSearch,
  } = usePaged<PersonnelActionTypeDto>({
    queryKey: ["/api/v1/rh/personnel-action-type", "paged"],
    queryFn: (params) =>
      PersonnelActionTypeAPI.listPaged(params) as Promise<
        ApiResponse<PagedResult<PersonnelActionTypeDto>>
      >,
    initialPageSize: 20,
  });

  // Consulta aparte, SIN búsqueda: alimenta las tarjetas de estadísticas para
  // que sigan mostrando el total real del catálogo (22 tipos hoy), sin
  // importar qué se esté buscando en la tabla paginada de abajo. El catálogo
  // es chico, así que traerlo completo para este propósito es barato.
  const { data: statsResponse } = useQuery<ApiResponse<PagedResult<PersonnelActionTypeDto>>>({
    queryKey: ["/api/v1/rh/personnel-action-type", "stats-all"],
    queryFn: () =>
      PersonnelActionTypeAPI.listPaged({ page: 1, pageSize: 200 }) as Promise<
        ApiResponse<PagedResult<PersonnelActionTypeDto>>
      >,
  });

  const allActionTypesForStats: PersonnelActionTypeDto[] = useMemo(() => {
    if (statsResponse?.status !== "success") return [];
    return statsResponse.data.items;
  }, [statsResponse]);

  // Plantillas vigentes de tipo ACCION_PERSONAL, solo para mostrar el nombre en el detalle.
  const { data: templatesResponse } = useQuery({
    queryKey: ["templates-current", "ACCION_PERSONAL"],
    queryFn: () => DocumentTemplatesAPI.getAll({ templateType: "ACCION_PERSONAL", status: "Published" }),
  });
  const templateNameById = useMemo(() => {
    const map = new Map<number, string>();
    if (templatesResponse?.status === "success") {
      for (const t of templatesResponse.data) map.set(t.templateId, `${t.name} (v${t.version})`);
    }
    return map;
  }, [templatesResponse]);

  // La búsqueda ya la resuelve el servidor (ver usePaged de arriba) — se
  // mantiene el nombre "filtered" para no tocar el resto del render.
  const filtered = actionTypes;

  const stats = useMemo(() => {
    const total = allActionTypesForStats.length;
    const active = allActionTypesForStats.filter((a) => a.isActive).length;
    const adCreate = allActionTypesForStats.filter((a) => a.requiresAdUserCreation).length;
    const adDisable = allActionTypesForStats.filter((a) => a.requiresAdUserDisable).length;
    const adGroups = allActionTypesForStats.filter((a) => a.requiresAdGroupAssignment).length;
    return { total, active, adCreate, adDisable, adGroups };
  }, [allActionTypesForStats]);

  function closeFormClean() {
    setIsFormDirty(false);
    setIsFormOpen(false);
  }

  function handleFormOpenChange(open: boolean) {
    if (!open && isFormDirty) {
      setShowExitConfirm(true);
    } else {
      setIsFormOpen(open);
    }
  }

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEdit(at: PersonnelActionTypeDto) {
    setFormMode("edit");
    setEditing(at);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  }

  function openDetail(at: PersonnelActionTypeDto) {
    setSelected(at);
    setIsDetailOpen(true);
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex space-x-4 animate-pulse">
              <div className="h-12 flex-1 bg-muted rounded" />
              <div className="h-12 flex-1 bg-muted rounded" />
              <div className="h-12 w-28 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error al cargar los tipos de acción de personal.{" "}
              {errorMessage ?? ""}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            Tipos de Acción de Personal
          </h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">
            Administre los tipos de acción de personal y su integración con Active Directory
          </p>
        </div>

        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Tipo de Acción
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Total
              </span>
              <Badge variant="secondary">{stats.total}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.active} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-500" />
                Crea en AD
              </span>
              <Badge variant="secondary">{stats.adCreate}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Crean cuenta AD</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-amber-500" />
                Deshabilita AD
              </span>
              <Badge variant="secondary">{stats.adDisable}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Deshabilitan cuenta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                Asigna grupos
              </span>
              <Badge variant="secondary">{stats.adGroups}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Asignan grupos AD</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, código o descripción..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => {
            const value = e.target.value;
            setSearchTerm(value);
            // Búsqueda real en el servidor (usePaged.setSearch resetea a
            // página 1 automáticamente).
            setSearch(value);
          }}
        />
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tipos de Acción</CardTitle>
          <CardDescription>
            {filtered.length} de {totalPagedCount} tipos mostrados
            {searchTerm && ` — filtrado por: "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Nombre</TableHead>
                  <TableHead className="min-w-[100px]">Código</TableHead>
                  <TableHead className="min-w-[150px] hidden md:table-cell">Prefijo numeración</TableHead>
                  <TableHead className="min-w-[120px] hidden lg:table-cell">Integración AD</TableHead>
                  <TableHead className="min-w-[90px]">Estado</TableHead>
                  <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      {searchTerm
                        ? "No se encontraron tipos de acción con ese criterio"
                        : "No hay tipos de acción de personal registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((at) => (
                    <TableRow key={at.personnelActionTypeId} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium">{at.name}</p>
                          {at.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                              {at.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono font-medium">{at.code}</TableCell>

                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {at.numberingPrefix}
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {at.requiresAdUserCreation && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Crea
                            </Badge>
                          )}
                          {at.requiresAdUserDisable && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              Deshabilita
                            </Badge>
                          )}
                          {at.requiresAdGroupAssignment && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Grupos
                            </Badge>
                          )}
                          {!at.requiresAdUserCreation && !at.requiresAdUserDisable && !at.requiresAdGroupAssignment && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={at.isActive ? "default" : "secondary"}
                          className={
                            at.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-muted text-foreground hover:bg-muted"
                          }
                        >
                          {at.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(at)}
                          className="inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 && !searchTerm && (
            <div className="text-center py-8">
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Primer Tipo de Acción
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DataPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalPagedCount}
        pageSize={pageSize}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        disabled={isLoading}
      />

      {/* Confirmación de salida sin guardar */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tiene cambios sin guardar. Si sale ahora, se perderán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                setShowExitConfirm(false);
                closeFormClean();
              }}
            >
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog form */}
      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Nuevo Tipo de Acción de Personal" : "Editar Tipo de Acción"}
            </DialogTitle>
            <DialogDescription>
              Complete la información del tipo de acción de personal.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <PersonnelActionTypeForm
              key={formMode + (editing?.personnelActionTypeId ?? "new")}
              mode={formMode}
              actionTypeId={editing?.personnelActionTypeId}
              initialValues={
                editing
                  ? {
                      name: editing.name,
                      code: editing.code,
                      description: editing.description ?? "",
                      numberingPrefix: editing.numberingPrefix,
                      defaultTemplateId: editing.defaultTemplateId ?? null,
                      isActive: editing.isActive,
                      requiresAdUserCreation: editing.requiresAdUserCreation,
                      requiresAdUserDisable: editing.requiresAdUserDisable,
                      requiresAdGroupAssignment: editing.requiresAdGroupAssignment,
                    }
                  : undefined
              }
              onDirtyChange={setIsFormDirty}
              onCancel={closeFormClean}
              onSuccess={closeFormClean}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog detalle */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Tipo de Acción</DialogTitle>
            <DialogDescription>
              Información completa del tipo de acción de personal seleccionado.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/15 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground font-mono">{selected.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground font-medium">Prefijo de numeración</p>
                      <p className="font-mono font-medium">{selected.numberingPrefix}</p>
                    </div>
                    {selected.defaultTemplateId && (
                      <div>
                        <p className="text-muted-foreground font-medium">Plantilla documental</p>
                        <p className="font-mono">
                          {templateNameById.get(selected.defaultTemplateId) ?? `ID ${selected.defaultTemplateId}`}
                        </p>
                      </div>
                    )}
                    {selected.description && (
                      <div>
                        <p className="text-muted-foreground font-medium">Descripción</p>
                        <p>{selected.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground font-medium">Estado</p>
                      <Badge
                        variant={selected.isActive ? "default" : "secondary"}
                        className={
                          selected.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-muted text-foreground"
                        }
                      >
                        {selected.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Integración Active Directory</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Crear usuario en AD</span>
                      <Badge
                        variant="outline"
                        className={
                          selected.requiresAdUserCreation
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "text-muted-foreground"
                        }
                      >
                        {selected.requiresAdUserCreation ? "Sí" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Deshabilitar usuario en AD</span>
                      <Badge
                        variant="outline"
                        className={
                          selected.requiresAdUserDisable
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "text-muted-foreground"
                        }
                      >
                        {selected.requiresAdUserDisable ? "Sí" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Asignar grupos/roles AD</span>
                      <Badge
                        variant="outline"
                        className={
                          selected.requiresAdGroupAssignment
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "text-muted-foreground"
                        }
                      >
                        {selected.requiresAdGroupAssignment ? "Sí" : "No"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => openEdit(selected)}
                  className="w-full sm:w-auto"
                >
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
