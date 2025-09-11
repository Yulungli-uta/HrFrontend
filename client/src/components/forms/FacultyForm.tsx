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
import { insertFacultySchema, type InsertFaculty, type Faculty, type Employee, type Person } from "@shared/schema";
import { Building2, Save, X, User } from "lucide-react";
import { api, type ApiResponse } from "@/lib/api";

interface FacultyFormProps {
  faculty?: Faculty;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FacultyForm({ faculty, onSuccess, onCancel }: FacultyFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!faculty;

  // Usamos el tipo ApiResponse<Employee[]> y una queryFn personalizada
  const { data: employeesResponse } = useQuery<ApiResponse<Employee[]>>({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const response = await api.get<Employee[]>('/api/employees');
      return response;
    }
  });

  // Usamos el tipo ApiResponse<Person[]> y una queryFn personalizada
  const { data: peopleResponse } = useQuery<ApiResponse<Person[]>>({
    queryKey: ['/api/people'],
    queryFn: async () => {
      const response = await api.get<Person[]>('/api/people');
      return response;
    }
  });

  // Extraemos los datos del formato de respuesta de la API
  const employees = employeesResponse?.status === 'success' ? employeesResponse.data : [];
  const people = peopleResponse?.status === 'success' ? peopleResponse.data : [];

  const form = useForm<InsertFaculty>({
    resolver: zodResolver(insertFacultySchema),
    defaultValues: faculty || {
      name: "",
      deanEmployeeId: null,
      isActive: true
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertFaculty) => {
      const response = await api.post<Faculty>('/api/faculties', data);
      if (response.status === 'error') throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faculties"] });
      toast({ title: "Facultad creada exitosamente" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear facultad", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertFaculty) => {
      const response = await api.put<Faculty>(`/api/faculties/${faculty?.id}`, data);
      if (response.status === 'error') throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faculties"] });
      toast({ title: "Facultad actualizada exitosamente" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar facultad", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: InsertFaculty) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const utaFaculties = [
    "Facultad de Ingeniería Civil y Mecánica",
    "Facultad de Ciencias Humanas y de la Educación", 
    "Facultad de Contabilidad y Auditoría",
    "Facultad de Ciencias de la Salud",
    "Facultad de Ciencias Administrativas",
    "Facultad de Jurisprudencia y Ciencias Sociales",
    "Facultad de Ingeniería en Sistemas, Electrónica e Industrial",
    "Facultad de Ciencias Agropecuarias",
    "Facultad de Diseño y Arquitectura"
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>{isEditing ? "Editar Facultad" : "Crear Nueva Facultad"}</span>
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modifique la información de la facultad" : "Complete los datos de la nueva facultad"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Facultad *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ingrese el nombre de la facultad"
                      data-testid="input-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  
                  {/* Sugerencias de facultades UTA */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Facultades UTA:</p>
                    <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                      {utaFaculties.map((name) => (
                        <Button
                          key={name}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto p-2 justify-start"
                          onClick={() => form.setValue("name", name)}
                          data-testid={`suggestion-${name.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          {name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deanEmployeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decano</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))} 
                    value={field.value === null ? "null" : field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-dean">
                        <SelectValue placeholder="Seleccione un decano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">Sin decano asignado</SelectItem>
                      {employees?.map((employee) => {
                        const person = people?.find(p => p.id === employee.id);
                        return (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>
                                {person ? `${person.firstName} ${person.lastName}` : `Empleado #${employee.id}`}
                                <span className="text-xs text-gray-500 ml-2">({employee.type})</span>
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  <p className="text-xs text-gray-500">
                    El decano puede asignarse posteriormente si no hay empleados disponibles
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Estado Activo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Indique si la facultad está activa y operativa
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

            {form.watch("deanEmployeeId") && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-green-700">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Decano seleccionado</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {(() => {
                    const employee = employees?.find(e => e.id === form.watch("deanEmployeeId"));
                    const person = people?.find(p => p.id === employee?.id);
                    return person ? `${person.firstName} ${person.lastName}` : `Empleado #${form.watch("deanEmployeeId")}`;
                  })()}
                </p>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-700">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">Información importante</span>
              </div>
              <div className="text-sm text-blue-600 mt-1 space-y-1">
                <p>• Una facultad puede tener múltiples departamentos</p>
                <p>• El decano es responsable de la gestión académica</p>
                <p>• Las facultades inactivas no aparecerán en los reportes</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1"
                data-testid="button-save-faculty"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Guardando..." : (isEditing ? "Actualizar" : "Crear Facultad")}
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