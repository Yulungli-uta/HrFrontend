import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { AuthUsersAPI } from "@/lib/api";
import type { User, CreateUserDto, UpdateUserDto } from "@/types/auth";

interface UserFormProps {
  user?: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  email: string;
  displayName: string;
  userType: string;
  isActive: boolean;
}

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      email: user?.email || "",
      displayName: user?.displayName || "",
      userType: user?.userType || "Local",
      isActive: user?.isActive ?? true,
    },
  });

  const userType = watch("userType");

  // Mutación para crear usuario
  const createMutation = useMutation({
    mutationFn: (data: CreateUserDto) => AuthUsersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-users'] });
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear usuario",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar usuario
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      AuthUsersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-users'] });
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar usuario",
        description: error.message || "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditing && user) {
      const updateData: UpdateUserDto = {
        displayName: data.displayName || undefined,
        isActive: data.isActive,
        userType: data.userType,
      };
      updateMutation.mutate({ id: user.id, data: updateData });
    } else {
      const createData: CreateUserDto = {
        email: data.email,
        displayName: data.displayName || undefined,
        userType: data.userType,
      };
      createMutation.mutate(createData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">
          {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
        </h2>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email", {
              required: "El email es requerido",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Email inválido",
              },
            })}
            disabled={isEditing}
            placeholder="usuario@ejemplo.com"
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Nombre para mostrar */}
        <div className="space-y-2">
          <Label htmlFor="displayName">Nombre para mostrar</Label>
          <Input
            id="displayName"
            {...register("displayName")}
            placeholder="Juan Pérez"
          />
        </div>

        {/* Tipo de usuario */}
        <div className="space-y-2">
          <Label htmlFor="userType">
            Tipo de Usuario <span className="text-red-500">*</span>
          </Label>
          <Select
            value={userType}
            onValueChange={(value) => setValue("userType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Local">Local</SelectItem>
              <SelectItem value="AzureAD">Azure AD / Office 365</SelectItem>
            </SelectContent>
          </Select>
          {errors.userType && (
            <p className="text-sm text-red-600">{errors.userType.message}</p>
          )}
        </div>

        {/* Estado activo (solo en edición) */}
        {isEditing && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              {...register("isActive")}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Usuario activo
            </Label>
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Los usuarios de tipo "Local" podrán iniciar sesión
            con email y contraseña. Los usuarios de tipo "Azure AD" solo podrán
            autenticarse mediante Office 365.
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
            ? "Actualizar Usuario"
            : "Crear Usuario"}
        </Button>
      </div>
    </form>
  );
}
