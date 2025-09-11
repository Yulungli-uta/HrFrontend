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
import { UserCog, Save, X } from "lucide-react";
import { PersonasAPI, DepartamentosAPI, EmpleadosAPI, type ApiResponse, TiposReferenciaAPI } from "@/lib/api";

interface EmployeeFormProps {
  employee?: Employee;
  onSuccess?: () => void;
  onCancel?: () => void;
}
interface RefType {
  typeId: number;
  name: string;
  category: string;
}

export default function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!employee;

    // Obtener tipos de referencia
    const { data: refTypes, isLoading: loadingRefTypes } = useQuery<RefType[]>({
      queryKey: ['refTypes'],
      queryFn: async () => {
        const response = await TiposReferenciaAPI.list();
        if (response.status === 'error') {
          throw new Error(response.error.message);
        }
        return response.data || [];
      },
    });

  // Usamos los servicios de API para obtener datos
  const { data: departmentsResponse } = useQuery<ApiResponse<Department[]>>({
    queryKey: ['/api/v1/rh/departments'],
    queryFn: () => DepartamentosAPI.list(),
  });

  const { data: peopleResponse } = useQuery<ApiResponse<Person[]>>({
    queryKey: ['/api/v1/rh/people'],
    queryFn: () => PersonasAPI.list(),
  });

  const { data: employeesResponse } = useQuery<ApiResponse<Employee[]>>({
    queryKey: ['/api/v1/rh/employees'],
    queryFn: () => EmpleadosAPI.list(),
  });

  // Extraemos los datos de las respuestas con comprobaciones de seguridad
  const departments = departmentsResponse?.status === 'success' ? departmentsResponse.data : [];
  const people = peopleResponse?.status === 'success' ? peopleResponse.data : [];
  const employees = employeesResponse?.status === 'success' ? employeesResponse.data : [];

  console.log('Loaded departments:', departments);
  console.log('Loaded people:', people);
  console.log('Loaded employees:', employees);
  const form = useForm<InsertEmployee>({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: employee || {
      id: 0,
      type: "Administrative_LOSEP",
      departmentId: null,
      immediateBossId: null,
      hireDate: "",
      isActive: true
    }
  });

    // Filtrar tipos de referencia por categoría y asegurar que no haya valores undefined
  // console.log('refTypes:', refTypes);
  const contractOptions = (refTypes || []).filter(type => 
    type?.category === 'CONTRACT_TYPE' && type.typeId !== undefined
  );

  const createMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const response = await EmpleadosAPI.create(data);
      if (response.status === 'error') throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/employees"] });
      toast({ title: "Empleado creado exitosamente" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear empleado", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const response = await EmpleadosAPI.update(employee!.id, data);
      if (response.status === 'error') throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/employees"] });
      toast({ title: "Empleado actualizado exitosamente" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar empleado", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: InsertEmployee) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserCog className="h-5 w-5" />
          <span>{isEditing ? "Editar Empleado" : "Agregar Nuevo Empleado"}</span>
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modifique la información del empleado" : "Complete los datos del nuevo empleado"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de Persona *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-person">
                          <SelectValue placeholder="Seleccione una persona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {people && people.map((person) => (
                          person && person.personId && (
                            <SelectItem key={person.personId} value={person.personId.toString()}>
                              {person.firstName} {person.lastName} - {person.idCard}
                            </SelectItem>
                          )
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Sangre *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "contractType-empty" ? undefined : parseInt(value))} 
                      value={field.value ? String(field.value) : "contractType-empty"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo de contrato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="contractType-empty">Sin especificar</SelectItem>
                        {contractOptions.map((option) => (
                          <SelectItem key={`blood-${option.typeId}`} value={String(option.typeId)}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />              

              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))} 
                      value={field.value === null ? "null" : field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-department">
                          <SelectValue placeholder="Seleccione un departamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Sin departamento</SelectItem>
                        {departments && departments.map((dept) => (
                          dept && dept.id && (
                            <SelectItem key={dept.departmentId} value={dept.departmentId.toString()}>
                              {dept.name}
                            </SelectItem>
                          )
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="immediateBossId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jefe Inmediato</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))} 
                      value={field.value === null ? "null" : field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-boss">
                          <SelectValue placeholder="Seleccione un jefe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Sin jefe asignado</SelectItem>
                        {employees && employees
                          .filter(emp => emp && emp.id !== employee?.id)
                          .map((emp) => {
                            if (!emp || !emp.id) return null;
                            const person = people?.find(p => p && p.id === emp.id);
                            return (
                              <SelectItem key={emp.id} value={emp.id.toString()}>
                                {person ? `${person.firstName} ${person.lastName}` : `Empleado #${emp.id}`}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Contratación *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        data-testid="input-hireDate"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Estado Activo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Indique si el empleado está activo en el sistema
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-isActive"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1"
                data-testid="button-save-employee"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Guardando..." : (isEditing ? "Actualizar" : "Crear Empleado")}
              </Button>
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className="flex-1"
                  data-testid="button-cancel"
                >
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