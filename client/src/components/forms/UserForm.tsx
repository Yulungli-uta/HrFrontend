// src/components/forms/UserForm.tsx
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from "lucide-react";

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
import { EmployeeCombobox } from "@/components/ui/EmployeeCombobox";

import { AuthUsersAPI, LocalCredentialsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { User, CreateUserDto, UpdateUserDto } from "@/features/auth";
import type { BaseCrudFormProps } from "@/types/components";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UserFormProps extends Omit<BaseCrudFormProps<User, CreateUserDto>, "entity"> {
  user?: User | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface FormData {
  email: string;
  displayName: string;
  userType: string;
  isActive: boolean;
  password: string;
  confirmPassword: string;
  mustChangePassword: boolean;
}

type CreateUserWithEmployeePayload = {
  success: boolean;
  data: {
    user: User;
    userEmployee: unknown;
  };
  message: string | null;
  errors: string[] | null;
  timestamp: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UserForm({ user, onSuccess, onCancel, onDirtyChange }: UserFormProps) {
  const isEditing = !!user;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeError, setSelectedEmployeeError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: _formIsDirty },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    defaultValues: {
      email: user?.email ?? "",
      displayName: user?.displayName ?? "",
      userType: user?.userType ?? "Local",
      isActive: user?.isActive ?? true,
      password: "",
      confirmPassword: "",
      mustChangePassword: true,
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_formIsDirty);
  }, [_formIsDirty]);

  const userType = watch("userType");
  const passwordValue = watch("password");
  const displayName = watch("displayName");

  const isLocal = userType === "Local";

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserDto) => AuthUsersAPI.create(data),
    onError: (error: unknown) => {
      const msg = (error as any)?.message ?? "Error al crear el usuario";
      toast({ title: "Error al crear usuario", description: msg, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      AuthUsersAPI.update(id, data),
    onSuccess: (response) => {
      if (response.status === "error") {
        toast({
          title: "Error al actualizar usuario",
          description: response.error?.message ?? "Error desconocido",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["auth-users"] });
      toast({ title: "Usuario actualizado exitosamente" });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const msg = (error as any)?.message ?? "Error desconocido";
      toast({ title: "Error al actualizar usuario", description: msg, variant: "destructive" });
    },
  });

  const isLoading = createUserMutation.isPending || updateUserMutation.isPending;

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    if (isEditing && user) {
      updateUserMutation.mutate({
        id: user.id,
        data: {
          displayName: data.displayName || undefined,
          isActive: data.isActive,
          userType: data.userType,
        },
      });
      return;
    }

    // AzureAD (empleado real) necesita el vínculo a HR; Local (cuenta administrativa/
    // de servicio) no siempre corresponde a un empleado, así que no se exige ahí.
    if (!isLocal && !selectedEmployeeId) {
      setSelectedEmployeeError("Seleccione un empleado antes de crear el usuario.");
      return;
    }
    setSelectedEmployeeError(null);

    // Paso 1: crear usuario en auth.tbl_Users
    const createResponse = await createUserMutation.mutateAsync({
      email: data.email,
      displayName: data.displayName || undefined,
      userType: data.userType,
      hrEmployeeId: selectedEmployeeId ?? undefined,
    });

    if (createResponse.status === "error") {
      toast({
        title: "Error al crear usuario",
        description: createResponse.error?.message ?? "Error inesperado",
        variant: "destructive",
      });
      return;
    }

    const payload = createResponse.data as unknown as CreateUserWithEmployeePayload;
    const createdUser = payload?.data?.user;

    if (!payload?.success || !createdUser?.id) {
      toast({
        title: "Error al crear usuario",
        description: payload?.message ?? "Respuesta inesperada del servidor",
        variant: "destructive",
      });
      return;
    }

    // Paso 2: guardar credenciales si es usuario Local
    if (isLocal && data.password) {
      try {
        const hash = await sha256hex(data.password);
        const credResponse = await LocalCredentialsAPI.create({
          userId: createdUser.id,
          passwordHash: hash,
          mustChangePassword: data.mustChangePassword,
        });
        if ((credResponse as any)?.status === "error") {
          toast({
            title: "Usuario creado, pero sin credenciales",
            description:
              "No se pudieron guardar las credenciales locales. Asígnelas manualmente.",
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Usuario creado, pero sin credenciales",
          description: "Error al guardar la contraseña. Asígnela manualmente.",
          variant: "destructive",
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["auth-users"] });
    toast({ title: "Usuario creado exitosamente" });
    reset();
    onSuccess?.();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* 1. Tipo de usuario — SIEMPRE PRIMERO */}
      <div className="space-y-2">
        <Label htmlFor="userType">
          Tipo de Usuario <span className="text-destructive">*</span>
        </Label>
        <Select
          value={userType}
          onValueChange={(value) => {
            setValue("userType", value);
            // limpiar campos al cambiar de tipo
            setValue("email", "");
            setValue("displayName", "");
            setSelectedEmployeeId(null);
            setSelectedEmployeeError(null);
          }}
          disabled={isEditing}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione tipo de usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Local">Local</SelectItem>
            <SelectItem value="AzureAD">Azure AD</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isLocal
            ? "Usuario con credenciales locales (email y contraseña)."
            : "Usuario autenticado mediante Azure Active Directory."}
        </p>
      </div>

      {/* 2a. AzureAD → combobox empleado (solo creación) */}
      {!isEditing && !isLocal && (
        <div className="space-y-2">
          <Label>
            Empleado <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Seleccione un empleado para autocompletar el email y nombre.
          </p>

          <EmployeeCombobox
            value={selectedEmployeeId}
            onSelect={(id) => {
              setSelectedEmployeeId(id);
              setSelectedEmployeeError(null);
            }}
            onSelectEmployee={(emp) => {
              setValue("email", emp.email ?? "", { shouldValidate: true });
              setValue("displayName", emp.fullName ?? "", { shouldValidate: true });
            }}
            placeholder="Buscar empleado por nombre o cédula..."
          />

          {selectedEmployeeError ? (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {selectedEmployeeError}
            </p>
          ) : (
            !selectedEmployeeId && (
              <p className="flex items-center gap-1 text-xs text-warning">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Sin empleado seleccionado no se creará el vínculo UserEmployee.
              </p>
            )
          )}
        </div>
      )}

      {/* 2b. Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register("email", {
            required: "El email es requerido",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Formato de email inválido",
            },
          })}
          readOnly={!isEditing && !isLocal}
          disabled={isEditing}
          placeholder={
            isEditing
              ? undefined
              : isLocal
                ? "usuario@dominio.com"
                : "Se completa al seleccionar empleado"
          }
          className={cn(!isEditing && !isLocal && "bg-muted cursor-default")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
        {isEditing && (
          <p className="text-xs text-muted-foreground">El email no puede ser modificado.</p>
        )}
      </div>

      {/* 3. Nombre para mostrar */}
      <div className="space-y-2">
        <Label htmlFor="displayName">
          Nombre para mostrar
          {!isEditing && !isLocal && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (autocompletado desde el empleado)
            </span>
          )}
        </Label>
        <Input
          id="displayName"
          {...register("displayName")}
          readOnly={!isEditing && !isLocal}
          placeholder={
            isEditing || isLocal
              ? "Juan Pérez"
              : "Se completa al seleccionar empleado"
          }
          className={cn(!isEditing && !isLocal && "bg-muted cursor-default")}
        />
        {!isEditing && !isLocal && displayName && (
          <p className="text-xs text-success flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            Nombre obtenido del empleado seleccionado.
          </p>
        )}
      </div>

      {/* 4. Contraseña — solo Local + creación */}
      {!isEditing && isLocal && (
        <>
          <div className="space-y-2">
            <Label htmlFor="password">
              Contraseña <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password", {
                  required: "La contraseña es requerida",
                  minLength: { value: 8, message: "Mínimo 8 caracteres" },
                  validate: {
                    uppercase: (v) =>
                      /[A-Z]/.test(v) || "Debe incluir al menos una mayúscula",
                    number: (v) =>
                      /[0-9]/.test(v) || "Debe incluir al menos un número",
                  },
                })}
                placeholder="Mín. 8 caracteres, mayúscula y número"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirmar contraseña <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                {...register("confirmPassword", {
                  required: "Confirme la contraseña",
                  validate: (v) =>
                    v === passwordValue || "Las contraseñas no coinciden",
                })}
                placeholder="Repita la contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <input
              type="checkbox"
              id="mustChangePassword"
              {...register("mustChangePassword")}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <Label htmlFor="mustChangePassword" className="cursor-pointer select-none text-sm">
              Forzar cambio de contraseña en el primer ingreso
            </Label>
          </div>
        </>
      )}

      {/* 5. Estado activo — solo edición */}
      {isEditing && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <input
            type="checkbox"
            id="isActive"
            {...register("isActive")}
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          />
          <Label htmlFor="isActive" className="cursor-pointer select-none">
            Usuario activo
          </Label>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-2">
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
          className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {createUserMutation.isPending ? "Creando usuario..." : "Guardando..."}
            </span>
          ) : isEditing ? (
            "Actualizar Usuario"
          ) : (
            "Crear Usuario"
          )}
        </Button>
      </div>
    </form>
  );
}
