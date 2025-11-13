// src/pages/admin/MenuItems.tsx
import { useState, useMemo, Fragment, useRef } from "react";
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

import { Menu, Plus, Edit, Trash2, Search, ChevronRight } from "lucide-react";

import { MenuItemsAPI } from "@/lib/api/auth";
import type { ApiResponse } from "@/lib/api/client";
import type { MenuItem, MenuItemTree } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import MenuItemForm from "@/components/forms/MenuItemForm";

/** Normaliza cualquier payload común a arreglo de MenuItem */
function coerceToMenuArray(payload: unknown): MenuItem[] {
  if (Array.isArray(payload)) return payload as MenuItem[];
  if (payload && typeof payload === "object") {
    // @ts-ignore
    if (Array.isArray(payload.items)) return payload.items as MenuItem[];
    // @ts-ignore
    if (Array.isArray(payload.results)) return payload.results as MenuItem[];
    // @ts-ignore
    if (Array.isArray(payload.data)) return payload.data as MenuItem[];
    // Diccionario { [id]: MenuItem }
    // @ts-ignore
    const values = Object.values(payload);
    if (
      values.length > 0 &&
      values.every(
        (v) =>
          v &&
          typeof v === "object" &&
          ("name" in v || "url" in v || "moduleName" in v)
      )
    ) {
      return values as MenuItem[];
    }
  }
  return [];
}

/** Construye árbol seguro desde una lista plana */
function buildMenuTreeSafe(items: MenuItem[]): MenuItemTree[] {
  const itemsMap = new Map<number, MenuItemTree>();
  const rootItems: MenuItemTree[] = [];

  // Inicializa nodos y normaliza orden/parentId
  for (const it of items) {
    const id = Number((it as any).id);
    if (!Number.isFinite(id)) continue; // ignora registros corruptos sin id

    const parentIdRaw = (it as any).parentId;
    const parentId =
      parentIdRaw === undefined || parentIdRaw === null || parentIdRaw === ""
        ? null
        : Number(parentIdRaw);

    const order =
      typeof (it as any).order === "number"
        ? (it as any).order
        : Number((it as any).sort ?? 0) || 0;

    itemsMap.set(id, {
      ...(it as any),
      id,
      parentId,
      order,
      children: [],
    });
  }

  // Vincula hijos con padres con tolerancia
  for (const it of items) {
    const id = Number((it as any).id);
    const node = itemsMap.get(id);
    if (!node) continue;

    if (node.parentId === null) {
      rootItems.push(node);
      continue;
    }

    const parent = itemsMap.get(node.parentId);
    if (parent && parent !== node) {
      parent.children!.push(node);
    } else {
      // Si no hay padre válido, trátalo como raíz para no perderlo
      rootItems.push(node);
    }
  }

  // Ordenar por 'order' recursivamente
  const sortByOrder = (arr: MenuItemTree[]) => {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const n of arr) {
      if (n.children && n.children.length > 0) sortByOrder(n.children);
    }
  };
  sortByOrder(rootItems);

  return rootItems;
}

export default function MenuItemsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [deleteMenuItemId, setDeleteMenuItemId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Evitar doble click en eliminar
  const deletingRef = useRef(false);

  // Obtener lista y normalizar SIEMPRE a MenuItem[]
  const {
    data: menuItems = [],
    isLoading,
    error,
  } = useQuery<ApiResponse<unknown>, Error, MenuItem[]>({
    queryKey: ["menu-items"],
    queryFn: async () => {
      const res = await MenuItemsAPI.list();
      // eslint-disable-next-line no-console
      console.debug("[MenuItemsPage] MenuItemsAPI.list() raw:", res);
      return res;
    },
    select: (res) => {
      if (!res) return [];
      // @ts-ignore
      if ("status" in res && res.status !== "success") {
        // @ts-ignore
        const message =
          res?.error?.message || "No se pudo obtener los items de menú";
        toast({ title: "Error", description: message, variant: "destructive" });
        return [];
      }
      // @ts-ignore
      return coerceToMenuArray(res.data);
    },
    staleTime: 30_000,
  });

  // Mutación para eliminar item (con reintento simple)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return MenuItemsAPI.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast({
        title: "Item de menú eliminado",
        description: "El item de menú ha sido eliminado exitosamente",
      });
      setDeleteMenuItemId(null);
      deletingRef.current = false;
    },
    onError: async (err: any, id) => {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "No se pudo eliminar el item de menú";
      // Reintento simple si el backend devolvió 409 (por dependencias)
      const status = err?.response?.status;
      if (status === 409) {
        toast({
          title: "No se puede eliminar",
          description:
            "Este item tiene dependencias (hijos o vínculos). Revise y vuelva a intentar.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error al eliminar", description: message, variant: "destructive" });
      }
      deletingRef.current = false;
    },
  });

  // Árbol seguro
  const menuTree = useMemo<MenuItemTree[]>(() => {
    try {
      return buildMenuTreeSafe(menuItems);
    } catch (e) {
      console.error("[MenuItemsPage] buildMenuTreeSafe error:", e, menuItems);
      return [];
    }
  }, [menuItems]);

  // Filtro seguro (vista plana cuando hay búsqueda)
  const filteredMenuItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return menuItems;
    return menuItems.filter((item) => {
      const name = (item.name ?? "").toLowerCase();
      const url = (item.url ?? "").toLowerCase();
      const mod = (item.moduleName ?? "").toLowerCase();
      return name.includes(term) || url.includes(term) || mod.includes(term);
    });
  }, [menuItems, searchTerm]);

  const handleEdit = (menuItem: MenuItem) => {
    setEditingMenuItem(menuItem);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMenuItem(null);
  };

  const handleDelete = (id: number) => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleteMenuItemId(id);
  };

  const confirmDelete = () => {
    if (deleteMenuItemId) {
      deleteMutation.mutate(deleteMenuItemId);
    }
  };

  // Render recursivo de árbol con keys únicas
  const renderMenuItem = (item: MenuItemTree, level = 0, path = `root-${item.id}`) => {
    const rowKey = `${path}-lvl${level}`;
    return (
      <Fragment key={rowKey}>
        <TableRow key={`${rowKey}-row`}>
          <TableCell>
            <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center gap-2">
              {level > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
              <span className="font-medium">{item.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-sm">{item.url || "-"}</TableCell>
          <TableCell className="text-sm">{item.icon || "-"}</TableCell>
          <TableCell>
            <Badge variant="outline">{item.order ?? 0}</Badge>
          </TableCell>
          <TableCell className="text-sm">{item.moduleName || "-"}</TableCell>
          <TableCell>
            <Badge variant={item.isVisible ? "default" : "secondary"}>
              {item.isVisible ? "Visible" : "Oculto"}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(Number(item.id))}
                className="text-red-600 hover:text-red-700"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        {Array.isArray(item.children) &&
          item.children.map((child) =>
            renderMenuItem(child, level + 1, `${path}-${child.id}`)
          )}
      </Fragment>
    );
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
              Error al cargar los items de menú. Intente nuevamente.
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
            <Menu className="h-8 w-8" />
            Gestión de Items de Menú
          </h1>
          <p className="text-gray-600 mt-2">
            Administre los items de menú y su estructura jerárquica
          </p>
        </div>

        {/* Modal Crear/Editar — Accesible */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setEditingMenuItem(null)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Item de Menú
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMenuItem ? "Editar item de menú" : "Nuevo item de menú"}
              </DialogTitle>
              <DialogDescription>
                Complete los campos y guarde para {editingMenuItem ? "actualizar" : "crear"} el item.
              </DialogDescription>
            </DialogHeader>

            <MenuItemForm
              key={editingMenuItem ? String(editingMenuItem.id) : "new"}
              menuItem={editingMenuItem}
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
              placeholder="Buscar por nombre, URL o módulo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              aria-label="Buscar items de menú"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Icono</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Visibilidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {searchTerm ? (
                // Vista plana cuando hay búsqueda
                filteredMenuItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No se encontraron items de menú
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMenuItems.map((item) => (
                    <TableRow key={`flat-${String(item.id)}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm">{item.url || "-"}</TableCell>
                      <TableCell className="text-sm">{item.icon || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.order ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.moduleName || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={item.isVisible ? "default" : "secondary"}>
                          {item.isVisible ? "Visible" : "Oculto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(Number(item.id))}
                            className="text-red-600 hover:text-red-700"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : menuTree.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No hay items de menú registrados
                  </TableCell>
                </TableRow>
              ) : (
                menuTree.map((n) => renderMenuItem(n, 0, `root-${n.id}`))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteMenuItemId} onOpenChange={() => {
        setDeleteMenuItemId(null);
        deletingRef.current = false; // reset de guard
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El item de menú será eliminado permanentemente.
              Si tiene submenús, también serán eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
