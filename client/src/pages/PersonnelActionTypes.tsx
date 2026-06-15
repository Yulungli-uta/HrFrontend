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

export default function PersonnelActionTypesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selected, setSelected] = useState<PersonnelActionTypeDto | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<PersonnelActionTypeDto | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: ["/api/v1/rh/personnel-action-type"],
    queryFn: () => PersonnelActionTypeAPI.getAll(),
  });

  const actionTypes: PersonnelActionTypeDto[] = useMemo(() => {
    if (apiResponse?.status !== "success") return [];
    return apiResponse.data;
  }, [apiResponse]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return actionTypes;
    return actionTypes.filter(
      (at) =>
        at.name.toLowerCase().includes(term) ||
        at.code.toLowerCase().includes(term) ||
        (at.description ?? "").toLowerCase().includes(term)
    );
  }, [actionTypes, searchTerm]);

  const stats = useMemo(() => {
    const total = actionTypes.length;
    const active = actionTypes.filter((a) => a.isActive).length;
    const adCreate = actionTypes.filter((a) => a.requiresAdUserCreation).length;
    const adDisable = actionTypes.filter((a) => a.requiresAdUserDisable).length;
    const adGroups = actionTypes.filter((a) => a.requiresAdGroupAssignment).length;
    return { total, active, adCreate, adDisable, adGroups };
  }, [actionTypes]);

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

  if (error || apiResponse?.status === "error") {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error al cargar los tipos de acción de personal.{" "}
              {apiResponse?.status === "error" ? apiResponse.error.message : ""}
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
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tipos de Acción</CardTitle>
          <CardDescription>
            {filtered.length} de {stats.total} tipos mostrados
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

      {/* Dialog form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
                      templateCode: editing.templateCode ?? "",
                      isActive: editing.isActive,
                      requiresAdUserCreation: editing.requiresAdUserCreation,
                      requiresAdUserDisable: editing.requiresAdUserDisable,
                      requiresAdGroupAssignment: editing.requiresAdGroupAssignment,
                    }
                  : undefined
              }
              onCancel={() => setIsFormOpen(false)}
              onSuccess={() => setIsFormOpen(false)}
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
                    {selected.templateCode && (
                      <div>
                        <p className="text-muted-foreground font-medium">Código de plantilla</p>
                        <p className="font-mono">{selected.templateCode}</p>
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
