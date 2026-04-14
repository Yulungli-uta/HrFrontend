// src/pages/admin/Users.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { AuthUsersAPI } from "@/lib/api";
import { DataPagination } from "@/components/ui/DataPagination";
import type { User } from "@/features/auth";
import { useToast } from "@/hooks/use-toast";
import UserForm from "@/components/forms/UserForm";
import { parseApiError } from "@/lib/error-handling";

type UsersPagedData = {
  items: User[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

function normalizeUsersPagedResponse(res: any): UsersPagedData {
  console.log("UsersPage raw response:", res);

  // Caso 1: backend directo -> { success: true, data: { items: [...] } }
  if (res?.success === true && res?.data) {
    return {
      items: Array.isArray(res.data.items) ? res.data.items : [],
      page: Number(res.data.page ?? 1),
      pageSize: Number(res.data.pageSize ?? 20),
      totalCount: Number(res.data.totalCount ?? 0),
      totalPages: Number(res.data.totalPages ?? 0),
      hasPreviousPage: Boolean(res.data.hasPreviousPage),
      hasNextPage: Boolean(res.data.hasNextPage),
    };
  }

  // Caso 2: apiFetch normalizado -> { status: 'success', data: { items: [...] } }
  if (res?.status === "success" && res?.data?.items) {
    return {
      items: Array.isArray(res.data.items) ? res.data.items : [],
      page: Number(res.data.page ?? 1),
      pageSize: Number(res.data.pageSize ?? 20),
      totalCount: Number(res.data.totalCount ?? 0),
      totalPages: Number(res.data.totalPages ?? 0),
      hasPreviousPage: Boolean(res.data.hasPreviousPage),
      hasNextPage: Boolean(res.data.hasNextPage),
    };
  }

  // Caso 3: doble anidación -> { status:'success', data:{ success:true, data:{ items:[...] } } }
  if (res?.status === "success" && res?.data?.success === true && res?.data?.data) {
    return {
      items: Array.isArray(res.data.data.items) ? res.data.data.items : [],
      page: Number(res.data.data.page ?? 1),
      pageSize: Number(res.data.data.pageSize ?? 20),
      totalCount: Number(res.data.data.totalCount ?? 0),
      totalPages: Number(res.data.data.totalPages ?? 0),
      hasPreviousPage: Boolean(res.data.data.hasPreviousPage),
      hasNextPage: Boolean(res.data.data.hasNextPage),
    };
  }

  return {
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

export default function UsersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);
  const [search, setSearchState] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth-users", page, pageSize, search],
    queryFn: async () => {
      const res = await AuthUsersAPI.listPaged({
        page,
        pageSize,
        search: search.trim() || undefined,
        sortDirection: "asc",
      } as any);

      return normalizeUsersPagedResponse(res);
    },
    placeholderData: (previousData) => previousData,
  });

  const users = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const hasPreviousPage = data?.hasPreviousPage ?? false;
  const hasNextPage = data?.hasNextPage ?? false;

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
    onError: (err: unknown) => {
      toast({
        title: "Error al eliminar",
        description: parseApiError(err).message,
        variant: "destructive",
      });
    },
  });

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

  const goToPage = (newPage: number) => setPage(newPage);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const setSearch = (term: string) => {
    setSearchState(term);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar los usuarios.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-2">
            Administre los usuarios del sistema de autenticación
          </p>
        </div>

        <Dialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingUser(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90"
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
                Complete los campos y guarde para{" "}
                {editingUser ? "actualizar" : "crear"} el usuario.
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

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Buscar por email o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

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
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? "No se encontraron usuarios" : "No hay usuarios registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
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
                          className="text-destructive hover:text-destructive"
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
              className="bg-destructive hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}