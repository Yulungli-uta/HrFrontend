import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Menu, Plus, Edit, Trash2, Search, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { MenuItemsAPI, type ApiResponse } from "@/lib/api";
import type { MenuItem, MenuItemTree } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import MenuItemForm from "@/components/forms/MenuItemForm";

export default function MenuItemsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [deleteMenuItemId, setDeleteMenuItemId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener lista de items de menú
  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse<MenuItem[]>>({
    queryKey: ["menu-items"],
    queryFn: () => MenuItemsAPI.list(),
  });

  // Mutación para eliminar item de menú
  const deleteMutation = useMutation({
    mutationFn: (id: number) => MenuItemsAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast({
        title: "Item de menú eliminado",
        description: "El item de menú ha sido eliminado exitosamente",
      });
      setDeleteMenuItemId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar el item de menú",
        variant: "destructive",
      });
    },
  });

  const menuItems = apiResponse?.status === "success" ? apiResponse.data : [];

  // Construir árbol de menús
  const menuTree = useMemo(() => {
    const itemsMap = new Map<number, MenuItemTree>();
    const rootItems: MenuItemTree[] = [];

    // Crear mapa de items
    menuItems.forEach((item) => {
      itemsMap.set(item.id, { ...item, children: [] });
    });

    // Construir árbol
    menuItems.forEach((item) => {
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

    // Ordenar por campo 'order'
    const sortByOrder = (items: MenuItemTree[]) => {
      items.sort((a, b) => a.order - b.order);
      items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          sortByOrder(item.children);
        }
      });
    };

    sortByOrder(rootItems);
    return rootItems;
  }, [menuItems]);

  // Filtrar items de menú por búsqueda
  const filteredMenuItems = menuItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.moduleName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (menuItem: MenuItem) => {
    setEditingMenuItem(menuItem);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMenuItem(null);
  };

  const handleDelete = (id: number) => {
    setDeleteMenuItemId(id);
  };

  // Renderizar item de menú con sus hijos
  const renderMenuItem = (item: MenuItemTree, level: number = 0) => {
    return (
      <>
        <TableRow key={item.id}>
          <TableCell>
            <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center gap-2">
              {level > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
              <span className="font-medium">{item.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-sm">{item.url || "-"}</TableCell>
          <TableCell className="text-sm">{item.icon || "-"}</TableCell>
          <TableCell>
            <Badge variant="outline">{item.order}</Badge>
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
                onClick={() => handleDelete(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {item.children &&
          item.children.map((child) => renderMenuItem(child, level + 1))}
      </>
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

  if (apiResponse?.status === "error") {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {apiResponse.error.message}</p>
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
            <MenuItemForm
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, URL o módulo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de items de menú */}
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
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm">{item.url || "-"}</TableCell>
                      <TableCell className="text-sm">{item.icon || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.order}</Badge>
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
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : (
                // Vista de árbol cuando no hay búsqueda
                menuTree.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No hay items de menú registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  menuTree.map((item) => renderMenuItem(item))
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog
        open={!!deleteMenuItemId}
        onOpenChange={() => setDeleteMenuItemId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El item de menú será eliminado
              permanentemente. Si tiene submenús, también serán eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMenuItemId && deleteMutation.mutate(deleteMenuItemId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
