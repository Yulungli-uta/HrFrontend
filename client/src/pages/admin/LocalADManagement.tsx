// src/pages/admin/LocalADManagement.tsx
import { useState, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

import {
  Server, Users, FolderOpen, Plus, Search, MoreHorizontal,
  Edit, Trash2, UserCheck, UserX, RefreshCw, Loader2,
  UserPlus, UserMinus, AlertTriangle, ChevronDown,
} from "lucide-react";

import { LocalAdManagementAPI } from "@/lib/api";
import type { LocalAdUserResponse, LocalAdGroupResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";
import LocalAdUserForm from "@/components/forms/LocalAdUserForm";

const PAGE_SIZE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge variant={enabled ? "default" : "destructive"} className="text-xs">
      {enabled ? "Habilitado" : "Deshabilitado"}
    </Badge>
  );
}

// ─── Tab Usuarios ─────────────────────────────────────────────────────────────

function UsersTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filter, setFilter] = useState("");
  const [committedFilter, setCommittedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [allUsers, setAllUsers] = useState<LocalAdUserResponse[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<LocalAdUserResponse | null>(null);
  const [deleteUser, setDeleteUser] = useState<LocalAdUserResponse | null>(null);
  const [toggleUser, setToggleUser] = useState<LocalAdUserResponse | null>(null);
  const [userGroupsUser, setUserGroupsUser] = useState<LocalAdUserResponse | null>(null);

  // Carga inicial / al cambiar filtro
  const { isLoading, isFetching, refetch } = useQuery({
    queryKey: ["local-ad-users", committedFilter],
    queryFn: async () => {
      const res = await LocalAdManagementAPI.listUsers(1, PAGE_SIZE, committedFilter || undefined);
      if (res.status === "success") {
        const items = res.data?.items ?? [];
        setAllUsers(items);
        setPage(1);
        setHasMore(items.length === PAGE_SIZE);
      }
      return res;
    },
    staleTime: 30_000,
  });

  const handleSearch = useCallback(() => {
    setCommittedFilter(filter.trim());
  }, [filter]);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await LocalAdManagementAPI.listUsers(nextPage, PAGE_SIZE, committedFilter || undefined);
      if (res.status === "success") {
        const newItems = res.data?.items ?? [];
        setAllUsers((prev) => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(newItems.length === PAGE_SIZE);
      }
    } catch (err) {
      toast({ title: "Error al cargar más", description: parseApiError(err).message, variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  }, [page, committedFilter, toast]);

  // Habilitar / deshabilitar
  const toggleMutation = useMutation({
    mutationFn: async (user: LocalAdUserResponse) => {
      if (user.accountEnabled) {
        return LocalAdManagementAPI.disableUser(user.id);
      }
      return LocalAdManagementAPI.enableUser(user.id);
    },
    onSuccess: (_, user) => {
      const action = user.accountEnabled ? "deshabilitado" : "habilitado";
      toast({ title: `Usuario ${action}`, description: `${user.displayName} ha sido ${action}.` });
      setToggleUser(null);
      refetch();
    },
    onError: (err: unknown) => {
      toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  // Eliminar
  const deleteMutation = useMutation({
    mutationFn: (user: LocalAdUserResponse) => LocalAdManagementAPI.deleteUser(user.id),
    onSuccess: (_, user) => {
      toast({ title: "Usuario eliminado", description: `${user.displayName} fue eliminado del directorio.` });
      setDeleteUser(null);
      refetch();
    },
    onError: (err: unknown) => {
      toast({ title: "Error al eliminar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const handleFormSuccess = useCallback(() => {
    setIsFormOpen(false);
    setEditingUser(null);
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Buscar por nombre, email o cuenta..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Actualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 shrink-0"
          onClick={() => { setEditingUser(null); setIsFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo usuario
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Cargo</TableHead>
                <TableHead className="hidden lg:table-cell">Departamento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : allUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    {committedFilter ? "No se encontraron usuarios con ese filtro" : "No hay usuarios en el directorio"}
                  </TableCell>
                </TableRow>
              ) : (
                allUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium truncate max-w-[180px]">{user.displayName}</div>
                      <div className="text-xs text-muted-foreground md:hidden truncate">{user.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{user.email}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{user.jobTitle || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{user.department || "-"}</TableCell>
                    <TableCell><StatusBadge enabled={user.accountEnabled} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingUser(user); setIsFormOpen(true); }}>
                            <Edit className="h-4 w-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setUserGroupsUser(user)}>
                            <FolderOpen className="h-4 w-4 mr-2" />Ver grupos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setToggleUser(user)}>
                            {user.accountEnabled
                              ? <><UserX className="h-4 w-4 mr-2" />Deshabilitar</>
                              : <><UserCheck className="h-4 w-4 mr-2" />Habilitar</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteUser(user)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cargar más (LDAP no tiene totalCount confiable) */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cargando...</>
              : <><ChevronDown className="h-4 w-4 mr-2" />Cargar más usuarios</>}
          </Button>
        </div>
      )}

      {/* Modal crear / editar */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); setEditingUser(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar usuario AD" : "Nuevo usuario AD"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Modifique los atributos del usuario en el Active Directory local."
                : "Complete los datos para crear una cuenta en el Active Directory local."}
            </DialogDescription>
          </DialogHeader>
          <LocalAdUserForm
            key={editingUser?.id ?? "new"}
            user={editingUser}
            onSuccess={handleFormSuccess}
            onCancel={() => { setIsFormOpen(false); setEditingUser(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmar habilitar/deshabilitar */}
      <AlertDialog open={!!toggleUser} onOpenChange={(open) => !open && setToggleUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleUser?.accountEnabled ? "Deshabilitar usuario" : "Habilitar usuario"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleUser?.accountEnabled
                ? `¿Está seguro que desea deshabilitar la cuenta de "${toggleUser.displayName}"? El usuario no podrá iniciar sesión.`
                : `¿Desea habilitar la cuenta de "${toggleUser?.displayName}"? El usuario podrá iniciar sesión nuevamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleUser && toggleMutation.mutate(toggleUser)}
              disabled={toggleMutation.isPending}
              className={toggleUser?.accountEnabled ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}
            >
              {toggleMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : toggleUser?.accountEnabled ? "Deshabilitar" : "Habilitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Eliminar usuario del directorio
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es <strong>irreversible</strong>. El objeto LDAP de{" "}
              <strong>"{deleteUser?.displayName}"</strong> será eliminado permanentemente del
              Active Directory local. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUser && deleteMutation.mutate(deleteUser)}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : "Eliminar permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet: grupos del usuario */}
      {userGroupsUser && (
        <UserGroupsSheet
          user={userGroupsUser}
          onClose={() => setUserGroupsUser(null)}
        />
      )}
    </div>
  );
}

// ─── Sheet: grupos de un usuario ─────────────────────────────────────────────

function UserGroupsSheet({ user, onClose }: { user: LocalAdUserResponse; onClose: () => void }) {
  const { toast } = useToast();

  const { data: groupsRes, isLoading, refetch } = useQuery({
    queryKey: ["local-ad-user-groups", user.id],
    queryFn: () => LocalAdManagementAPI.listUserGroups(user.id),
    staleTime: 30_000,
  });

  const groups: LocalAdGroupResponse[] =
    groupsRes?.status === "success" ? ((groupsRes.data as any) ?? []) : [];

  const removeMutation = useMutation({
    mutationFn: ({ groupId }: { groupId: string }) =>
      LocalAdManagementAPI.removeGroupMember(groupId, user.id),
    onSuccess: () => {
      toast({ title: "Eliminado del grupo", description: "El usuario fue removido del grupo." });
      refetch();
    },
    onError: (err: unknown) => {
      toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Grupos de {user.displayName}
          </SheetTitle>
          <SheetDescription>{user.email}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded animate-pulse" />
            ))
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              El usuario no pertenece a ningún grupo
            </p>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-background"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{g.name}</p>
                  {g.description && (
                    <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeMutation.mutate({ groupId: g.id })}
                  disabled={removeMutation.isPending}
                  title="Quitar del grupo"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Tab Grupos ───────────────────────────────────────────────────────────────

function GroupsTab() {
  const { toast } = useToast();

  const [filter, setFilter] = useState("");
  const [committedFilter, setCommittedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [allGroups, setAllGroups] = useState<LocalAdGroupResponse[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<LocalAdGroupResponse | null>(null);

  const { isLoading, isFetching, refetch } = useQuery({
    queryKey: ["local-ad-groups", committedFilter],
    queryFn: async () => {
      const res = await LocalAdManagementAPI.listGroups(1, PAGE_SIZE, committedFilter || undefined);
      if (res.status === "success") {
        const items = res.data?.items ?? [];
        setAllGroups(items);
        setPage(1);
        setHasMore(items.length === PAGE_SIZE);
      }
      return res;
    },
    staleTime: 30_000,
  });

  const handleSearch = useCallback(() => {
    setCommittedFilter(filter.trim());
  }, [filter]);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await LocalAdManagementAPI.listGroups(nextPage, PAGE_SIZE, committedFilter || undefined);
      if (res.status === "success") {
        const newItems = res.data?.items ?? [];
        setAllGroups((prev) => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(newItems.length === PAGE_SIZE);
      }
    } catch (err) {
      toast({ title: "Error al cargar más", description: parseApiError(err).message, variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  }, [page, committedFilter, toast]);

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Buscar grupo por nombre..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={handleSearch} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Actualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del grupo</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="text-right">Miembros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : allGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    {committedFilter ? "No se encontraron grupos" : "No hay grupos en el directorio"}
                  </TableCell>
                </TableRow>
              ) : (
                allGroups.map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedGroup(group)}
                  >
                    <TableCell>
                      <div className="font-medium">{group.name}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[200px]">
                      {group.description || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {group.email || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); }}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Gestionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cargando...</>
              : <><ChevronDown className="h-4 w-4 mr-2" />Cargar más grupos</>}
          </Button>
        </div>
      )}

      {/* Sheet de miembros del grupo */}
      {selectedGroup && (
        <GroupMembersSheet
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}

// ─── Sheet: miembros de un grupo ─────────────────────────────────────────────

function GroupMembersSheet({ group, onClose }: { group: LocalAdGroupResponse; onClose: () => void }) {
  const { toast } = useToast();
  const [addEmail, setAddEmail] = useState("");
  const [searching, setSearching] = useState(false);

  const { data: membersRes, isLoading, refetch } = useQuery({
    queryKey: ["local-ad-group-members", group.id],
    queryFn: () => LocalAdManagementAPI.listGroupMembers(group.id),
    staleTime: 30_000,
  });

  // listGroupMembers retorna usuarios (cast necesario — el tipo en el servicio está como GroupResponse por limitación del tipado)
  const members: LocalAdUserResponse[] =
    membersRes?.status === "success" ? ((membersRes.data as any) ?? []) : [];

  const removeMutation = useMutation({
    mutationFn: (userId: string) => LocalAdManagementAPI.removeGroupMember(group.id, userId),
    onSuccess: () => {
      toast({ title: "Miembro eliminado", description: "El usuario fue removido del grupo." });
      refetch();
    },
    onError: (err: unknown) => {
      toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) => LocalAdManagementAPI.addGroupMember(group.id, userId),
    onSuccess: () => {
      toast({ title: "Miembro agregado", description: "El usuario fue agregado al grupo." });
      setAddEmail("");
      refetch();
    },
    onError: (err: unknown) => {
      toast({ title: "Error al agregar", description: parseApiError(err).message, variant: "destructive" });
    },
  });

  const handleAddByEmail = async () => {
    const email = addEmail.trim();
    if (!email) return;
    setSearching(true);
    try {
      const res = await LocalAdManagementAPI.getUserByEmail(email);
      if (res.status === "success" && res.data?.id) {
        addMutation.mutate(res.data.id);
      } else {
        toast({ title: "Usuario no encontrado", description: `No se encontró un usuario con el email "${email}".`, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {group.name}
          </SheetTitle>
          <SheetDescription>
            {group.description || "Gestione los miembros de este grupo"}
          </SheetDescription>
        </SheetHeader>

        {/* Agregar miembro */}
        <div className="mt-6 space-y-2">
          <Label>Agregar miembro por email</Label>
          <div className="flex gap-2">
            <Input
              placeholder="usuario@dominio.local"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddByEmail()}
            />
            <Button
              onClick={handleAddByEmail}
              disabled={!addEmail.trim() || searching || addMutation.isPending}
              className="shrink-0"
            >
              {searching || addMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <UserPlus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Lista de miembros */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <Label>Miembros actuales</Label>
            <Badge variant="secondary">{members.length}</Badge>
          </div>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded animate-pulse" />
            ))
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              El grupo no tiene miembros
            </p>
          ) : (
            <div className="space-y-2 mt-2">
              {members.map((member: any) => (
                <div
                  key={member.id ?? member.objectGuid ?? member.email}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{member.displayName ?? member.name ?? member.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email ?? member.mail ?? ""}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeMutation.mutate(member.id ?? member.objectGuid)}
                    disabled={removeMutation.isPending}
                    title="Quitar del grupo"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function LocalADManagementPage() {
  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-lg">
            <Server className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
          </div>
          Active Directory Local
        </h1>
        <p className="text-muted-foreground mt-2 text-sm lg:text-base">
          Gestione usuarios y grupos del directorio LDAP local
        </p>
      </div>

      {/* Aviso LDAP */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Limitación LDAP:</strong> el total de registros no es exacto. Use "Cargar más"
          para paginar. Los contadores son aproximados.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Grupos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="groups" className="mt-6">
          <GroupsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
