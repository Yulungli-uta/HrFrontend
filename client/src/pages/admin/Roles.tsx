// src/pages/admin/Roles.tsx
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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

import { Shield, Plus, Edit, Trash2, Search } from "lucide-react";
import { RolesAPI } from "@/lib/api/auth";
import type { ApiResponse } from "@/lib/api/client";
import { usePaged } from "@/hooks/pagination/usePaged";
import { DataPagination } from "@/components/ui/DataPagination";
import type { Role } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import RoleForm from "@/components/forms/RoleForm";

/** Normaliza cualquier payload común a arreglo de Role */
function coerceToRoleArray(payload: unknown): Role[] {
  if (Array.isArray(payload)) return payload as Role[];
  if (payload && typeof payload === "object") {
    // @ts-ignore
    if (Array.isArray(payload.items)) return payload.items as Role[];
    // @ts-ignore
    if (Array.isArray(payload.results)) return payload.results as Role[];
    // @ts-ignore
    if (Array.isArray(payload.data)) return payload.data as Role[];
    // Diccionario { [id]: Role }
    // @ts-ignore
    const values = Object.values(payload);
    if (
      values.length > 0 &&
      values.every(
        (v) =>
          v &&
          typeof v === "object" &&
          ("name" in v || "description" in v)
      )
    ) {
      return values as Role[];
    }
  }
  return [];
}

export default function RolesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<number | null>(null);
  // searchTerm removed: búsqueda delegada al servidor via usePaged.setSearch
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener roles paginados
  const {
    items: roles,
    isLoading,
    isError,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
    setSearch,
    clearSearch,
    currentParams,
  } = usePaged<Role>({
    queryKey: 'roles',
    queryFn: (params) => RolesAPI.listPaged(params),
    initialPageSize: 20,
  });

  // Mutación para eliminar rol
  const deleteMutation = useMutation({
    mutationFn: (id: number) => RolesAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Rol eliminado",
        description: "El rol ha sido eliminado exitosamente",
      });
      setDeleteRoleId(null);
    },
    onError: (err: any) => {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "No se pudo eliminar el rol";
      toast({
        title: "Error al eliminar",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Filtrar roles por búsqueda (campos opcionales)
  // filteredRoles removed: el servidor ya filtra por search
  const filteredRoles = roles;

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRole(null);
  };

  const handleDelete = (id: number) => {
    setDeleteRoleId(id);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error de red/fetch
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">
              Error al cargar los roles. Intente nuevamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestión de Roles
          </h1>
          <p className="text-gray-600 mt-2">
            Administre los roles y permisos del sistema
          </p>
        </div>

        {/* Modal Crear/Editar Rol — Accesible */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setEditingRole(null)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Rol
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Editar rol" : "Nuevo rol"}
              </DialogTitle>
              <DialogDescription>
                Complete los campos y guarde para {editingRole ? "actualizar" : "crear"} el rol.
              </DialogDescription>
            </DialogHeader>

            <RoleForm
              role={editingRole}
              onSuccess={handleCloseForm}
              onCancel={handleCloseForm}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de búsqueda */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={currentParams.search ?? ""}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de roles */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {currentParams.search ? "No se encontraron roles" : "No hay roles registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map((role) => (
                  <TableRow key={String(role.id)}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {role.priority ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isActive ? "default" : "destructive"}>
                        {role.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {role.createdAt
                        ? new Date(role.createdAt as any).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(role)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(role.id as any)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmación de eliminación */}
      {/* Paginación */}
      <DataPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        disabled={isLoading}
      />

      <AlertDialog open={!!deleteRoleId} onOpenChange={() => setDeleteRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El rol será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRoleId && deleteMutation.mutate(deleteRoleId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
