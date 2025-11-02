import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
import { UserCog, Plus, Trash2, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { AuthUsersAPI, RolesAPI, UserRolesAPI, type ApiResponse } from "@/lib/api";
import type { User, Role, UserRole } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import AssignRoleForm from "@/components/forms/AssignRoleForm";

export default function UserRolesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [deleteAssignment, setDeleteAssignment] = useState<{
    userId: string;
    roleId: number;
    assignedAt: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener usuarios
  const { data: usersResponse } = useQuery<ApiResponse<User[]>>({
    queryKey: ["auth-users"],
    queryFn: () => AuthUsersAPI.list(),
  });

  // Obtener roles
  const { data: rolesResponse } = useQuery<ApiResponse<Role[]>>({
    queryKey: ["roles"],
    queryFn: () => RolesAPI.list(),
  });

  // Obtener asignaciones de roles
  const { data: userRolesResponse, isLoading } = useQuery<ApiResponse<UserRole[]>>({
    queryKey: ["user-roles"],
    queryFn: () => UserRolesAPI.list(),
  });

  // Mutación para eliminar asignación
  const deleteMutation = useMutation({
    mutationFn: ({
      userId,
      roleId,
      assignedAt,
    }: {
      userId: string;
      roleId: number;
      assignedAt: string;
    }) => UserRolesAPI.remove(userId, roleId, assignedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({
        title: "Asignación removida",
        description: "El rol ha sido removido del usuario exitosamente",
      });
      setDeleteAssignment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error al remover asignación",
        description: error.message || "No se pudo remover la asignación",
        variant: "destructive",
      });
    },
  });

  const users = usersResponse?.status === "success" ? usersResponse.data : [];
  const roles = rolesResponse?.status === "success" ? rolesResponse.data : [];
  const userRoles = userRolesResponse?.status === "success" ? userRolesResponse.data : [];

  // Crear un mapa de usuarios y roles para búsqueda rápida
  const usersMap = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  );
  const rolesMap = useMemo(
    () => new Map(roles.map((r) => [r.id, r])),
    [roles]
  );

  // Agrupar asignaciones por usuario
  const userRolesGrouped = useMemo(() => {
    const grouped = new Map<string, UserRole[]>();
    userRoles.forEach((ur) => {
      if (!grouped.has(ur.userId)) {
        grouped.set(ur.userId, []);
      }
      grouped.get(ur.userId)!.push(ur);
    });
    return grouped;
  }, [userRoles]);

  // Filtrar usuarios por búsqueda
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignRole = (userId: string) => {
    setSelectedUserId(userId);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedUserId(null);
  };

  const handleDeleteAssignment = (
    userId: string,
    roleId: number,
    assignedAt: string
  ) => {
    setDeleteAssignment({ userId, roleId, assignedAt });
  };

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

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            Asignación de Roles a Usuarios
          </h1>
          <p className="text-gray-600 mt-2">
            Gestione los roles asignados a cada usuario del sistema
          </p>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar usuario por email o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios con sus roles */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              {searchTerm
                ? "No se encontraron usuarios"
                : "No hay usuarios registrados"}
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const userAssignments = userRolesGrouped.get(user.id) || [];
            const activeRoles = userAssignments.filter((ur) => !ur.isDeleted);

            return (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{user.email}</CardTitle>
                      <p className="text-sm text-gray-500">
                        {user.displayName || "Sin nombre"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.isActive ? "default" : "destructive"}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge variant="outline">{user.userType}</Badge>
                      <Dialog
                        open={isFormOpen && selectedUserId === user.id}
                        onOpenChange={(open) => {
                          if (!open) handleCloseForm();
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => handleAssignRole(user.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Asignar Rol
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <AssignRoleForm
                            userId={user.id}
                            userEmail={user.email}
                            onSuccess={handleCloseForm}
                            onCancel={handleCloseForm}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeRoles.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No tiene roles asignados
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rol</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Asignado</TableHead>
                          <TableHead>Expira</TableHead>
                          <TableHead>Razón</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeRoles.map((ur) => {
                          const role = rolesMap.get(ur.roleId);
                          return (
                            <TableRow key={`${ur.userId}-${ur.roleId}-${ur.assignedAt}`}>
                              <TableCell className="font-medium">
                                {role?.name || `Rol #${ur.roleId}`}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {role?.description || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(ur.assignedAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-sm">
                                {ur.expiresAt
                                  ? new Date(ur.expiresAt).toLocaleDateString()
                                  : "Sin expiración"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {ur.reason || "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteAssignment(
                                      ur.userId,
                                      ur.roleId,
                                      ur.assignedAt
                                    )
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog
        open={!!deleteAssignment}
        onOpenChange={() => setDeleteAssignment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover rol del usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción removerá el rol del usuario. El usuario perderá los
              permisos asociados a este rol.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssignment && deleteMutation.mutate(deleteAssignment)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
