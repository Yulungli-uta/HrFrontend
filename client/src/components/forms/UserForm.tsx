import { useForm } from "react-hook-form";
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
import { AuthUsersAPI } from "@/lib/api/auth";
import type { User, CreateUserDto, UpdateUserDto } from "@/types/auth";
import type { BaseCrudFormProps } from "@/types/components";

interface UserFormProps extends Omit<BaseCrudFormProps<User, CreateUserDto>, 'entity'> {
  user?: User | null;
}

interface FormData {
  email: string;
  displayName: string;
  userType: string;
  isActive: boolean;
}

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
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

  // Usar el hook useCrudMutation
  const { create, update, isLoading } = useCrudMutation<User, CreateUserDto, UpdateUserDto>({
    queryKey: ['auth-users'],
    createFn: AuthUsersAPI.create,
    updateFn: AuthUsersAPI.update,
    onSuccess,
    createSuccessMessage: 'Usuario creado exitosamente',
    updateSuccessMessage: 'Usuario actualizado exitosamente',
    createErrorMessage: 'Error al crear usuario',
    updateErrorMessage: 'Error al actualizar usuario'
  });

  const onSubmit = (data: FormData) => {
    if (isEditing && user) {
      const updateData: UpdateUserDto = {
        displayName: data.displayName || undefined,
        isActive: data.isActive,
        userType: data.userType,
      };
      update.mutate({ id: user.id, data: updateData });
    } else {
      const createData: CreateUserDto = {
        email: data.email,
        displayName: data.displayName || undefined,
        userType: data.userType,
      };
      create.mutate(createData);
    }
  };

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
          {isEditing && (
            <p className="text-sm text-gray-500">
              El email no puede ser modificado
            </p>
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
              <SelectValue placeholder="Seleccione tipo de usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Local">Local</SelectItem>
              <SelectItem value="AzureAD">Azure AD</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            {userType === "Local"
              ? "Usuario con credenciales locales (email y contraseña)"
              : "Usuario autenticado mediante Azure Active Directory"}
          </p>
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
            <strong>Nota:</strong> Después de crear el usuario, podrá asignarle
            roles desde la página de gestión de usuarios.
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
