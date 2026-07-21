import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
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
import { Label } from "@/components/ui/label";
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

import { Users2, Plus, Edit, Trash2, Search, Save, ShieldCheck, UserPlus, X, Check, History } from "lucide-react";
import { AccessProfilesAPI, AccessProfileRolesAPI, RolesAPI, AuthUsersAPI, UserAccessProfilesAPI } from "@/lib/api";
import type { ApiResponse, PagedResult } from "@/lib/api";
import type { AccessProfile, Role, AccessProfileRole, User, UserAccessProfile } from "@/features/auth";
import { useToast } from "@/hooks/use-toast";
import AccessProfileForm from "@/components/forms/AccessProfileForm";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { AuditHistoryDialog } from "@/components/shared/AuditHistoryDialog";
import { parseApiError } from "@/lib/error-handling";

function normalizePagedItems<T>(resp: any): T[] {
  if (!resp) return [];
  const d = resp.data;
  if (Array.isArray(d?.items)) return d.items as T[];
  if (Array.isArray(d?.Items)) return d.Items as T[];
  if (d?.success === true) {
    if (Array.isArray(d?.data?.items)) return d.data.items as T[];
    if (Array.isArray(d?.data?.Items)) return d.data.Items as T[];
  }
  if (Array.isArray(d)) return d as T[];
  return [];
}

/* =========================
 * Dialog: gestionar roles del perfil
 * ========================= */
function ManageProfileRolesDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: AccessProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rolesResp } = useQuery<ApiResponse<PagedResult<Role>>>({
    queryKey: ["roles"],
    queryFn: () => RolesAPI.list(1, 10000),
    refetchOnWindowFocus: false,
    enabled: open,
  });

  const { data: profileRolesResp, isLoading } = useQuery<ApiResponse<AccessProfileRole[]>>({
    queryKey: ["access-profile-roles", profile?.id],
    queryFn: () => AccessProfileRolesAPI.getByProfile(profile!.id),
    enabled: open && !!profile,
    refetchOnWindowFocus: false,
  });

  const roles: Role[] = useMemo(
    () => normalizePagedItems<Role>(rolesResp).filter((r) => r.isActive && !r.isDeleted),
    [rolesResp]
  );

  const filteredRoles: Role[] = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q)
    );
  }, [roles, roleSearch]);

  const profileRoles: AccessProfileRole[] = useMemo(
    () => (profileRolesResp?.status === "success" ? profileRolesResp.data : []),
    [profileRolesResp]
  );

  useEffect(() => {
    if (!open || !profile) return;
    setSelectedRoleIds(new Set(profileRoles.map((pr) => pr.roleId)));
    setDirty(false);
  }, [open, profile, profileRoles]);

  useEffect(() => {
    if (!open) setRoleSearch("");
  }, [open]);

  const assignMutation = useMutation({
    mutationFn: (roleId: number) => AccessProfileRolesAPI.assign({ accessProfileId: profile!.id, roleId }),
  });

  const removeMutation = useMutation({
    mutationFn: (roleId: number) => AccessProfileRolesAPI.remove(profile!.id, roleId),
  });

  const handleToggle = (roleId: number) => {
    setDirty(true);
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      next.has(roleId) ? next.delete(roleId) : next.add(roleId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!profile) return;

    const currentRoleIds = profileRoles.map((pr) => pr.roleId);
    const toAdd = Array.from(selectedRoleIds).filter((id) => !currentRoleIds.includes(id));
    const toRemove = currentRoleIds.filter((id) => !selectedRoleIds.has(id));

    if (!toAdd.length && !toRemove.length) {
      toast({ title: "Sin cambios", description: "No hay cambios para guardar." });
      setDirty(false);
      return;
    }

    const results = await Promise.allSettled([
      ...toAdd.map((roleId) => assignMutation.mutateAsync(roleId)),
      ...toRemove.map((roleId) => removeMutation.mutateAsync(roleId)),
    ]);

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      toast({
        title: "Guardado parcial",
        description: `Se produjeron ${failed.length} errores al actualizar los roles del perfil.`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Cambios guardados", description: "Roles del perfil actualizados." });
    }

    setDirty(false);
    await qc.invalidateQueries({ queryKey: ["access-profile-roles"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Roles del perfil "{profile?.name}"</DialogTitle>
          <DialogDescription>
            Seleccione qué roles incluye este perfil. Al asignar el perfil a un usuario, cada rol
            marcado aquí se agrega como una asignación de rol independiente para ese usuario.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="h-40 bg-muted rounded animate-pulse" />
        ) : roles.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay roles activos disponibles</p>
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Filtrar roles por nombre o descripción..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {roleSearch && (
                <button
                  type="button"
                  onClick={() => setRoleSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {filteredRoles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron roles que coincidan con "{roleSearch}"
              </p>
            ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredRoles.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id={`profile-role-${r.id}`}
                  className="h-4 w-4 rounded border-border cursor-pointer"
                  checked={selectedRoleIds.has(r.id)}
                  onChange={() => handleToggle(r.id)}
                />
                <Label htmlFor={`profile-role-${r.id}`} className="cursor-pointer text-sm font-normal">
                  {r.name}
                </Label>
                {r.description && (
                  <span className="text-xs text-muted-foreground truncate">— {r.description}</span>
                )}
              </div>
            ))}
          </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!dirty || assignMutation.isPending || removeMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =========================
 * Dialog: asignar/quitar este perfil a un usuario
 * ========================= */
function AssignProfileToUserDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: AccessProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) {
      setUserSearch("");
      setSelectedUser(null);
    }
  }, [open]);

  const { data: usersResp, isLoading: usersLoading } = useQuery<ApiResponse<PagedResult<User>>>({
    queryKey: ["auth-users"],
    queryFn: () => AuthUsersAPI.list(1, 10000),
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const users: User[] = useMemo(() => normalizePagedItems<User>(usersResp), [usersResp]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((u) => u.email.toLowerCase().includes(q) || (u.displayName ?? "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [users, userSearch]);

  const { data: userProfilesResp, isLoading: userProfilesLoading } = useQuery<ApiResponse<UserAccessProfile[]>>({
    queryKey: ["user-access-profiles", selectedUser?.id],
    queryFn: () => UserAccessProfilesAPI.getByUser(selectedUser!.id),
    enabled: open && !!selectedUser,
    refetchOnWindowFocus: false,
  });

  const userProfiles: UserAccessProfile[] = useMemo(
    () => (userProfilesResp?.status === "success" ? userProfilesResp.data : []),
    [userProfilesResp]
  );

  const isAssigned = useMemo(
    () => !!profile && userProfiles.some((up) => up.accessProfileId === profile.id && !up.isDeleted),
    [userProfiles, profile]
  );

  const assignMutation = useMutation({
    mutationFn: () => UserAccessProfilesAPI.assign({ userId: selectedUser!.id, accessProfileId: profile!.id }),
    onSuccess: () => {
      toast({
        title: "Perfil asignado",
        description: `"${profile?.name}" fue asignado a ${selectedUser?.email}. Los roles del perfil ya quedaron asignados a este usuario.`,
      });
      qc.invalidateQueries({ queryKey: ["user-access-profiles", selectedUser?.id] });
      qc.invalidateQueries({ queryKey: ["user-roles"] });
    },
    onError: (err: unknown) => {
      toast({ title: "Error al asignar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => UserAccessProfilesAPI.remove(selectedUser!.id, profile!.id),
    onSuccess: () => {
      toast({
        title: "Perfil removido",
        description: `"${profile?.name}" fue removido de ${selectedUser?.email}.`,
      });
      qc.invalidateQueries({ queryKey: ["user-access-profiles", selectedUser?.id] });
      qc.invalidateQueries({ queryKey: ["user-roles"] });
    },
    onError: (err: unknown) => {
      toast({ title: "Error al remover", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar perfil "{profile?.name}" a un usuario</DialogTitle>
          <DialogDescription>
            Busque un usuario por email o nombre. Al asignar, cada rol del perfil se agrega como
            asignación de rol independiente para ese usuario (visible en "Asignación de Roles").
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Buscar por email o nombre..."
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setSelectedUser(null);
              }}
              className="pl-9 pr-9"
              disabled={usersLoading}
            />
            {userSearch && (
              <button
                type="button"
                onClick={() => {
                  setUserSearch("");
                  setSelectedUser(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!selectedUser && userSearch && (
            <div className="border border-border rounded-md max-h-64 overflow-y-auto">
              {usersLoading ? (
                <div className="p-4 text-sm text-muted-foreground text-center">Cargando usuarios...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No se encontraron usuarios que coincidan con "{userSearch}"
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.displayName || "Sin nombre"}</p>
                    </div>
                    <Badge variant={u.isActive ? "default" : "destructive"} className="shrink-0 ms-2">
                      {u.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedUser && (
            <div className="border border-border rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selectedUser.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedUser.displayName || "Sin nombre"}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  Cambiar
                </Button>
              </div>

              {userProfilesLoading ? (
                <div className="h-8 bg-muted rounded animate-pulse" />
              ) : isAssigned ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-success flex items-center gap-1">
                    <Check className="h-4 w-4" /> Este usuario ya tiene el perfil asignado
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeMutation.mutate()}
                    disabled={removeMutation.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Quitar Perfil
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Este usuario no tiene el perfil</span>
                  <Button
                    size="sm"
                    onClick={() => assignMutation.mutate()}
                    disabled={assignMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Asignar Perfil
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =========================
 * Página
 * ========================= */
export default function AccessProfilesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
  const [deleteProfileId, setDeleteProfileId] = useState<number | null>(null);
  const [managingRolesProfile, setManagingRolesProfile] = useState<AccessProfile | null>(null);
  const [assigningUserProfile, setAssigningUserProfile] = useState<AccessProfile | null>(null);
  const [historyProfile, setHistoryProfile] = useState<AccessProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { setIsFormDirty, handleOpenChange, close: _closeForm, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard((open) => {
      setIsFormOpen(open);
      if (!open) setEditingProfile(null);
    });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profilesResp, isLoading, isError } = useQuery<ApiResponse<PagedResult<AccessProfile>>>({
    queryKey: ["access-profiles"],
    queryFn: () => AccessProfilesAPI.list(1, 200),
    refetchOnWindowFocus: false,
  });

  const profiles: AccessProfile[] = useMemo(() => normalizePagedItems<AccessProfile>(profilesResp), [profilesResp]);

  const filteredProfiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
    );
  }, [profiles, searchTerm]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => AccessProfilesAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-profiles"] });
      toast({ title: "Perfil eliminado", description: "El perfil de acceso ha sido eliminado exitosamente" });
      setDeleteProfileId(null);
    },
    onError: (err: unknown) => {
      toast({ title: "Error al eliminar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const handleEdit = (profile: AccessProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
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
              {Array.from({ length: 4 }).map((_, i) => (
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
            <p className="text-destructive">Error al cargar los perfiles de acceso. Intente nuevamente.</p>
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
            <Users2 className="h-8 w-8" />
            Perfiles de Acceso
          </h1>
          <p className="text-muted-foreground mt-2">
            Agrupe roles bajo un nombre reutilizable (ej. "Directora Administrativa") para asignarlos juntos
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setEditingProfile(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Perfil
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProfile ? "Editar perfil" : "Nuevo perfil"}</DialogTitle>
              <DialogDescription>
                Complete los campos y guarde para {editingProfile ? "actualizar" : "crear"} el perfil de acceso.
              </DialogDescription>
            </DialogHeader>

            <AccessProfileForm
              profile={editingProfile}
              onSuccess={_closeForm}
              onCancel={_closeForm}
              onDirtyChange={setIsFormDirty}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-primary">
              Un perfil de acceso NO es un rol nuevo — es una lista reutilizable de roles
              existentes. Asignar un perfil a un usuario expande automáticamente a asignaciones
              de rol concretas para ese usuario (visible en "Usuarios / Roles" con origen "Perfil").
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No se encontraron perfiles" : "No hay perfiles de acceso registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell>{profile.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={profile.isActive ? "default" : "destructive"}>
                        {profile.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <ActionIconButton
                          icon={Users2}
                          label="Gestionar roles"
                          tone="primary"
                          onClick={() => setManagingRolesProfile(profile)}
                        />
                        <ActionIconButton
                          icon={UserPlus}
                          label="Asignar a usuario"
                          tone="primary"
                          onClick={() => setAssigningUserProfile(profile)}
                        />
                        <ActionIconButton
                          icon={History}
                          label="Ver historial"
                          tone="primary"
                          onClick={() => setHistoryProfile(profile)}
                        />
                        <ActionIconButton
                          icon={Edit}
                          label="Editar perfil"
                          tone="primary"
                          onClick={() => handleEdit(profile)}
                        />
                        <ActionIconButton
                          icon={Trash2}
                          label="Eliminar perfil"
                          tone="destructive"
                          onClick={() => setDeleteProfileId(profile.id)}
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

      <AlertDialog open={!!deleteProfileId} onOpenChange={() => setDeleteProfileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El perfil de acceso será eliminado permanentemente
              (las asignaciones de rol ya expandidas a usuarios NO se revierten automáticamente).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProfileId && deleteMutation.mutate(deleteProfileId)}
              className="bg-destructive hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageProfileRolesDialog
        profile={managingRolesProfile}
        open={!!managingRolesProfile}
        onOpenChange={(open) => !open && setManagingRolesProfile(null)}
      />

      <AssignProfileToUserDialog
        profile={assigningUserProfile}
        open={!!assigningUserProfile}
        onOpenChange={(open) => !open && setAssigningUserProfile(null)}
      />

      {historyProfile && (
        <AuditHistoryDialog
          open={!!historyProfile}
          onOpenChange={(open) => !open && setHistoryProfile(null)}
          title={`Historial de asignaciones — "${historyProfile.name}"`}
          module="UserAccessProfiles"
          entityId={historyProfile.id}
        />
      )}

      <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />
    </div>
  );
}
