import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import { AccessProfilesAPI } from "@/lib/api";
import type { AccessProfile, CreateAccessProfileDto, UpdateAccessProfileDto } from "@/features/auth";
import type { BaseCrudFormProps } from "@/types/components";

interface AccessProfileFormProps extends Omit<BaseCrudFormProps<AccessProfile, CreateAccessProfileDto>, "entity"> {
  profile?: AccessProfile | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface FormData {
  name: string;
  description: string;
  isActive: boolean;
}

export default function AccessProfileForm({ profile, onSuccess, onCancel, onDirtyChange }: AccessProfileFormProps) {
  const isEditing = !!profile;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: _formIsDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: profile?.name || "",
      description: profile?.description || "",
      isActive: profile?.isActive ?? true,
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_formIsDirty);
  }, [_formIsDirty]);

  const { create, update, isLoading } = useCrudMutation<AccessProfile, CreateAccessProfileDto, UpdateAccessProfileDto>({
    queryKey: ["access-profiles"],
    createFn: AccessProfilesAPI.create,
    updateFn: AccessProfilesAPI.update,
    onSuccess,
    createSuccessMessage: "Perfil de acceso creado exitosamente",
    updateSuccessMessage: "Perfil de acceso actualizado exitosamente",
    createErrorMessage: "Error al crear el perfil de acceso",
    updateErrorMessage: "Error al actualizar el perfil de acceso",
  });

  const onSubmit = (data: FormData) => {
    if (isEditing && profile) {
      const updateData: UpdateAccessProfileDto = {
        name: data.name,
        description: data.description || undefined,
        isActive: data.isActive,
      };
      update.mutate({ id: profile.id, data: updateData });
    } else {
      const createData: CreateAccessProfileDto = {
        name: data.name,
        description: data.description || undefined,
      };
      create.mutate(createData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{isEditing ? "Editar Perfil de Acceso" : "Nuevo Perfil de Acceso"}</h2>

        <div className="space-y-2">
          <Label htmlFor="name">
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register("name", {
              required: "El nombre es requerido",
              minLength: { value: 3, message: "El nombre debe tener al menos 3 caracteres" },
            })}
            placeholder="Directora Administrativa, Coordinador de Guardias, etc."
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Para qué se usa este perfil y a quién se le asigna típicamente"
            rows={3}
          />
        </div>

        {isEditing && (
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="isActive" {...register("isActive")} className="h-4 w-4 rounded border-border" />
            <Label htmlFor="isActive" className="cursor-pointer">
              Perfil activo
            </Label>
          </div>
        )}

        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <p className="text-sm text-primary">
            <strong>Nota:</strong> Un perfil de acceso agrupa varios roles bajo un nombre reutilizable.
            Después de crear el perfil, use "Gestionar Roles" en la lista para elegir qué roles incluye.
            Al asignar el perfil a un usuario, cada rol del perfil se agrega como una asignación de rol
            independiente para ese usuario.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
          {isLoading ? "Guardando..." : isEditing ? "Actualizar Perfil" : "Crear Perfil"}
        </Button>
      </div>
    </form>
  );
}
