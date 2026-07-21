import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { KeyRound, Save, Search, X, ShieldCheck } from "lucide-react";
import { RolesAPI, RolePermissionsAPI, PermissionsCatalogAPI } from "@/lib/api";
import type { ApiResponse, PagedResult } from "@/lib/api";
import type { Role, Permission, RolePermission, CreateRolePermissionDto } from "@/features/auth";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";

/* =========================
 * Helpers
 * ========================= */

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

/** Agrupa el catálogo plano por Module, ordenado alfabéticamente. */
function groupByModule(permissions: Permission[]): Map<string, Permission[]> {
  const map = new Map<string, Permission[]>();
  const sorted = [...permissions].sort((a, b) => a.module.localeCompare(b.module) || a.action.localeCompare(b.action));
  for (const p of sorted) {
    if (!map.has(p.module)) map.set(p.module, []);
    map.get(p.module)!.push(p);
  }
  return map;
}

/* =========================
 * Página
 * ========================= */
export default function RoleActionPermissionsPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rolesResp } = useQuery<ApiResponse<PagedResult<Role>>>({
    queryKey: ["roles"],
    queryFn: () => RolesAPI.list(1, 10000),
    refetchOnWindowFocus: false,
  });

  const { data: permsResp } = useQuery<ApiResponse<Permission[]>>({
    queryKey: ["action-permissions-catalog"],
    queryFn: () => PermissionsCatalogAPI.listAll(),
    refetchOnWindowFocus: false,
  });

  const { data: rolePermsResp, isLoading } = useQuery<ApiResponse<RolePermission[]>>({
    queryKey: ["role-permissions", selectedRoleId],
    queryFn: () => RolePermissionsAPI.getByRole(Number(selectedRoleId)),
    enabled: !!selectedRoleId,
    refetchOnWindowFocus: false,
  });

  const roles: Role[] = useMemo(() => normalizePagedItems<Role>(rolesResp), [rolesResp]);
  const activeRoles = useMemo(() => roles.filter((r) => r.isActive && !r.isDeleted), [roles]);

  const allPermissions: Permission[] = useMemo(
    () => (permsResp?.status === "success" ? permsResp.data : []),
    [permsResp]
  );

  const rolePermissions: RolePermission[] = useMemo(
    () => (rolePermsResp?.status === "success" ? rolePermsResp.data : []),
    [rolePermsResp]
  );

  const filteredPermissions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allPermissions;
    return allPermissions.filter(
      (p) =>
        p.module.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }, [allPermissions, searchTerm]);

  const groupedPermissions = useMemo(() => groupByModule(filteredPermissions), [filteredPermissions]);
  const allIds = useMemo(() => new Set(allPermissions.map((p) => p.id)), [allPermissions]);

  /** Acciones distintas presentes en el catálogo (READ, CREATE, UPDATE, APPROVE, ...), para el selector "aplicar a todos los módulos". */
  const distinctActions = useMemo(() => {
    const set = new Set(allPermissions.map((p) => p.action));
    return Array.from(set).sort();
  }, [allPermissions]);

  const [bulkAction, setBulkAction] = useState<string>("");

  /** IDs de TODOS los permisos (de cualquier módulo) que tienen esta acción — no se limita a lo filtrado por búsqueda. */
  const idsForAction = (action: string) => allPermissions.filter((p) => p.action === action).map((p) => p.id);

  const isActionFullySelected = (action: string) => {
    const ids = idsForAction(action);
    return ids.length > 0 && ids.every((id) => isChecked(id));
  };

  useEffect(() => {
    if (!selectedRoleId) {
      setSelectedIds(new Set());
      setDirty(false);
      return;
    }
    const roleId = Number(selectedRoleId);
    const current = rolePermissions
      .filter((rp) => rp.roleId === roleId)
      .map((rp) => rp.permissionId)
      .filter((id) => allIds.has(id));
    setSelectedIds(new Set(current));
    setDirty(false);
  }, [selectedRoleId, rolePermissions, allIds]);

  const isChecked = (id: number) => selectedIds.has(id);

  const isModuleChecked = (module: string) => {
    const ids = (groupedPermissions.get(module) ?? []).map((p) => p.id);
    return ids.length > 0 && ids.every((id) => isChecked(id));
  };

  const isModuleIndeterminate = (module: string) => {
    const ids = (groupedPermissions.get(module) ?? []).map((p) => p.id);
    const anyChecked = ids.some((id) => isChecked(id));
    return anyChecked && !isModuleChecked(module);
  };

  const assignMutation = useMutation({
    mutationFn: (data: CreateRolePermissionDto) => RolePermissionsAPI.assign(data),
  });

  const removeMutation = useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: number; permissionId: number }) =>
      RolePermissionsAPI.remove(roleId, permissionId),
  });

  const handleToggle = (id: number) => {
    if (!selectedRoleId) return;
    setDirty(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleModule = (module: string) => {
    if (!selectedRoleId) return;
    setDirty(true);
    const ids = (groupedPermissions.get(module) ?? []).map((p) => p.id);
    const allChecked = ids.every((id) => isChecked(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!selectedRoleId) return;
    setDirty(true);
    setSelectedIds(new Set(allIds));
  };

  /** Marca/desmarca una acción (ej. READ) en TODOS los módulos que la tengan, de una sola vez. */
  const handleApplyActionToAll = () => {
    if (!selectedRoleId || !bulkAction) return;
    setDirty(true);
    const ids = idsForAction(bulkAction);
    const alreadyFull = isActionFullySelected(bulkAction);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (alreadyFull) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleClear = () => {
    if (!selectedRoleId) return;
    setDirty(true);
    setSelectedIds(new Set());
  };

  const handleResetFromServer = () => {
    if (!selectedRoleId) return;
    const roleId = Number(selectedRoleId);
    const current = rolePermissions
      .filter((rp) => rp.roleId === roleId)
      .map((rp) => rp.permissionId)
      .filter((id) => allIds.has(id));
    setSelectedIds(new Set(current));
    setDirty(false);
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      toast({
        title: "Seleccione un rol",
        description: "Debe seleccionar un rol antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    const roleId = Number(selectedRoleId);
    const currentAssigned = rolePermissions.filter((rp) => rp.roleId === roleId).map((rp) => rp.permissionId);
    const newAssigned = Array.from(selectedIds);
    const toAdd = newAssigned.filter((id) => !currentAssigned.includes(id));
    const toRemove = currentAssigned.filter((id) => !selectedIds.has(id));

    if (!toAdd.length && !toRemove.length) {
      toast({ title: "Sin cambios", description: "No hay cambios para guardar." });
      setDirty(false);
      return;
    }

    const results = await Promise.allSettled([
      ...toAdd.map((permissionId) => assignMutation.mutateAsync({ roleId, permissionId })),
      ...toRemove.map((permissionId) => removeMutation.mutateAsync({ roleId, permissionId })),
    ]);

    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length > 0) {
      toast({
        title: "Guardado parcial",
        description: `Se produjeron ${failed.length} errores al actualizar los permisos.`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Cambios guardados", description: "Permisos de acción actualizados." });
    }

    setDirty(false);
    await qc.invalidateQueries({ queryKey: ["role-permissions"] });
  };

  const selectedRole = useMemo(() => roles.find((r) => r.id === Number(selectedRoleId)), [roles, selectedRoleId]);

  const selectedRoleAssignmentsCount = useMemo(() => {
    if (!selectedRoleId) return 0;
    return rolePermissions.filter((rp) => rp.roleId === Number(selectedRoleId)).length;
  }, [rolePermissions, selectedRoleId]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 truncate">
            <KeyRound className="h-8 w-8 shrink-0" />
            <span className="truncate">Permisos de Acción por Rol</span>
          </h1>
          <p className="text-muted-foreground mt-2 truncate">
            Configure qué acciones ("MODULO.ACCION") puede realizar cada rol
          </p>
        </div>
      </div>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-primary">
              <strong>Modo sombra activo hoy:</strong> HrBackend registra en log quién sería
              bloqueado por falta de un permiso, pero no bloquea todavía (
              <code className="text-xs">Authorization:ShadowMode = true</code>). Los cambios que
              guarde aquí quedan efectivos en RepositoryUta de inmediato, pero HrBackend seguirá
              dejando pasar las acciones hasta que se apague el modo sombra.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="min-w-0">
              <Label className="mb-2 block">Seleccionar Rol</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione un rol" />
                </SelectTrigger>
                <SelectContent>
                  {activeRoles.length === 0 ? (
                    <SelectItem value="no-roles" disabled>
                      No hay roles activos
                    </SelectItem>
                  ) : (
                    activeRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {selectedRoleId && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    <strong>Descripción:</strong> {selectedRole?.description || "Sin descripción"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Permisos actuales:</strong> {selectedRoleAssignmentsCount}
                  </p>
                </div>
              )}
            </div>

            <div className="xl:col-span-2 min-w-0">
              <Label className="mb-2 block">Acciones</Label>
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectAll}
                  disabled={!selectedRoleId || allIds.size === 0}
                  className="h-8 px-2 text-xs whitespace-nowrap"
                >
                  <span className="hidden md:inline">Seleccionar todo</span>
                  <span className="md:hidden">Sel. todo</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={!selectedRoleId || selectedIds.size === 0}
                  className="h-8 px-2 text-xs whitespace-nowrap"
                >
                  <span className="hidden md:inline">Limpiar selección</span>
                  <span className="md:hidden">Limpiar</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFromServer}
                  disabled={!selectedRoleId}
                  className="h-8 px-2 text-xs whitespace-nowrap"
                >
                  Reset desde servidor
                </Button>

                <div className="ms-auto">
                  <Button
                    onClick={handleSave}
                    disabled={!selectedRoleId || assignMutation.isPending || removeMutation.isPending || !dirty}
                    className="bg-primary hover:bg-primary/90 h-8 px-3 text-xs whitespace-nowrap"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    <span className="hidden md:inline">Guardar Cambios</span>
                    <span className="md:hidden">Guardar</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="xl:col-span-3 min-w-0 pt-2 border-t border-border">
              <Label className="mb-2 block">Aplicar un tipo de permiso a todos los módulos</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={bulkAction} onValueChange={setBulkAction} disabled={!selectedRoleId}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Seleccione un tipo de permiso (READ, CREATE, ...)" />
                  </SelectTrigger>
                  <SelectContent>
                    {distinctActions.length === 0 ? (
                      <SelectItem value="no-actions" disabled>
                        No hay acciones en el catálogo
                      </SelectItem>
                    ) : (
                      distinctActions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action} ({idsForAction(action).length} módulo{idsForAction(action).length !== 1 ? "s" : ""})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyActionToAll}
                  disabled={!selectedRoleId || !bulkAction}
                  className="h-9 px-3 text-xs whitespace-nowrap"
                >
                  {bulkAction && isActionFullySelected(bulkAction)
                    ? `Quitar ${bulkAction} de todos los módulos`
                    : `Aplicar ${bulkAction || "..."} a todos los módulos`}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Ej: seleccione "READ" y aplique — marca READ en cada módulo del catálogo que lo tenga (Contratos, Vacaciones, Documentos, etc.), sin tener que entrar módulo por módulo.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Buscar por módulo, acción o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground"
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!selectedRoleId ? (
            <p className="text-center text-muted-foreground py-8">
              Seleccione un rol para configurar sus permisos de acción
            </p>
          ) : groupedPermissions.size === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm
                ? `No se encontraron permisos que coincidan con "${searchTerm}"`
                : "No hay permisos en el catálogo"}
            </p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {Array.from(groupedPermissions.entries()).map(([module, perms]) => (
                <div key={module} className="border border-border rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                    <input
                      type="checkbox"
                      id={`module-${module}`}
                      className="h-4 w-4 rounded border-border cursor-pointer"
                      checked={isModuleChecked(module)}
                      ref={(el) => {
                        if (el) el.indeterminate = isModuleIndeterminate(module);
                      }}
                      onChange={() => handleToggleModule(module)}
                      disabled={!selectedRoleId}
                    />
                    <Label htmlFor={`module-${module}`} className="cursor-pointer font-semibold text-sm">
                      {module}
                    </Label>
                    <span className="text-xs text-muted-foreground ms-auto">
                      {perms.filter((p) => isChecked(p.id)).length}/{perms.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 pl-1">
                    {perms.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`perm-${p.id}`}
                          className="h-4 w-4 rounded border-border cursor-pointer"
                          checked={isChecked(p.id)}
                          onChange={() => handleToggle(p.id)}
                          disabled={!selectedRoleId}
                        />
                        <Label
                          htmlFor={`perm-${p.id}`}
                          className="cursor-pointer text-sm font-normal truncate"
                          title={p.description ?? `${p.module}.${p.action}`}
                        >
                          {p.action}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <p className="text-sm text-primary">
              <strong>Nota:</strong> Los permisos seleccionados aplicarán a los usuarios con el rol
              elegido cuando presione "Guardar Cambios". El rol <strong>Administrador</strong> tiene
              el permiso especial <code className="text-xs">ADMIN.ACCESS</code>, que actúa como
              bypass universal — no necesita el resto de permisos marcados individualmente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
