// src/components/forms/UserForm.tsx
import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, User2, AlertCircle } from "lucide-react";

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
  AuthUsersAPI, //UserEmployeesAPI, 
  VistaDetallesEmpleadosAPI
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { User, CreateUserDto, UpdateUserDto } from "@/types/auth";
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
}

/** Estructura mínima que necesitamos de VistaDetallesEmpleadosAPI */
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

/**
 * Normaliza la respuesta del API de empleados a un array plano de EmployeeOption.
 * El endpoint puede devolver un array directo, un objeto paginado o un ApiResponse.
 */
function normalizeEmployees(raw: unknown): EmployeeOption[] {
  if (!raw) return [];

  // ApiResponse wrapper
  const data = (raw as any)?.data ?? raw;

  // PagedResult
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const isEditing = !!user;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Estado del Combobox ──────────────────────────────────────────────────
  const [comboOpen, setComboOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  // ── Formulario ───────────────────────────────────────────────────────────
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
    },
  });

  const userType = watch("userType");
  const displayName = watch("displayName");

  // ── Carga de empleados (solo en modo creación) ───────────────────────────
  const {
    data: employeesRaw,
    isLoading: isLoadingEmployees,
  } = useQuery({
    queryKey: ["employee-details-for-user-form"],
    queryFn: () => VistaDetallesEmpleadosAPI.list(),
    enabled: !isEditing,
    staleTime: 5 * 60 * 1000, // 5 min — la lista de empleados no cambia frecuentemente
  });

  /** Lista normalizada y filtrada por el texto de búsqueda del Combobox */
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

  // ── Selección de empleado ────────────────────────────────────────────────
  const handleSelectEmployee = useCallback(
    (emp: EmployeeOption) => {
      setSelectedEmployee(emp);
      setValue("email", emp.email, { shouldValidate: true });
      setValue("displayName", emp.displayName, { shouldValidate: true });
      setComboOpen(false);
    },
    [setValue]
  );

  // ── Mutation: crear usuario (Paso 1) ─────────────────────────────────────
  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserDto) => AuthUsersAPI.create(data),
    onError: (error: unknown) => {
      const msg = (error as any)?.message ?? "Error al crear el usuario";
      toast({ title: "Error al crear usuario", description: msg, variant: "destructive" });
    },
  });

  // ── Mutation: crear UserEmployee (Paso 2) ────────────────────────────────
  // const createUserEmployeeMutation = useMutation({
  //   mutationFn: (payload: { userId: string; employeeEmail: string }) =>
  //     UserEmployeesAPI.create({
  //       userId:        payload.userId,
  //       employeeEmail: payload.employeeEmail,
  //       isActive:      true,
  //       syncDate:      new Date().toISOString(),
  //       notes:         "Creado manualmente desde el panel de administración",
  //     }),
  //   onError: (error: unknown) => {
  //     const msg = (error as any)?.message ?? "Error al vincular empleado";
  //     // El usuario ya fue creado; notificamos pero no revertimos (idempotente).
  //     toast({
  //       title:       "Advertencia: usuario creado pero sin vínculo de empleado",
  //       description: msg,
  //       variant:     "destructive",
  //     });
  //   },
  // });

  // ── Mutation: actualizar usuario ─────────────────────────────────────────
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
    toast({
      title: "Error al actualizar usuario",
      description: msg,
      variant: "destructive",
    });
  },
});

  const isLoading =
    createUserMutation.isPending ||
    // createUserEmployeeMutation.isPending ||
    updateUserMutation.isPending;

  // ── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    // ── EDICIÓN ──────────────────────────────────────────────────────────
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

    // ── CREACIÓN (2 pasos) ────────────────────────────────────────────────
    // Paso 1: Crear usuario en auth.tbl_Users
    const createResponse = await createUserMutation.mutateAsync({
  email: data.email,
  displayName: data.displayName || undefined,
  userType: data.userType,
});

console.log("Respuesta de creación de usuario:", createResponse);

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

    // const newUserId = createResponse.data.id;

    // Paso 2: Registrar UserEmployee si hay un empleado seleccionado
    // if (selectedEmployee?.email) {
    //   await createUserEmployeeMutation.mutateAsync({
    //     userId:        newUserId,
    //     employeeEmail: selectedEmployee.email,
    //   });
    // }

    // Invalidar y notificar éxito
    queryClient.invalidateQueries({ queryKey: ["auth-users"] });
    toast({ title: "Usuario creado exitosamente" });
    reset();
    onSuccess?.();
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Selector de empleado (solo en creación) ── */}
      {!isEditing && (
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
                          {/* Indicador de selección */}
                          <Check
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0 text-primary",
                              selectedEmployee?.email === emp.email
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {/* Info del empleado */}
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

          {/* Aviso si no se seleccionó empleado */}
          {!selectedEmployee && (
            <p className="flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Sin empleado seleccionado no se creará el vínculo UserEmployee.
            </p>
          )}
        </div>
      )}

      {/* ── Email ── */}
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
          // En creación: se llena automáticamente desde el empleado seleccionado.
          // En edición: no se puede modificar.
          readOnly={!isEditing}
          disabled={isEditing}
          placeholder={isEditing ? undefined : "Se completa al seleccionar empleado"}
          className={cn(!isEditing && "bg-muted cursor-default")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
        {isEditing && (
          <p className="text-xs text-muted-foreground">
            El email no puede ser modificado.
          </p>
        )}
      </div>

      {/* ── Nombre para mostrar ── */}
      <div className="space-y-2">
        <Label htmlFor="displayName">
          Nombre para mostrar
          {!isEditing && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (autocompletado desde el empleado)
            </span>
          )}
        </Label>
        <Input
          id="displayName"
          {...register("displayName")}
          // En creación: solo lectura, proviene del empleado.
          // En edición: editable.
          readOnly={!isEditing}
          placeholder={
            isEditing
              ? "Juan Pérez"
              : "Se completa al seleccionar empleado"
          }
          className={cn(!isEditing && "bg-muted cursor-default")}
        />
        {!isEditing && displayName && (
          <p className="text-xs text-success flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            Nombre obtenido del empleado seleccionado.
          </p>
        )}
      </div>

      {/* ── Tipo de usuario ── */}
      <div className="space-y-2">
        <Label htmlFor="userType">
          Tipo de Usuario <span className="text-destructive">*</span>
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
        <p className="text-xs text-muted-foreground">
          {userType === "Local"
            ? "Usuario con credenciales locales (email y contraseña)."
            : "Usuario autenticado mediante Azure Active Directory."}
        </p>
      </div>

      {/* ── Estado activo (solo en edición) ── */}
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

      {/* ── Resumen del flujo (solo en creación) ── */}
      {!isEditing //&& (
        // <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 space-y-2">
        //   <p className="text-sm font-medium text-primary">Flujo de creación (2 pasos)</p>
        //   <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
        //     <li
        //       className={cn(
        //         "transition-colors",
        //         selectedEmployee ? "text-success font-medium" : ""
        //       )}
        //     >
        //       Crear usuario en <code className="font-mono">auth.tbl_Users</code>
        //     </li>
        //     <li
        //       className={cn(
        //         "transition-colors",
        //         selectedEmployee ? "text-success font-medium" : "text-muted-foreground/60"
        //       )}
        //     >
        //       Registrar vínculo en{" "}
        //       <code className="font-mono">auth.tbl_UserEmployees</code>
        //       {selectedEmployee && (
        //         <span className="ml-1">
        //           → <span className="text-foreground">{selectedEmployee.email}</span>
        //         </span>
        //       )}
        //     </li>
        //   </ol>
        // </div>
        //)
      }

      {/* ── Botones de acción ── */}
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
              {createUserMutation.isPending
                ? "Creando usuario..."
                // : createUserEmployeeMutation.isPending
                //   ? "Vinculando empleado..."
                : "Guardando..."}
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
