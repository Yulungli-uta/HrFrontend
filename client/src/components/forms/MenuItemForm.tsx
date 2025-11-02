import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MenuItemsAPI, type ApiResponse } from "@/lib/api";
import type { MenuItem, CreateMenuItemDto, UpdateMenuItemDto } from "@/types/auth";

interface MenuItemFormProps {
  menuItem?: MenuItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  url: string;
  icon: string;
  parentId: string;
  order: number;
  moduleName: string;
  isVisible: boolean;
}

export default function MenuItemForm({
  menuItem,
  onSuccess,
  onCancel,
}: MenuItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!menuItem;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      name: menuItem?.name || "",
      url: menuItem?.url || "",
      icon: menuItem?.icon || "",
      parentId: menuItem?.parentId?.toString() || "",
      order: menuItem?.order || 0,
      moduleName: menuItem?.moduleName || "",
      isVisible: menuItem?.isVisible ?? true,
    },
  });

  const parentId = watch("parentId");

  // Obtener lista de items de menú para el selector de padre
  const { data: menuItemsResponse } = useQuery<ApiResponse<MenuItem[]>>({
    queryKey: ["menu-items"],
    queryFn: () => MenuItemsAPI.list(),
  });

  const allMenuItems =
    menuItemsResponse?.status === "success" ? menuItemsResponse.data : [];
  
  // Filtrar items que pueden ser padres (excluir el item actual si está editando)
  const availableParents = allMenuItems.filter(
    (item) => !isEditing || item.id !== menuItem.id
  );

  // Mutación para crear item de menú
  const createMutation = useMutation({
    mutationFn: (data: CreateMenuItemDto) => MenuItemsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast({
        title: "Item de menú creado",
        description: "El item de menú ha sido creado exitosamente",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear item de menú",
        description: error.message || "No se pudo crear el item de menú",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar item de menú
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMenuItemDto }) =>
      MenuItemsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast({
        title: "Item de menú actualizado",
        description: "El item de menú ha sido actualizado exitosamente",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar item de menú",
        description: error.message || "No se pudo actualizar el item de menú",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const parentIdValue = data.parentId ? parseInt(data.parentId) : null;

    if (isEditing && menuItem) {
      const updateData: UpdateMenuItemDto = {
        name: data.name,
        url: data.url || undefined,
        icon: data.icon || undefined,
        parentId: parentIdValue,
        order: data.order,
        moduleName: data.moduleName || undefined,
        isVisible: data.isVisible,
      };
      updateMutation.mutate({ id: menuItem.id, data: updateData });
    } else {
      const createData: CreateMenuItemDto = {
        name: data.name,
        url: data.url || undefined,
        icon: data.icon || undefined,
        parentId: parentIdValue,
        order: data.order,
        moduleName: data.moduleName || undefined,
        isVisible: data.isVisible,
      };
      createMutation.mutate(createData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">
          {isEditing ? "Editar Item de Menú" : "Nuevo Item de Menú"}
        </h2>

        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Nombre <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register("name", {
              required: "El nombre es requerido",
              minLength: {
                value: 2,
                message: "El nombre debe tener al menos 2 caracteres",
              },
            })}
            placeholder="Dashboard, Usuarios, Reportes, etc."
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* URL */}
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            {...register("url")}
            placeholder="/dashboard, /admin/users, etc."
          />
          <p className="text-sm text-gray-500">
            Ruta de navegación del item de menú
          </p>
        </div>

        {/* Icono */}
        <div className="space-y-2">
          <Label htmlFor="icon">Icono</Label>
          <Input
            id="icon"
            {...register("icon")}
            placeholder="Home, Users, Settings, etc."
          />
          <p className="text-sm text-gray-500">
            Nombre del icono de Lucide React
          </p>
        </div>

        {/* Item padre */}
        <div className="space-y-2">
          <Label htmlFor="parentId">Item Padre (Opcional)</Label>
          <Select
            value={parentId}
            onValueChange={(value) => setValue("parentId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin padre (item raíz)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin padre (item raíz)</SelectItem>
              {availableParents.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            Seleccione un item padre para crear un submenú
          </p>
        </div>

        {/* Orden */}
        <div className="space-y-2">
          <Label htmlFor="order">
            Orden <span className="text-red-500">*</span>
          </Label>
          <Input
            id="order"
            type="number"
            {...register("order", {
              required: "El orden es requerido",
              valueAsNumber: true,
            })}
            placeholder="0"
          />
          {errors.order && (
            <p className="text-sm text-red-600">{errors.order.message}</p>
          )}
          <p className="text-sm text-gray-500">
            Orden de aparición en el menú (menor número = mayor prioridad)
          </p>
        </div>

        {/* Módulo */}
        <div className="space-y-2">
          <Label htmlFor="moduleName">Módulo</Label>
          <Input
            id="moduleName"
            {...register("moduleName")}
            placeholder="Admin, HR, Reports, etc."
          />
          <p className="text-sm text-gray-500">
            Nombre del módulo al que pertenece este item
          </p>
        </div>

        {/* Visible */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isVisible"
            {...register("isVisible")}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="isVisible" className="cursor-pointer">
            Visible en el menú
          </Label>
        </div>

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Los items de menú se organizan jerárquicamente.
            Puede crear submenús seleccionando un item padre. El orden determina
            la posición en el menú.
          </p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading
            ? "Guardando..."
            : isEditing
            ? "Actualizar Item"
            : "Crear Item"}
        </Button>
      </div>
    </form>
  );
}
