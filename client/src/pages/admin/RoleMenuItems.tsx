// src/pages/admin/RoleMenuItems.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Settings, Save, ChevronRight, ChevronDown } from "lucide-react";
import { RolesAPI, MenuItemsAPI, RoleMenuItemsAPI } from "@/lib/api/auth";
import type { ApiResponse } from "@/lib/api/client";
import type { Role, MenuItem, RoleMenuItem, CreateRoleMenuItemDto } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

/* =========================
 * Helpers
 * ========================= */
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

type Node = MenuItem & { children?: Node[] };

function buildTree(items: MenuItem[]): Node[] {
  const map = new Map<number, Node>();
  const roots: Node[] = [];

  for (const it of items) map.set(it.id, { ...it, children: [] });
  for (const it of items) {
    const node = map.get(it.id)!;
    const p = it.parentId ?? null;
    if (p === null) roots.push(node);
    else {
      const parent = map.get(p);
      if (parent && parent !== node) parent.children!.push(node);
      else roots.push(node);
    }
  }

  const sortByOrder = (arr: Node[]) => {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    arr.forEach((n) => n.children && n.children.length && sortByOrder(n.children));
  };
  sortByOrder(roots);
  return roots;
}

function flattenIdsFrom(node: Node): number[] {
  const out: number[] = [node.id];
  if (node.children?.length) {
    for (const c of node.children) out.push(...flattenIdsFrom(c));
  }
  return out;
}

function collectAllIds(tree: Node[]): number[] {
  const out: number[] = [];
  for (const n of tree) out.push(...flattenIdsFrom(n));
  return out;
}

/* =========================
 * Checkbox tri-estado
 * ========================= */
function TriStateCheckbox({
  checked,
  indeterminate,
  disabled,
  id,
  onToggle,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  id: string;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate && !checked;
    }
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      id={id}
      className="h-4 w-4 rounded border-gray-300 cursor-pointer"
      checked={checked}
      onChange={(e) => {
        e.stopPropagation(); // evita el doble toggle
        onToggle();
      }}
      disabled={disabled}
    />
  );
}


/* =========================
 * Página
 * ========================= */
export default function RoleMenuItemsPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState<boolean>(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  /* ====== Queries (sin refetch en foco para no pisar selección) ====== */
  const { data: rolesResp } = useQuery<ApiResponse<Role[]>>({
    queryKey: ["roles"],
    queryFn: () => RolesAPI.list(),
    refetchOnWindowFocus: false,
  });

  const { data: menusResp } = useQuery<ApiResponse<MenuItem[]>>({
    queryKey: ["menu-items"],
    queryFn: () => MenuItemsAPI.list(),
    refetchOnWindowFocus: false,
  });

  const { data: roleMenusResp, isLoading } = useQuery<ApiResponse<RoleMenuItem[]>>({
    queryKey: ["role-menu-items"],
    queryFn: () => RoleMenuItemsAPI.list(),
    refetchOnWindowFocus: false,
  });

  const roles: Role[] = useMemo(() => {
    if (!rolesResp || (rolesResp as any).status === "error") return [];
    return asArray<Role>((rolesResp as any).data);
  }, [rolesResp]);

  const allMenus: MenuItem[] = useMemo(() => {
    if (!menusResp || (menusResp as any).status === "error") return [];
    return asArray<MenuItem>((menusResp as any).data).filter((m) => !m.isDeleted);
  }, [menusResp]);

  const roleMenuItems: RoleMenuItem[] = useMemo(() => {
    if (!roleMenusResp || (roleMenusResp as any).status === "error") return [];
    return asArray<RoleMenuItem>((roleMenusResp as any).data);
  }, [roleMenusResp]);

  const activeRoles = useMemo(
    () => roles.filter((r) => r.isActive && !r.isDeleted),
    [roles]
  );

  const tree = useMemo(() => buildTree(allMenus), [allMenus]);
  const allIds = useMemo(() => new Set(collectAllIds(tree)), [tree]);

  // Mapas para cálculo eficiente (padres/hijos)
  const parentById = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const m of allMenus) map.set(m.id, m.parentId ?? null);
    return map;
  }, [allMenus]);

  const childrenById = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const m of allMenus) map.set(m.id, []);
    for (const m of allMenus) {
      if (m.parentId != null && map.has(m.parentId)) {
        map.get(m.parentId)!.push(m.id);
      }
    }
    return map;
  }, [allMenus]);

  // Expandir raíces por defecto
  useEffect(() => {
    if (expanded.size === 0 && tree.length) {
      setExpanded(new Set(tree.map((r) => r.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.length]);

  // Cargar asignación SOLO cuando cambia el rol
  useEffect(() => {
    if (!selectedRoleId) {
      setSelectedIds(new Set());
      setDirty(false);
      return;
    }
    const roleId = Number(selectedRoleId);
    const current = roleMenuItems
      .filter((rm) => rm.roleId === roleId)
      .map((rm) => rm.menuItemId)
      .filter((id) => allIds.has(id));
    setSelectedIds(new Set(current));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId]);

  /* ====== Estado calculado ====== */
  const isChecked = (id: number) => selectedIds.has(id);

  const isIndeterminate = (id: number): boolean => {
    const kids = childrenById.get(id) ?? [];
    if (!kids.length) return false;

    let any = false;
    let all = true;
    for (const k of kids) {
      const childChecked = isChecked(k);
      const childInd = isIndeterminate(k);
      any = any || childChecked || childInd;
      all = all && childChecked && !childInd;
    }
    return any && !all && !isChecked(id);
  };

  /* ====== Mutations ====== */
  const assignMutation = useMutation({
    mutationFn: (data: CreateRoleMenuItemDto) => RoleMenuItemsAPI.assign(data),
  });

  const removeMutation = useMutation({
    mutationFn: ({ roleId, menuItemId }: { roleId: number; menuItemId: number }) =>
      RoleMenuItemsAPI.remove(roleId, menuItemId),
  });

  /* ====== Handlers ====== */
  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(tree.map((r) => r.id)));
  const collapseAll = () => setExpanded(new Set());

  const collectDescendants = (id: number): number[] => {
    const out: number[] = [];
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      const kids = childrenById.get(cur) ?? [];
      for (const k of kids) {
        out.push(k);
        stack.push(k);
      }
    }
    return out;
  };

  const collectAncestors = (id: number): number[] => {
    const out: number[] = [];
    let cur: number | null | undefined = id;
    while (true) {
      const p = parentById.get(cur!);
      if (p == null) break;
      out.push(p);
      cur = p;
    }
    return out;
  };

  const handleToggle = (id: number) => {
    console.debug("toggle", { role: selectedRoleId, id });
    if (!selectedRoleId) return;
    setDirty(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const currently = next.has(id);
      if (currently) {
        next.delete(id);
        for (const d of collectDescendants(id)) next.delete(d);
      } else {
        next.add(id);
        for (const a of collectAncestors(id)) next.add(a);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!selectedRoleId) return;
    setDirty(true);
    setSelectedIds(new Set(allIds));
  };

  const handleClear = () => {
    if (!selectedRoleId) return;
    setDirty(true);
    setSelectedIds(new Set());
  };

  const handleResetFromServer = () => {
    if (!selectedRoleId) return;
    const roleId = Number(selectedRoleId);
    const current = roleMenuItems
      .filter((rm) => rm.roleId === roleId)
      .map((rm) => rm.menuItemId)
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
    const currentAssigned = roleMenuItems
      .filter((rm) => rm.roleId === roleId)
      .map((rm) => rm.menuItemId);

    const newAssigned = Array.from(selectedIds);
    const toAdd = newAssigned.filter((id) => !currentAssigned.includes(id));
    const toRemove = currentAssigned.filter((id) => !selectedIds.has(id));

    if (!toAdd.length && !toRemove.length) {
      toast({ title: "Sin cambios", description: "No hay cambios para guardar." });
      setDirty(false);
      return;
    }

    try {
      await Promise.allSettled([
        ...toAdd.map((menuItemId) =>
          assignMutation.mutateAsync({ roleId, menuItemId, isVisible: true })
        ),
        ...toRemove.map((menuItemId) => removeMutation.mutateAsync({ roleId, menuItemId })),
      ]);

      toast({ title: "Cambios guardados", description: "Asignaciones actualizadas." });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["role-menu-items"] });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error al guardar",
        description: err?.message || "No se pudieron guardar todos los cambios.",
        variant: "destructive",
      });
    }
  };

  /* ====== Render ====== */
  const renderNode = (node: Node, level = 0) => {
    const hasChildren = !!node.children?.length;
    const isOpen = expanded.has(node.id);
    const checked = isChecked(node.id);
    const indeterminate = isIndeterminate(node.id);

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-1 select-none"
          style={{ paddingLeft: `${level * 16}px` }}
          onClick={(e) => {
            // Permite hacer clic en la fila para alternar (sin afectar el botón de expandir ni el checkbox)
            e.stopPropagation();
            handleToggle(node.id);
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-6 w-6 shrink-0 rounded hover:bg-gray-100"
              aria-label={isOpen ? "Contraer" : "Expandir"}
              title={isOpen ? "Contraer" : "Expandir"}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="inline-block h-6 w-6" />
          )}

          <TriStateCheckbox
            id={`menu-${node.id}`}
            checked={checked}
            indeterminate={indeterminate}
            disabled={!selectedRoleId}
            // onClick={() => handleToggle(node.id)}
            onToggle={() => handleToggle(node.id)}
          />

          <Label
            htmlFor={`menu-${node.id}`}
            className="cursor-pointer text-sm font-normal truncate"
            title={node.name}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggle(node.id);
            }}
          >
            {node.name}
          </Label>
        </div>

        {hasChildren && isOpen && (
          <div>
            {node.children!.map((c) => renderNode(c, level + 1))}
          </div>
        )}
      </div>
    );
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
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 truncate">
            <Settings className="h-8 w-8 shrink-0" />
            <span className="truncate">Asignación de Menús a Roles</span>
          </h1>
          <p className="text-gray-600 mt-2 truncate">
            Configure qué items de menú son visibles para cada rol
          </p>
        </div>
      </div>

      {/* Configuración + Toolbar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Select de Rol */}
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
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                  <strong>Descripción:</strong>{" "}
                  {roles.find((r) => r.id === Number(selectedRoleId))?.description ||
                    "Sin descripción"}
                </p>
              )}
            </div>

            {/* Toolbar */}
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
                  onClick={expandAll}
                  disabled={tree.length === 0}
                  className="h-8 px-2 text-xs whitespace-nowrap"
                >
                  Expandir todo
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={collapseAll}
                  disabled={tree.length === 0}
                  className="h-8 px-2 text-xs whitespace-nowrap"
                >
                  Contraer todo
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFromServer}
                  disabled={!selectedRoleId}
                  className="h-8 px-2 text-xs whitespace-nowrap"
                  title="Descartar cambios locales y recuperar asignaciones desde servidor"
                >
                  Reset desde servidor
                </Button>

                <div className="ms-auto">
                  <Button
                    onClick={handleSave}
                    disabled={
                      !selectedRoleId ||
                      assignMutation.isPending ||
                      removeMutation.isPending
                    }
                    className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs whitespace-nowrap"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    <span className="hidden md:inline">Guardar Cambios</span>
                    <span className="md:hidden">Guardar</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Árbol */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="hidden xl:block" />
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="truncate">Items de Menú Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedRoleId ? (
              <p className="text-center text-gray-500 py-8">
                Seleccione un rol para configurar sus menús
              </p>
            ) : !tree.length ? (
              <p className="text-center text-gray-500 py-8">
                No hay items de menú disponibles
              </p>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {tree.map((n) => renderNode(n))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nota */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Los items seleccionados serán visibles para los usuarios con el
              rol elegido cuando presione “Guardar Cambios”.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
