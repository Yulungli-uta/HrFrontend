// src/components/forms/EmployeeForm.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertEmployeeSchema, type InsertEmployee, type Employee, type Department, type Person } from "@shared/schema";
import { UserCog, Save, X, Mail } from "lucide-react";
import { PersonasAPI, DepartamentosAPI, EmpleadosAPI, TiposReferenciaAPI, type ApiResponse } from "@/lib/api";

// Semilla proveniente de la vista para hidratar edición
type EmployeeViewSeed = {
  employeeID: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  idCard?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  sex?: string;
  address?: string;
  hireDate?: string;
  employeeIsActive?: boolean;
  employeeType?: number | null;
  employeeTypeName?: string | null;
  department?: string | null;
  faculty?: string | null;
  immediateBoss?: string | null;
  yearsOfService?: number;
  maritalStatus?: string | null;
  ethnicity?: string | null;
  bloodType?: string | null;
  disabilityPercentage?: number | null;
  conadisCard?: string | null;
  countryName?: string | null;
  provinceName?: string | null;
  cantonName?: string | null;
};

interface RefType {
  typeId: number;
  name: string;
  category: string;
}

interface EmployeeFormProps {
  employee?: Employee;            // opcional si ya tienes el modelo completo
  viewSeed?: EmployeeViewSeed;    // semilla desde EmployeesPage (vista)
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

export default function EmployeeForm({ employee, viewSeed, onSuccess, onCancel }: EmployeeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tipos de referencia (para contrato)
  const { data: refTypes, isLoading: loadingRefTypes } = useQuery<ApiResponse<RefType[]>>({
    queryKey: ["refTypes"],
    queryFn: TiposReferenciaAPI.list,
  });

  // Departamentos
  const { data: departmentsResponse, isLoading: loadingDepartments } = useQuery<ApiResponse<Department[]>>({
    queryKey: ["/api/v1/rh/departments"],
    queryFn: DepartamentosAPI.list,
  });

  // Personas (titulares)
  const { data: peopleResponse, isLoading: loadingPeople } = useQuery<ApiResponse<Person[]>>({
    queryKey: ["/api/v1/rh/people"],
    queryFn: PersonasAPI.list,
  });

  // Empleados (para jefe inmediato y encontrar empId)
  const { data: employeesResponse, isLoading: loadingEmployees } = useQuery<ApiResponse<Employee[]>>({
    queryKey: ["/api/v1/rh/employees"],
    queryFn: EmpleadosAPI.list,
  });

  const departments = (departmentsResponse?.status === "success" ? departmentsResponse.data : []) ?? [];
  const people = (peopleResponse?.status === "success" ? peopleResponse.data : []) ?? [];
  const employees = (employeesResponse?.status === "success" ? employeesResponse.data : []) ?? [];

  const contractOptions = useMemo(() => {
    const arr = refTypes?.status === "success" ? (refTypes.data ?? []) : [];
    return arr.filter((t) => t?.category === "CONTRACT_TYPE" && typeof t.typeId === "number");
  }, [refTypes]);

  // Si viene un modelo completo de empleado (edición directa)
  const isEditingFromEmployee = !!employee?.id;

  // Estado interno para update cuando viene desde viewSeed
  const [employeeIdForUpdate, setEmployeeIdForUpdate] = useState<number | null>(employee?.id ?? null);

  const form = useForm<InsertEmployee>({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: employee || {
      id: 0, // personId
      contractTypeId: undefined,
      departmentId: null,
      immediateBossId: null,
      hireDate: "",
      isActive: true,
      type: "Administrative_LOSEP",
      email: "", // Campo email agregado
    },
    mode: "onChange",
  });

  // VALIDACIÓN fecha no futura
  const validateDate = (value: string) => {
    if (!value) return "La fecha de contratación es obligatoria";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const input = new Date(value); input.setHours(0, 0, 0, 0);
    if (input > today) return "La fecha de contratación no puede ser futura";
    return true;
  };

  // VALIDACIÓN email
  const validateEmail = (value: string) => {
    if (!value) return "El email es obligatorio";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Formato de email inválido";
    return true;
  };

  // Helpers de mapeo para viewSeed - MEJORADA
  const findPersonIdFromSeed = (seed?: EmployeeViewSeed): number | null => {
    if (!seed) return null;
    
    // Buscar por employeeID primero (más directo)
    if (seed.employeeID) {
      const byEmployeeId = (employees as any[]).find(
        (e) => e?.id === seed.employeeID
      );
      if (byEmployeeId?.personId || byEmployeeId?.id) {
        return byEmployeeId.personId ?? byEmployeeId.id ?? null;
      }
    }

    // Buscar por email
    if (seed.email) {
      const byEmail = (people as any[]).find(
        (p) => p?.email?.toLowerCase() === seed.email!.toLowerCase()
      );
      if (byEmail?.personId || byEmail?.id) return byEmail.personId ?? byEmail.id ?? null;
    }

    // Buscar por cédula
    if (seed.idCard) {
      const byIdCard = (people as any[]).find(
        (p) => p?.idCard === seed.idCard
      );
      if (byIdCard?.personId || byIdCard?.id) return byIdCard.personId ?? byIdCard.id ?? null;
    }

    return null;
  };

  const findDepartmentIdFromName = (name?: string | null): number | null => {
    if (!name) return null;
    const d = (departments as any[]).find((x) => String(x?.name ?? "").toLowerCase() === name.toLowerCase());
    if (!d) return null;
    return d.departmentId ?? d.id ?? null;
  };

  const findContractTypeIdFromEmployeeType = (employeeType?: number | null) => {
    if (employeeType == null) return undefined;
    const rt = contractOptions.find((r) => Number(r.typeId) === Number(employeeType));
    return rt?.typeId ?? undefined;
  };

  // Hidratación desde viewSeed cuando catálogos están listos - MEJORADA
  const hydratedRef = useRef(false);
  useEffect(() => {
    // Resetear el estado de hidratación cuando viewSeed cambie
    hydratedRef.current = false;
    
    if (!viewSeed) {
      // Modo creación - resetear form
      form.reset({
        id: 0,
        contractTypeId: undefined,
        departmentId: null,
        immediateBossId: null,
        hireDate: "",
        isActive: true,
        type: "Administrative_LOSEP",
        email: "", // Reset email también
      });
      setEmployeeIdForUpdate(null);
      return;
    }

    // Esperar a que los catálogos estén cargados
    if (loadingPeople || loadingEmployees || loadingRefTypes || loadingDepartments) {
      return;
    }

    const personId = findPersonIdFromSeed(viewSeed);
    const empRecord = (employees as any[]).find(
      (e) => e?.id === viewSeed.employeeID || e?.personId === personId
    );

    const departmentId = findDepartmentIdFromName(viewSeed.department ?? null);
    const contractTypeId = findContractTypeIdFromEmployeeType(viewSeed.employeeType ?? null);

    if (DEBUG) {
      console.group("🔁 Hydrate EmployeeForm from viewSeed");
      console.log("viewSeed:", viewSeed);
      console.log("matched personId:", personId);
      console.log("matched employee record:", empRecord);
      console.log("departmentId:", departmentId);
      console.log("contractTypeId:", contractTypeId);
      console.log("email from seed:", viewSeed.email);
      console.groupEnd();
    }

    // Actualizar estado para edición
    if (empRecord?.id) {
      setEmployeeIdForUpdate(empRecord.id);
    } else if (viewSeed.employeeID) {
      setEmployeeIdForUpdate(viewSeed.employeeID);
    }

    // Resetear formulario con los datos
    form.reset({
      id: personId ?? 0,
      contractTypeId,
      departmentId: departmentId ?? null,
      immediateBossId: empRecord?.immediateBossId ?? null,
      hireDate: viewSeed.hireDate ?? "",
      isActive: viewSeed.employeeIsActive ?? true,
      type: (empRecord?.type ?? "Administrative_LOSEP") as any,
      email: viewSeed.email ?? "", // Incluir el email
    });

    hydratedRef.current = true;
  }, [viewSeed, people, employees, contractOptions, departments, form, loadingPeople, loadingEmployees, loadingRefTypes, loadingDepartments]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const res = await EmpleadosAPI.create(data);
      if (res.status === "error") throw new Error(res.error?.message ?? "Error desconocido");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/vw/EmployeeComplete"] });
      toast({ title: "Empleado creado exitosamente" });
      onSuccess?.();
    },
    onError: (e: any) => {
      toast({ title: "Error al crear empleado", description: String(e?.message ?? e), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const empId = employeeIdForUpdate ?? employee?.id;
      if (!empId) throw new Error("ID de empleado no disponible para edición.");
      const res = await EmpleadosAPI.update(empId, data);
      if (res.status === "error") throw new Error(res.error?.message ?? "Error desconocido");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/vw/EmployeeComplete"] });
      toast({ title: "Empleado actualizado exitosamente" });
      onSuccess?.();
    },
    onError: (e: any) => {
      toast({ title: "Error al actualizar empleado", description: String(e?.message ?? e), variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertEmployee) => {
    if (DEBUG) console.log("Submit Employee:", { data, employeeIdForUpdate, viewSeed, employee });

    // validaciones básicas
    if (!data.id || data.id <= 0) {
      toast({ title: "Seleccione la Persona titular", variant: "destructive" });
      return;
    }
    
    const dateCheck = validateDate(data.hireDate);
    if (dateCheck !== true) {
      toast({ title: String(dateCheck), variant: "destructive" });
      return;
    }

    const emailCheck = validateEmail(data.email);
    if (emailCheck !== true) {
      toast({ title: String(emailCheck), variant: "destructive" });
      return;
    }

    if (employeeIdForUpdate || isEditingFromEmployee) {
      updateMutation.mutate(data, {
        onSuccess: () => setEmployeeIdForUpdate(null),
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const disabling = loadingRefTypes || loadingDepartments || loadingPeople || loadingEmployees || isSaving;
  const lockPersonSelect = !!(employeeIdForUpdate || isEditingFromEmployee);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          <span>{(employeeIdForUpdate || isEditingFromEmployee) ? "Editar Empleado" : "Agregar Nuevo Empleado"}</span>
        </CardTitle>
        <CardDescription>
          {(employeeIdForUpdate || isEditingFromEmployee)
            ? "Modifique la información del empleado"
            : "Complete los datos del nuevo empleado"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Persona titular */}
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de Persona *</FormLabel>
                    <Select
                      disabled={disabling || lockPersonSelect}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-person">
                          <SelectValue placeholder={loadingPeople ? "Cargando personas..." : "Seleccione una persona"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {people.map((p: any) => {
                          const pid = p?.personId ?? p?.id;
                          if (!pid) return null;
                          return (
                            <SelectItem key={pid} value={String(pid)}>
                              {p.firstName} {p.lastName} — {p.idCard}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          className="pl-10"
                          disabled={disabling}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de contrato */}
              <FormField
                control={form.control}
                name="contractTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de contrato *</FormLabel>
                    <Select
                      disabled={disabling}
                      onValueChange={(value) => field.onChange(value === "empty" ? undefined : parseInt(value))}
                      value={field.value ? String(field.value) : "empty"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingRefTypes ? "Cargando tipos..." : "Seleccione tipo de contrato"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="empty">Sin especificar</SelectItem>
                        {contractOptions.map((opt) => (
                          <SelectItem key={`contr-${opt.typeId}`} value={String(opt.typeId)}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Departamento */}
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <Select
                      disabled={disabling}
                      onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                      value={field.value === null ? "null" : field.value ? String(field.value) : "null"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-department">
                          <SelectValue placeholder={loadingDepartments ? "Cargando departamentos..." : "Seleccione un departamento"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Sin departamento</SelectItem>
                        {departments.map((d: any) => {
                          const did = d?.departmentId ?? d?.id;
                          if (!did) return null;
                          return (
                            <SelectItem key={did} value={String(did)}>
                              {d?.name ?? `Departamento #${did}`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Jefe inmediato */}
              <FormField
                control={form.control}
                name="immediateBossId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jefe Inmediato</FormLabel>
                    <Select
                      disabled={disabling}
                      onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                      value={field.value === null ? "null" : field.value ? String(field.value) : "null"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-boss">
                          <SelectValue placeholder={loadingEmployees ? "Cargando empleados..." : "Seleccione un jefe"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Sin jefe asignado</SelectItem>
                        {employees
                          .filter((e: any) => e && e.id && (!employee?.id || e.id !== employee.id))
                          .map((e: any) => {
                            const pid = e?.id;
                            if (!pid) return null;
                            // Busca nombre humano si tienes la persona enlazada
                            const person = (people as any[]).find((p) => p?.id === e?.id || p?.personId === e?.personId);
                            const name = person ? `${person.firstName} ${person.lastName}` : `Empleado #${pid}`;
                            return (
                              <SelectItem key={pid} value={String(pid)}>
                                {name}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fecha de contratación */}
              <FormField
                control={form.control}
                name="hireDate"
                rules={{ validate: validateDate }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Contratación *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        data-testid="input-hireDate"
                        max={new Date().toISOString().slice(0, 10)}
                        disabled={disabling}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estado activo */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Estado Activo</FormLabel>
                    <div className="text-sm text-muted-foreground">Indique si el empleado está activo en el sistema</div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-isActive" disabled={disabling} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button type="submit" disabled={isSaving} className="flex-1" data-testid="button-save-employee">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Guardando..." : (employeeIdForUpdate || isEditingFromEmployee) ? "Actualizar" : "Crear Empleado"}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1" data-testid="button-cancel">
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}