import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback, useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserCog, Plus, Trash2, Search, Filter, Loader2, AlertCircle, RefreshCw,
  Users, Shield, Calendar, Eye, EyeOff, ChevronDown, ChevronUp,
  Download, MoreHorizontal, CheckCircle, XCircle, Edit3,
} from "lucide-react";
import { AuthUsersAPI, RolesAPI, UserRolesAPI } from "@/lib/api/auth";
import type { ApiResponse } from "@/lib/api/client";
import type { User, Role, UserRole } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import AssignRoleForm from "@/components/forms/AssignRoleForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/* =========================
   Página principal
========================= */

interface FilterState {
  status: "all" | "active" | "inactive";
  userType: string;
  hasRoles: "all" | "with-roles" | "without-roles";
  searchTerm: string;
}

export default function UserRolesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Eliminar asignación
  const [deleteAssignment, setDeleteAssignment] = useState<{
    userId: string;
    roleId: number;
    assignedAt?: string;
  } | null>(null);

  // Editar asignación (incluye email para mostrar a quién pertenece)
  const [editAssignment, setEditAssignment] = useState<{
    userId: string;
    userEmail: string;
    roleId: number;      // roleId actual
    assignedAt?: string; // por si tu backend lo requiere
    expiresAt?: string;
    reason?: string;
  } | null>(null);

  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    userType: "all",
    hasRoles: "all",
    searchTerm: "",
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: usersResponse,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<ApiResponse<User[]>>({
    queryKey: ["auth-users"],
    queryFn: () => AuthUsersAPI.list(),
    refetchOnWindowFocus: true,
  });

  const {
    data: rolesResponse,
    isLoading: isLoadingRoles,
    error: rolesError,
  } = useQuery<ApiResponse<Role[]>>({
    queryKey: ["roles"],
    queryFn: () => RolesAPI.list(),
  });

  const {
    data: userRolesResponse,
    isLoading: isLoadingUserRoles,
    error: userRolesError,
    refetch: refetchUserRoles,
  } = useQuery<ApiResponse<UserRole[]>>({
    queryKey: ["user-roles"],
    queryFn: () => UserRolesAPI.list(),
  });

  // Mutación: eliminar asignación
  const deleteMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: number }) => {
      return UserRolesAPI.remove(userId, roleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({ title: "✅ Asignación removida", description: "El rol ha sido removido del usuario exitosamente" });
      setDeleteAssignment(null);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error al remover asignación",
        description: error?.message || "No se pudo remover la asignación",
        variant: "destructive",
      });
    },
  });

  // Mutación: actualizar (PUT) o fallback (remove + assign)
  type UpdatePayload = {
    userId: string;
    oldRoleId: number;
    newRoleId: number;
    expiresAt?: string;
    reason?: string;
    assignedAt?: string;
  };
  const updateMutation = useMutation({
    mutationFn: async (payload: UpdatePayload) => {
      const { userId, oldRoleId, newRoleId, expiresAt, reason } = payload;
      try {
        // Si tu backend NO permite cambiar roleId en update, comenta roleId y deja expiresAt/reason
        await UserRolesAPI.update(userId, oldRoleId, { roleId: newRoleId as any, expiresAt, reason } as any);
        return "updated";
      } catch {
        await UserRolesAPI.remove(userId, oldRoleId);
        await UserRolesAPI.assign({ userId, roleId: newRoleId, expiresAt, reason });
        return "replaced";
      }
    },
    onSuccess: (mode) => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({
        title: "✅ Asignación actualizada",
        description: mode === "updated"
          ? "Se actualizó la asignación."
          : "Se reemplazó la asignación (remove + assign).",
      });
      setEditAssignment(null);
    },
    onError: (err: any) => {
      toast({
        title: "❌ Error al actualizar",
        description: err?.message ?? "No se pudo actualizar la asignación.",
        variant: "destructive",
      });
    },
  });

  // Datos robustos
  const users: User[] = Array.isArray(usersResponse?.data) ? usersResponse!.data : [];
  const roles: Role[] = Array.isArray(rolesResponse?.data) ? rolesResponse!.data : [];
  const userRoles: UserRole[] = Array.isArray(userRolesResponse?.data) ? userRolesResponse!.data : [];

  const usersMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const rolesMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

  const userRolesGrouped = useMemo(() => {
    const grouped = new Map<string, UserRole[]>();
    userRoles.forEach((ur) => {
      if (!grouped.has(ur.userId)) grouped.set(ur.userId, []);
      grouped.get(ur.userId)!.push(ur);
    });
    return grouped;
  }, [userRoles]);

  // Stats
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;
    const usersWithRoles = users.filter((u) => {
      const assignments = userRolesGrouped.get(u.id) || [];
      return assignments.some((ur) => !ur.isDeleted);
    }).length;
    const totalAssignments = userRoles.filter((ur) => !ur.isDeleted).length;
    return { totalUsers, activeUsers, usersWithRoles, totalAssignments };
  }, [users, userRolesGrouped, userRoles]);

  // Filtros
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const needle = filters.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !needle ||
        user.email.toLowerCase().includes(needle) ||
        user.displayName?.toLowerCase().includes(needle) ||
        user.id.toLowerCase().includes(needle);

      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "active" && user.isActive) ||
        (filters.status === "inactive" && !user.isActive);

      const matchesUserType = filters.userType === "all" || user.userType === filters.userType;

      const userAssignments = userRolesGrouped.get(user.id) || [];
      const hasRoles = userAssignments.some((ur) => !ur.isDeleted);

      const matchesRoleFilter =
        filters.hasRoles === "all" ||
        (filters.hasRoles === "with-roles" && hasRoles) ||
        (filters.hasRoles === "without-roles" && !hasRoles);

      return matchesSearch && matchesStatus && matchesUserType && matchesRoleFilter;
    });
  }, [users, filters, userRolesGrouped]);

  // Handlers
  const handleAssignRole = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setSelectedUserId(null);
  }, []);

  const handleDeleteAssignment = useCallback(
    (userId: string, roleId: number, assignedAt?: string) => {
      setDeleteAssignment({ userId, roleId, assignedAt });
    },
    []
  );

  const handleEditAssignment = useCallback(
    (data: { userId: string; roleId: number; assignedAt?: string; expiresAt?: string; reason?: string }) => {
      const email = usersMap.get(data.userId)?.email || "";
      setEditAssignment({ userId: data.userId, userEmail: email, roleId: data.roleId, assignedAt: data.assignedAt, expiresAt: data.expiresAt, reason: data.reason });
    },
    [usersMap]
  );

  const handleRefresh = useCallback(() => {
    refetchUsers();
    refetchUserRoles();
    toast({ title: "🔄 Actualizando datos", description: "Los datos se están actualizando..." });
  }, [refetchUsers, refetchUserRoles, toast]);

  const toggleUserExpansion = useCallback((userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }, []);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }, []);

  const selectAllUsers = useCallback(() => {
    setSelectedUsers((prev) => {
      if (prev.size === filteredUsers.length) return new Set();
      return new Set(filteredUsers.map((u) => u.id));
    });
  }, [filteredUsers]);

  useEffect(() => {
    if (filters.status === "active") setActiveTab("active");
    else if (filters.status === "inactive") setActiveTab("inactive");
    else if (filters.hasRoles === "without-roles") setActiveTab("no-roles");
    else setActiveTab("all");
  }, [filters]);

  const isLoading = isLoadingUsers || isLoadingRoles || isLoadingUserRoles;
  const hasError = usersError || rolesError || userRolesError;

  if (isLoading) return <LoadingSkeleton />;

  if (hasError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los datos. Por favor, intente nuevamente.
          </AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Administración</span>
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            <span className="text-gray-900 font-medium">Gestión de Roles</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCog className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            </div>
            Asignación de Roles
          </h1>
          <p className="text-gray-600 mt-2 text-sm lg:text-base">
            Gestione y asigne roles a los usuarios del sistema de manera intuitiva
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden lg:inline">Actualizar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sincronizar datos más recientes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden lg:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Exportar Datos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Lista de Usuarios</DropdownMenuItem>
              <DropdownMenuItem>Asignaciones de Roles</DropdownMenuItem>
              <DropdownMenuItem>Reporte Completo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Usuarios" value={stats.totalUsers} icon={<Users className="h-5 w-5" />} color="blue" onClick={() => setFilters((p) => ({ ...p, status: "all" }))} />
        <StatCard title="Usuarios Activos" value={stats.activeUsers} icon={<CheckCircle className="h-5 w-5" />} color="green" onClick={() => setFilters((p) => ({ ...p, status: "active" }))} />
        <StatCard title="Con Roles" value={stats.usersWithRoles} icon={<Shield className="h-5 w-5" />} color="purple" onClick={() => setFilters((p) => ({ ...p, hasRoles: "with-roles" }))} />
        <StatCard title="Asignaciones" value={stats.totalAssignments} icon={<Calendar className="h-5 w-5" />} color="orange" />
      </div>

      {/* Filtros / búsqueda */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar usuarios, emails, IDs..."
                value={filters.searchTerm}
                onChange={(e) => setFilters((p) => ({ ...p, searchTerm: e.target.value }))}
                className="pl-10 pr-4"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <Label htmlFor="view-mode" className="text-sm text-gray-600">
                  Vista:
                </Label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button size="sm" variant={viewMode === "cards" ? "default" : "ghost"} onClick={() => setViewMode("cards")} className="h-8 px-3">
                    Tarjetas
                  </Button>
                  <Button size="sm" variant={viewMode === "table" ? "default" : "ghost"} onClick={() => setViewMode("table")} className="h-8 px-3">
                    Tabla
                  </Button>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Estado</Label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as any }))}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Tipo de Usuario</Label>
                  <select
                    value={filters.userType}
                    onChange={(e) => setFilters((p) => ({ ...p, userType: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="Local">Local</option>
                    <option value="External">Externo</option>
                    <option value="Admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Asignación de Roles</Label>
                  <select
                    value={filters.hasRoles}
                    onChange={(e) => setFilters((p) => ({ ...p, hasRoles: e.target.value as any }))}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Todos los usuarios</option>
                    <option value="with-roles">Con roles asignados</option>
                    <option value="without-roles">Sin roles asignados</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters({ status: "all", userType: "all", hasRoles: "all", searchTerm: "" })
                  }
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all" onClick={() => setFilters((p) => ({ ...p, status: "all", hasRoles: "all" }))}>
            Todos
          </TabsTrigger>
          <TabsTrigger value="active" onClick={() => setFilters((p) => ({ ...p, status: "active" }))}>
            Activos
          </TabsTrigger>
          <TabsTrigger value="no-roles" onClick={() => setFilters((p) => ({ ...p, hasRoles: "without-roles" }))}>
            Sin Roles
          </TabsTrigger>
          <TabsTrigger value="inactive" onClick={() => setFilters((p) => ({ ...p, status: "inactive" }))}>
            Inactivos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Vista principal */}
      {viewMode === "cards" ? (
        <CardView
          users={filteredUsers}
          userRolesGrouped={userRolesGrouped}
          rolesMap={rolesMap}
          expandedUsers={expandedUsers}
          onToggleExpand={toggleUserExpansion}
          onAssignRole={handleAssignRole}
          onDeleteAssignment={handleDeleteAssignment}
          onEditAssignment={handleEditAssignment}
          selectedUsers={selectedUsers}
          onToggleSelect={toggleUserSelection}
        />
      ) : (
        <TableView
          users={filteredUsers}
          userRolesGrouped={userRolesGrouped}
          rolesMap={rolesMap}
          onAssignRole={handleAssignRole}
          onDeleteAssignment={handleDeleteAssignment}
          onEditAssignment={handleEditAssignment}
          selectedUsers={selectedUsers}
          onToggleSelect={toggleUserSelection}
          onSelectAll={selectAllUsers}
        />
      )}

      {/* Empty state */}
      {filteredUsers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filters.searchTerm || showFilters ? "No se encontraron usuarios" : "No hay usuarios registrados"}
            </h3>
            <p className="text-gray-500 mb-4">
              {filters.searchTerm || showFilters
                ? "Intente ajustar los filtros de búsqueda"
                : "Comience agregando usuarios al sistema"}
            </p>
            {(filters.searchTerm || showFilters) && (
              <Button
                variant="outline"
                onClick={() => setFilters({ status: "all", userType: "all", hasRoles: "all", searchTerm: "" })}
              >
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmar eliminación */}
      <AlertDialog
        open={!!deleteAssignment}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteAssignment(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover rol del usuario?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6">
            {deleteAssignment && (
              <p className="text-sm text-gray-600">
                Usuario: <span className="font-medium">{usersMap.get(deleteAssignment.userId)?.email}</span>
              </p>
            )}
          </div>
        </AlertDialogContent>
        <AlertDialogContent>
          <AlertDialogDescription>
            Esta acción removerá el rol del usuario. El usuario perderá los permisos asociados a este rol. Esta acción no se puede deshacer.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteAssignment) {
                  deleteMutation.mutate({
                    userId: deleteAssignment.userId,
                    roleId: deleteAssignment.roleId,
                  });
                }
              }}
              className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? "Removiendo..." : "Remover Rol"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: asignar rol */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asignar rol</DialogTitle>
            <DialogDescription>
              Selecciona un rol y (opcionalmente) una fecha de expiración para el usuario.
            </DialogDescription>
          </DialogHeader>

          {selectedUserId && (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-600">
                  Usuario: <span className="font-medium">{usersMap.get(selectedUserId)?.email}</span>
                </p>
              </div>
              <AssignRoleForm
                userId={selectedUserId}
                userEmail={usersMap.get(selectedUserId)?.email || ""}
                onSuccess={handleCloseForm}
                onCancel={handleCloseForm}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: editar asignación */}
      <Dialog open={!!editAssignment} onOpenChange={(open) => !open && setEditAssignment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar asignación de rol</DialogTitle>
            <DialogDescription>
              Cambia el rol del usuario, la fecha de expiración o la razón.
            </DialogDescription>
          </DialogHeader>

          {editAssignment && (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-600">
                  Usuario: <span className="font-medium">{editAssignment.userEmail}</span>
                </p>
              </div>
              <EditUserRoleForm
                userId={editAssignment.userId}
                oldRoleId={editAssignment.roleId}
                defaultExpiresAt={editAssignment.expiresAt}
                defaultReason={editAssignment.reason}
                onCancel={() => setEditAssignment(null)}
                onSubmit={(data) =>
                  updateMutation.mutate({
                    userId: editAssignment.userId,
                    oldRoleId: editAssignment.roleId,
                    newRoleId: data.newRoleId,
                    expiresAt: data.expiresAt,
                    reason: data.reason,
                    assignedAt: editAssignment.assignedAt,
                  })
                }
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================
   Subcomponentes
========================= */

function StatCard({ title, value, icon, color, onClick }: any) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  };

  return (
    <Card
      className={`border-l-4 cursor-pointer transition-all hover:shadow-md hover:scale-105 ${colorClasses[color as keyof typeof colorClasses]}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses].split(" ")[0]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CardView({
  users,
  userRolesGrouped,
  rolesMap,
  expandedUsers,
  onToggleExpand,
  onAssignRole,
  onDeleteAssignment,
  onEditAssignment,
  selectedUsers,
  onToggleSelect,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {users.map((user: User) => {
        const userAssignments: UserRole[] = userRolesGrouped.get(user.id) || [];
        const activeRoles = userAssignments.filter((ur) => !ur.isDeleted);
        const isExpanded = expandedUsers.has(user.id);
        const isSelected = selectedUsers.has(user.id);

        return (
          <Card
            key={user.id}
            className={`relative transition-all hover:shadow-lg border-2 ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
          >
            <div className="absolute top-3 right-3">
              <Switch checked={isSelected} onCheckedChange={() => onToggleSelect(user.id)} />
            </div>

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate flex items-center gap-2">
                    {user.email}
                    {user.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-600 truncate">{user.displayName || "Sin nombre"}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    <Badge variant="outline">{user.userType}</Badge>
                    <Badge variant="secondary">
                      {activeRoles.length} rol{activeRoles.length !== 1 ? "es" : ""}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {activeRoles.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {activeRoles.slice(0, 3).map((ur) => {
                      const role = rolesMap.get(ur.roleId);
                      return (
                        <Badge key={`${ur.userId}-${ur.roleId}`} variant="outline" className="text-xs">
                          {role?.name || `Rol ${ur.roleId}`}
                        </Badge>
                      );
                    })}
                    {activeRoles.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{activeRoles.length - 3} más</Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <Button size="sm" variant="outline" onClick={() => onToggleExpand(user.id)} className="flex items-center gap-1">
                  {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {isExpanded ? "Ocultar" : "Detalles"}
                </Button>

                <Button size="sm" onClick={() => onAssignRole(user.id)} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Asignar Rol
                </Button>
              </div>

              {isExpanded && activeRoles.length > 0 && (
                <div className="mt-4 pt-4 border-t animate-in fade-in">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rol</TableHead>
                        <TableHead>Asignado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeRoles.map((ur) => {
                        const role = rolesMap.get(ur.roleId);
                        return (
                          <TableRow key={`${ur.userId}-${ur.roleId}-${ur.assignedAt}`}>
                            <TableCell className="font-medium">{role?.name || `Rol #${ur.roleId}`}</TableCell>
                            <TableCell className="text-sm">
                              {ur.assignedAt ? new Date(ur.assignedAt).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell className="text-right flex items-center gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  onEditAssignment({
                                    userId: ur.userId,
                                    roleId: ur.roleId,
                                    assignedAt: ur.assignedAt,
                                  })
                                }
                                className="h-8"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDeleteAssignment(ur.userId, ur.roleId, ur.assignedAt)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TableView({
  users,
  userRolesGrouped,
  rolesMap,
  onAssignRole,
  onDeleteAssignment,
  onEditAssignment,
  selectedUsers,
  onToggleSelect,
  onSelectAll,
}: any) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Switch checked={selectedUsers.size === users.length && users.length > 0} onCheckedChange={onSelectAll} />
              </TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Último Login</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user: User) => {
              const userAssignments: UserRole[] = userRolesGrouped.get(user.id) || [];
              const activeRoles = userAssignments.filter((ur) => !ur.isDeleted);
              const isSelected = selectedUsers.has(user.id);

              return (
                <TableRow key={user.id} className={isSelected ? "bg-blue-50" : ""}>
                  <TableCell>
                    <Switch checked={isSelected} onCheckedChange={() => onToggleSelect(user.id)} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-gray-500">{user.displayName || "Sin nombre"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {activeRoles.slice(0, 2).map((ur) => {
                          const role = rolesMap.get(ur.roleId);
                          return (
                            <Badge key={`${ur.userId}-${ur.roleId}`} variant="outline" className="text-xs">
                              {role?.name || `Rol ${ur.roleId}`}
                            </Badge>
                          );
                        })}
                        {activeRoles.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{activeRoles.length - 2}
                          </Badge>
                        )}
                        {activeRoles.length === 0 && <span className="text-sm text-gray-400">Sin roles</span>}
                      </div>
                    </TableCell>
                  <TableCell>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : <span className="text-gray-400">Nunca</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" onClick={() => onAssignRole(user.id)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onAssignRole(user.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Asignar Rol
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Asignaciones</DropdownMenuLabel>
                          {activeRoles.length === 0 && (
                            <DropdownMenuItem disabled className="text-gray-400">
                              No hay roles
                            </DropdownMenuItem>
                          )}
                          {activeRoles.map((ur) => (
                            <div key={`${ur.userId}-${ur.roleId}`} className="flex items-center justify-between px-2 py-1">
                              <span className="text-sm">
                                {rolesMap.get(ur.roleId)?.name || `Rol ${ur.roleId}`}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    onEditAssignment({
                                      userId: ur.userId,
                                      roleId: ur.roleId,
                                      assignedAt: ur.assignedAt,
                                    })
                                  }
                                  className="h-7 px-2"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onDeleteAssignment(ur.userId, ur.roleId, ur.assignedAt)}
                                  className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* =========================
   Formulario de edición
========================= */

function EditUserRoleForm({
  userId,
  oldRoleId,
  defaultExpiresAt,
  defaultReason,
  onCancel,
  onSubmit,
}: {
  userId: string;
  oldRoleId: number;
  defaultExpiresAt?: string;
  defaultReason?: string;
  onCancel: () => void;
  onSubmit: (data: { newRoleId: number; expiresAt?: string; reason?: string }) => void;
}) {
  const { data: rolesResponse, isLoading: rolesLoading } = useQuery<ApiResponse<Role[]>>({
    queryKey: ["roles"],
    queryFn: () => RolesAPI.list(),
  });
  const roles = Array.isArray(rolesResponse?.data) ? rolesResponse!.data : [];
  const activeRoles = roles.filter(r => r.isActive && !r.isDeleted);

  const [newRoleId, setNewRoleId] = useState<string>(String(oldRoleId));
  const [expiresAt, setExpiresAt] = useState<string>(defaultExpiresAt ?? "");
  const [reason, setReason] = useState<string>(defaultReason ?? "");

  const isDirty =
    Number(newRoleId) !== oldRoleId ||
    (expiresAt ?? "") !== (defaultExpiresAt ?? "") ||
    (reason ?? "") !== (defaultReason ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          newRoleId: parseInt(newRoleId, 10),
          expiresAt: expiresAt || undefined,
          reason: reason || undefined,
        });
      }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Rol</Label>
          <Select
            value={newRoleId}
            onValueChange={(v) => setNewRoleId(v)}
            disabled={rolesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un rol" />
            </SelectTrigger>
            <SelectContent>
              {activeRoles.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">No hay roles disponibles</div>
              ) : (
                activeRoles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name} {role.description && `- ${role.description}`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fecha de Expiración (Opcional)</Label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
          <p className="text-sm text-gray-500">Si no se especifica, el rol no expirará.</p>
        </div>

        <div className="space-y-2">
          <Label>Razón de Asignación (Opcional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo del cambio"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!isDirty} className="bg-blue-600 hover:bg-blue-700">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

/* =========================
   Skeleton
========================= */

function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-32 rounded-lg" />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
