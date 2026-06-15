// src/components/forms/UserForm.tsx
import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  User2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  AuthUsersAPI,
  LocalCredentialsAPI,
  VistaDetallesEmpleadosAPI,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { User, CreateUserDto, UpdateUserDto } from "@/features/auth";
import type { BaseCrudFormProps } from "@/types/components";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UserFormProps extends Omit<BaseCrudFormProps<User, CreateUserDto>, "entity"> {
  user?: User | null;
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

interface EmployeeOption {
  email: string;
  displayName: string;
  department?: string;
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

function normalizeEmployees(raw: unknown): EmployeeOption[] {
  if (!raw) return [];
  const data = (raw as any)?.data ?? raw;
  const items: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
        ? data.results
        : [];

  return items
    .filter((e) => e?.email)
    .map((e) => ({
      email: String(e.email ?? ""),
      displayName: String(
        e.displayName ??
        e.fullName ??
        e.nombreCompleto ??
        `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() ??
        e.email ??
        ""
      ),
      department: e.department ?? e.departmentName ?? e.departamento ?? undefined,
    }));
}

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const isEditing = !!user;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [comboOpen, setComboOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
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

  const userType = watch("userType");
  const passwordValue = watch("password");
  const displayName = watch("displayName");

  const isLocal = userType === "Local";

  // ── Carga de empleados (solo en creación de AzureAD) ───────────────────────
  const { data: employeesRaw, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employee-details-for-user-form"],
    queryFn: () => VistaDetallesEmpleadosAPI.list(),
    enabled: !isEditing && !isLocal,
    staleTime: 5 * 60 * 1000,
  });

  const employeeOptions = useMemo<EmployeeOption[]>(() => {
    const all = normalizeEmployees(employeesRaw);
    if (!searchQuery.trim()) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(
      (e) =>
        e.email.toLowerCase().includes(q) ||
        e.displayName.toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q)
    );
  }, [employeesRaw, searchQuery]);

  const handleSelectEmployee = useCallback(
    (emp: EmployeeOption) => {
      setSelectedEmployee(emp);
      setValue("email", emp.email, { shouldValidate: true });
      setValue("displayName", emp.displayName, { shouldValidate: true });
      setComboOpen(false);
    },
    [setValue]
  );

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

    // Paso 1: crear usuario en auth.tbl_Users
    const createResponse = await createUserMutation.mutateAsync({
      email: data.email,
      displayName: data.displayName || undefined,
      userType: data.userType,
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
            setSelectedEmployee(null);
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

          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className={cn(
                  "w-full justify-between font-normal",
                  !selectedEmployee && "text-muted-foreground"
                )}
              >
                {selectedEmployee ? (
                  <span className="flex items-center gap-2 truncate">
                    <User2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">
                      {selectedEmployee.displayName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({selectedEmployee.email})
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <User2 className="h-4 w-4 shrink-0" />
                    Buscar empleado...
                  </span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
              sideOffset={4}
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar por nombre, email o departamento..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList className="max-h-64">
                  {isLoadingEmployees ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando empleados...
                    </div>
                  ) : employeeOptions.length === 0 ? (
                    <CommandEmpty>
                      {searchQuery
                        ? "No se encontraron empleados con ese criterio."
                        : "No hay empleados disponibles."}
                    </CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {employeeOptions.map((emp) => (
                        <CommandItem
                          key={emp.email}
                          value={emp.email}
                          onSelect={() => handleSelectEmployee(emp)}
                          className="flex items-start gap-3 py-2 cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0 text-primary",
                              selectedEmployee?.email === emp.email
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm text-foreground truncate">
                              {emp.displayName}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {emp.email}
                            </span>
                            {emp.department && (
                              <Badge
                                variant="secondary"
                                className="mt-1 w-fit text-[10px] px-1.5 py-0"
                              >
                                {emp.department}
                              </Badge>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {!selectedEmployee && (
            <p className="flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Sin empleado seleccionado no se creará el vínculo UserEmployee.
            </p>
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
