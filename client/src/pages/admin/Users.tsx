// src/pages/admin/Users.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

import { Users as UsersIcon, Plus, Edit, Trash2, Search } from "lucide-react";
import { AuthUsersAPI } from "@/lib/api/auth";
import type { ApiResponse } from "@/lib/api/client";
import type { User } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import UserForm from "@/components/forms/UserForm";

/** Normaliza cualquier payload común a arreglo de User */
function coerceToUserArray(payload: unknown): User[] {
  if (Array.isArray(payload)) return payload as User[];
  if (payload && typeof payload === "object") {
    // @ts-ignore
    if (Array.isArray(payload.items)) return payload.items as User[];
    // @ts-ignore
    if (Array.isArray(payload.results)) return payload.results as User[];
    // @ts-ignore
    if (Array.isArray(payload.data)) return payload.data as User[];
    // Diccionario { [id]: User }
    // @ts-ignore
    const values = Object.values(payload);
    if (
      values.length > 0 &&
      values.every(
        (v) => v && typeof v === "object" && ("email" in v || "displayName" in v)
      )
    ) {
      return values as User[];
    }
  }
  return [];
}

export default function UsersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener y normalizar lista de usuarios
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery<ApiResponse<unknown>, Error, User[]>({
    queryKey: ["auth-users"],
    queryFn: async () => {
      const res = await AuthUsersAPI.list();
      console.debug("[UsersPage] AuthUsersAPI.list() raw:", res);
      return res;
    },
    select: (res) => {
      if (!res) return [];
      // @ts-ignore
      if ("status" in res && res.status !== "success") {
        // @ts-ignore
        const message = res?.error?.message || "No se pudo obtener la lista de usuarios";
        toast({ title: "Error", description: message, variant: "destructive" });
        return [];
      }
      // @ts-ignore
      return coerceToUserArray(res.data);
    },
  });

  // Mutación para eliminar usuario
  const deleteMutation = useMutation({
    mutationFn: (id: string) => AuthUsersAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-users"] });
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente",
      });
      setDeleteUserId(null);
    },
    onError: (err: any) => {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "No se pudo eliminar el usuario";
      toast({
        title: "Error al eliminar",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Filtrado seguro
  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const email = (u.email ?? "").toLowerCase();
      const name = (u.displayName ?? "").toLowerCase();
      return email.includes(term) || name.includes(term);
    });
  }, [users, searchTerm]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const handleDelete = (id: string | number) => {
    setDeleteUserId(String(id));
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
              Error al cargar los usuarios. Intente nuevamente.
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
            <UsersIcon className="h-8 w-8" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mt-2">
            Administre los usuarios del sistema de autenticación
          </p>
        </div>

        {/* Modal Crear/Editar Usuario — Accesible (Title + Description) */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setEditingUser(null)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Usuario
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Editar usuario" : "Nuevo usuario"}
              </DialogTitle>
              <DialogDescription>
                Complete los campos y guarde para {editingUser ? "actualizar" : "crear"} el usuario.
              </DialogDescription>
            </DialogHeader>

            <UserForm
              user={editingUser}
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
              placeholder="Buscar por email o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {searchTerm ? "No se encontraron usuarios" : "No hay usuarios registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={String(user.id)}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.displayName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.userType === "Local" ? "default" : "secondary"}>
                        {user.userType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "destructive"}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin
                        ? new Date(user.lastLogin as any).toLocaleDateString()
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(user.id as any)}
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
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
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
