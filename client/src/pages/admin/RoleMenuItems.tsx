import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Settings, Save } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { RolesAPI, MenuItemsAPI, RoleMenuItemsAPI, type ApiResponse } from "@/lib/api";
import type { Role, MenuItem, RoleMenuItem, CreateRoleMenuItemDto } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

export default function RoleMenuItemsPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener roles
  const { data: rolesResponse } = useQuery<ApiResponse<Role[]>>({
    queryKey: ["roles"],
    queryFn: () => RolesAPI.list(),
  });

  // Obtener items de menú
  const { data: menuItemsResponse } = useQuery<ApiResponse<MenuItem[]>>({
    queryKey: ["menu-items"],
    queryFn: () => MenuItemsAPI.list(),
  });

  // Obtener asignaciones actuales
  const { data: roleMenuItemsResponse, isLoading } = useQuery<ApiResponse<RoleMenuItem[]>>({
    queryKey: ["role-menu-items"],
    queryFn: () => RoleMenuItemsAPI.list(),
  });

  const roles = rolesResponse?.status === "success" ? rolesResponse.data : [];
  const menuItems = menuItemsResponse?.status === "success" ? menuItemsResponse.data : [];
  const roleMenuItems = roleMenuItemsResponse?.status === "success" ? roleMenuItemsResponse.data : [];

  const activeRoles = roles.filter((r) => r.isActive && !r.isDeleted);
  const visibleMenuItems = menuItems.filter((m) => !m.isDeleted);

  // Actualizar selección cuando cambia el rol
  useEffect(() => {
    if (selectedRoleId) {
      const roleId = parseInt(selectedRoleId);
      const assignedMenuIds = roleMenuItems
        .filter((rm) => rm.roleId === roleId)
        .map((rm) => rm.menuItemId);
      setSelectedMenuIds(new Set(assignedMenuIds));
    } else {
      setSelectedMenuIds(new Set());
    }
  }, [selectedRoleId, roleMenuItems]);

  // Mutación para crear asignación
  const createMutation = useMutation({
    mutationFn: (data: CreateRoleMenuItemDto) => RoleMenuItemsAPI.create(data),
  });

  // Mutación para eliminar asignación
  const deleteMutation = useMutation({
    mutationFn: ({ roleId, menuItemId }: { roleId: number; menuItemId: number }) =>
      RoleMenuItemsAPI.remove(roleId, menuItemId),
  });

  const handleToggleMenuItem = (menuItemId: number) => {
    const newSelection = new Set(selectedMenuIds);
    if (newSelection.has(menuItemId)) {
      newSelection.delete(menuItemId);
    } else {
      newSelection.add(menuItemId);
    }
    setSelectedMenuIds(newSelection);
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un rol",
        variant: "destructive",
      });
      return;
    }

    const roleId = parseInt(selectedRoleId);
    const currentAssignments = roleMenuItems
      .filter((rm) => rm.roleId === roleId)
      .map((rm) => rm.menuItemId);

    // Determinar qué agregar y qué eliminar
    const toAdd = Array.from(selectedMenuIds).filter(
      (id) => !currentAssignments.includes(id)
    );
    const toRemove = currentAssignments.filter(
      (id) => !selectedMenuIds.has(id)
    );

    try {
      // Agregar nuevas asignaciones
      for (const menuItemId of toAdd) {
        await createMutation.mutateAsync({
          roleId,
          menuItemId,
          isVisible: true,
        });
      }

      // Eliminar asignaciones
      for (const menuItemId of toRemove) {
        await deleteMutation.mutateAsync({ roleId, menuItemId });
      }

      queryClient.invalidateQueries({ queryKey: ["role-menu-items"] });
      toast({
        title: "Cambios guardados",
        description: "Las asignaciones de menú han sido actualizadas exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    }
  };

  // Organizar menús en árbol
  const menuTree = useMemo(() => {
    const itemsMap = new Map<number, MenuItem & { children?: MenuItem[] }>();
    const rootItems: (MenuItem & { children?: MenuItem[] })[] = [];

    visibleMenuItems.forEach((item) => {
      itemsMap.set(item.id, { ...item, children: [] });
    });

    visibleMenuItems.forEach((item) => {
      const treeItem = itemsMap.get(item.id)!;
      if (item.parentId === null) {
        rootItems.push(treeItem);
      } else {
        const parent = itemsMap.get(item.parentId);
        if (parent) {
          parent.children!.push(treeItem);
        }
      }
    });

    const sortByOrder = (items: (MenuItem & { children?: MenuItem[] })[]) => {
      items.sort((a, b) => a.order - b.order);
      items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          sortByOrder(item.children);
        }
      });
    };

    sortByOrder(rootItems);
    return rootItems;
  }, [visibleMenuItems]);

  // Renderizar item de menú con checkbox
  const renderMenuItemCheckbox = (
    item: MenuItem & { children?: MenuItem[] },
    level: number = 0
  ) => {
    return (
      <div key={item.id}>
        <div
          style={{ paddingLeft: `${level * 24}px` }}
          className="flex items-center space-x-2 py-2"
        >
          <input
            type="checkbox"
            id={`menu-${item.id}`}
            checked={selectedMenuIds.has(item.id)}
            onChange={() => handleToggleMenuItem(item.id)}
            className="h-4 w-4 rounded border-gray-300"
            disabled={!selectedRoleId}
          />
          <Label
            htmlFor={`menu-${item.id}`}
            className="cursor-pointer text-sm font-normal"
          >
            {item.name}
          </Label>
        </div>
        {item.children &&
          item.children.map((child) => renderMenuItemCheckbox(child, level + 1))}
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Asignación de Menús a Roles
          </h1>
          <p className="text-gray-600 mt-2">
            Configure qué items de menú son visibles para cada rol
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector de rol */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Seleccionar Rol</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                {activeRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRoleId && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  <strong>Descripción:</strong>{" "}
                  {roles.find((r) => r.id === parseInt(selectedRoleId))?.description ||
                    "Sin descripción"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de menús */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items de Menú Disponibles</CardTitle>
              <Button
                onClick={handleSave}
                disabled={!selectedRoleId || createMutation.isPending || deleteMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedRoleId ? (
              <p className="text-center text-gray-500 py-8">
                Seleccione un rol para configurar sus menús
              </p>
            ) : menuTree.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No hay items de menú disponibles
              </p>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {menuTree.map((item) => renderMenuItemCheckbox(item))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Los items de menú seleccionados serán visibles
              para todos los usuarios que tengan este rol asignado. Los cambios se
              aplican inmediatamente después de guardar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
