import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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
import { useCrudMutation } from "@/hooks/useCrudMutation";
import { MenuItemsAPI, type ApiResponse } from "@/lib/api";
import type { MenuItem, CreateMenuItemDto, UpdateMenuItemDto } from "@/types/auth";
import type { BaseCrudFormProps } from "@/types/components";

interface MenuItemFormProps extends Omit<BaseCrudFormProps<MenuItem, CreateMenuItemDto>, 'entity'> {
  menuItem?: MenuItem | null;
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

  // Usar el hook useCrudMutation
  const { create, update, isLoading } = useCrudMutation<MenuItem, CreateMenuItemDto, UpdateMenuItemDto>({
    queryKey: ["menu-items"],
    createFn: MenuItemsAPI.create,
    updateFn: MenuItemsAPI.update,
    onSuccess,
    createSuccessMessage: 'Item de menú creado exitosamente',
    updateSuccessMessage: 'Item de menú actualizado exitosamente',
    createErrorMessage: 'Error al crear item de menú',
    updateErrorMessage: 'Error al actualizar item de menú'
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
      update.mutate({ id: menuItem.id, data: updateData });
    } else {
      const createData: CreateMenuItemDto = {
        name: data.name,
        url: data.url || undefined,
        icon: data.icon || undefined,
        parentId: parentIdValue,
        order: data.order,
        moduleName: data.moduleName || undefined,
      };
      create.mutate(createData);
    }
  };

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
            placeholder="Inicio, Usuarios, Reportes, etc."
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
            placeholder="/dashboard, /users, etc."
          />
          <p className="text-sm text-gray-500">
            Ruta de la página. Dejar vacío si es un menú padre sin enlace.
          </p>
        </div>

        {/* Icono */}
        <div className="space-y-2">
          <Label htmlFor="icon">Icono</Label>
          <Input
            id="icon"
            {...register("icon")}
            placeholder="home, users, settings, etc."
          />
          <p className="text-sm text-gray-500">
            Nombre del icono de Lucide React
          </p>
        </div>

        {/* Menú Padre */}
        <div className="space-y-2">
          <Label htmlFor="parentId">Menú Padre (Opcional)</Label>
          <Select
            value={parentId}
            onValueChange={(value) => setValue("parentId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin padre (menú raíz)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin padre (menú raíz)</SelectItem>
              {availableParents.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            Seleccione un menú padre para crear un submenú
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
            Orden de aparición en el menú (menor número aparece primero)
          </p>
        </div>

        {/* Nombre del Módulo */}
        <div className="space-y-2">
          <Label htmlFor="moduleName">Nombre del Módulo</Label>
          <Input
            id="moduleName"
            {...register("moduleName")}
            placeholder="Administración, Recursos Humanos, etc."
          />
          <p className="text-sm text-gray-500">
            Nombre del módulo al que pertenece este item
          </p>
        </div>

        {/* Estado visible (solo en edición) */}
        {isEditing && (
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
        )}

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Los items de menú se pueden anidar creando
            submenús mediante la selección de un menú padre.
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
