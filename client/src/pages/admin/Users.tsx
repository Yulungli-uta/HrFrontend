// src/pages/admin/Users.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users as UsersIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  Power,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Filter,
} from "lucide-react";

import { AuthUsersAPI, LocalCredentialsAPI } from "@/lib/api";
import { DataPagination } from "@/components/ui/DataPagination";
import type { User } from "@/features/auth";
import { useToast } from "@/hooks/use-toast";
import UserForm from "@/components/forms/UserForm";
import { parseApiError } from "@/lib/error-handling";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UsersPagedData = {
  items: User[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

// ─── Helper SHA-256 ───────────────────────────────────────────────────────────

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Normalización de respuesta paginada ─────────────────────────────────────

function normalizeUsersPagedResponse(res: any): UsersPagedData {
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UsersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);
  const [search, setSearchState] = useState("");
  const [filterStatus, setFilterStatusState] = useState<"all" | "active" | "inactive">("all");
  const [filterType, setFilterTypeState] = useState<"all" | "Local" | "AzureAD">("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Query paginada ──────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth-users", page, pageSize, search, filterStatus, filterType],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        pageSize,
        sortBy: "lastlogin",
        sortDirection: "desc",
      };
      if (search.trim()) params.search = search.trim();
      if (filterStatus !== "all") params.isActive = filterStatus === "active";
      if (filterType   !== "all") params.userType  = filterType;

      const res = await AuthUsersAPI.listPaged(params as any);
      return normalizeUsersPagedResponse(res);
    },
    placeholderData: (previousData) => previousData,
  });

  const users = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const hasPreviousPage = data?.hasPreviousPage ?? false;
  const hasNextPage = data?.hasNextPage ?? false;

  // ── Mutation: eliminar ──────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => AuthUsersAPI.remove(id),
    onSuccess: (result) => {
      // apiFetch nunca lanza, revisar si el response tiene error
      if (result.status === "error") {
        toast({
          title: "Error al eliminar",
          description: result.error?.message ?? "No se pudo eliminar el usuario",
          variant: "destructive",
        });
        return;
      }
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

  // ── Mutation: activar / inactivar ───────────────────────────────────────────

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      AuthUsersAPI.update(id, { isActive }),
    onSuccess: (result, variables) => {
      if (result.status === "error") {
        toast({
          title: "Error al cambiar estado",
          description: result.error?.message ?? "No se pudo actualizar el usuario",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["auth-users"] });
      toast({
        title: variables.isActive ? "Usuario activado" : "Usuario inactivado",
      });
    },
    onError: (err: unknown) => {
      toast({
        title: "Error al cambiar estado",
        description: parseApiError(err).message,
        variant: "destructive",
      });
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
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

  const setFilterStatus = (v: "all" | "active" | "inactive") => {
    setFilterStatusState(v);
    setPage(1);
  };

  const setFilterType = (v: "all" | "Local" | "AzureAD") => {
    setFilterTypeState(v);
    setPage(1);
  };

  // ── Loading / Error ─────────────────────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto p-6">
      {/* Encabezado */}
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

      {/* Barra de búsqueda y filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Búsqueda por email / nombre / login */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Buscar por email, nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por estado */}
            <div className="flex items-center gap-2 sm:w-48">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as "all" | "active" | "inactive")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por tipo */}
            <div className="sm:w-44">
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as "all" | "Local" | "AzureAD")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="Local">Local</SelectItem>
                  <SelectItem value="AzureAD">Azure AD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chips de filtros activos */}
          {(filterStatus !== "all" || filterType !== "all" || search) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {search && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearch("")}>
                  Búsqueda: "{search}" ×
                </Badge>
              )}
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterStatus("all")}>
                  Estado: {filterStatus === "active" ? "Activo" : "Inactivo"} ×
                </Badge>
              )}
              {filterType !== "all" && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterType("all")}>
                  Tipo: {filterType} ×
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setFilterStatus("all"); setFilterType("all"); }}
              >
                Limpiar todo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla */}
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
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {search || filterStatus !== "all" || filterType !== "all"
                      ? "No se encontraron usuarios con los filtros aplicados"
                      : "No hay usuarios registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={String(user.id)}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.displayName || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.userType === "Local" ? "default" : "secondary"
                        }
                      >
                        {user.userType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "default" : "destructive"}
                      >
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {user.lastLogin
                        ? new Date(user.lastLogin as any).toLocaleString("es-EC", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : <span className="italic">Nunca</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* Editar */}
                        <ActionIconButton
                          icon={Edit}
                          label="Editar usuario"
                          tone="primary"
                          onClick={() => handleEdit(user)}
                        />

                        {/* Activar / Inactivar */}
                        <ActionIconButton
                          icon={Power}
                          label={user.isActive ? "Inactivar usuario" : "Activar usuario"}
                          tone={user.isActive ? "warning" : "success"}
                          disabled={toggleActiveMutation.isPending}
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: String(user.id),
                              isActive: !user.isActive,
                            })
                          }
                        />

                        {/* Restablecer contraseña — solo usuarios Local */}
                        {user.userType === "Local" && (
                          <ActionIconButton
                            icon={KeyRound}
                            label="Restablecer contraseña"
                            tone="muted"
                            onClick={() => setResetPasswordUser(user)}
                          />
                        )}

                        {/* Eliminar */}
                        <ActionIconButton
                          icon={Trash2}
                          label="Eliminar usuario"
                          tone="destructive"
                          onClick={() => setDeleteUserId(String(user.id))}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

      {/* Dialog: confirmar eliminación */}
      <AlertDialog
        open={!!deleteUserId}
        onOpenChange={() => setDeleteUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteUserId && deleteMutation.mutate(deleteUserId)
              }
              className="bg-destructive hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: restablecer contraseña (solo Local) */}
      <ResetPasswordDialog
        user={resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
      />
    </div>
  );
}

// ─── Dialog de restablecimiento de contraseña ─────────────────────────────────

interface ResetPasswordDialogProps {
  user: User | null;
  onClose: () => void;
}

function ResetPasswordDialog({ user, onClose }: ResetPasswordDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mustChange, setMustChange] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const resetMutation = useMutation({
    mutationFn: async ({
      userId,
      pwd,
      mustChangePassword,
    }: {
      userId: string;
      pwd: string;
      mustChangePassword: boolean;
    }) => {
      const hash = await sha256hex(pwd);
      return LocalCredentialsAPI.update(userId, {
        passwordHash: hash,
        mustChangePassword,
      });
    },
    onSuccess: (result) => {
      if ((result as any).status === "error") {
        toast({
          title: "Error al restablecer contraseña",
          description:
            (result as any).error?.message ?? "No se pudo actualizar la contraseña",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Contraseña restablecida",
        description: "La nueva contraseña fue guardada exitosamente.",
      });
      handleClose();
    },
    onError: (err: unknown) => {
      toast({
        title: "Error al restablecer contraseña",
        description: parseApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setPassword("");
    setConfirm("");
    setMustChange(true);
    setError("");
    setShowPwd(false);
    setShowConfirm(false);
    onClose();
  };

  const handleSubmit = () => {
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener mínimo 8 caracteres");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Debe incluir al menos una letra mayúscula");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Debe incluir al menos un número");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (!user) return;
    resetMutation.mutate({
      userId: String(user.id),
      pwd: password,
      mustChangePassword: mustChange,
    });
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Restablecer contraseña
          </DialogTitle>
          <DialogDescription>
            Usuario:{" "}
            <span className="font-medium text-foreground">
              {user?.displayName || user?.email}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Nueva contraseña */}
          <div className="space-y-2">
            <Label htmlFor="rp-password">
              Nueva contraseña <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="rp-password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mín. 8 caracteres, mayúscula y número"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div className="space-y-2">
            <Label htmlFor="rp-confirm">
              Confirmar contraseña <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="rp-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita la contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error de validación */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Forzar cambio al primer ingreso */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <input
              type="checkbox"
              id="rp-mustChange"
              checked={mustChange}
              onChange={(e) => setMustChange(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <Label
              htmlFor="rp-mustChange"
              className="cursor-pointer select-none text-sm"
            >
              Forzar cambio de contraseña en el próximo ingreso
            </Label>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={resetMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={resetMutation.isPending}
              className="bg-primary hover:bg-primary/90 min-w-[140px]"
            >
              {resetMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : (
                "Restablecer contraseña"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
