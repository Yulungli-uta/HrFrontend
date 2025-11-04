import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertFacultySchema, type InsertFaculty, type Faculty, type Employee, type Person } from "@shared/schema";
import { Building2, Save, X, User } from "lucide-react";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import { FacultadesAPI, EmpleadosAPI, PersonasAPI } from "@/lib/api";
import type { BaseCrudFormProps } from "@/types/components";

interface FacultyFormProps extends BaseCrudFormProps<Faculty, InsertFaculty> {}

export default function FacultyForm({ entity: faculty, onSuccess, onCancel }: FacultyFormProps) {
  const isEditing = !!faculty;

  // Cargar empleados
  const { data: employeesResponse } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: () => EmpleadosAPI.list()
  });

  // Cargar personas
  const { data: peopleResponse } = useQuery({
    queryKey: ['/api/people'],
    queryFn: () => PersonasAPI.list()
  });

  // Extraer datos de las respuestas
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

  // Usar el hook useCrudMutation
  const { create, update, isLoading } = useCrudMutation({
    queryKey: ['/api/faculties'],
    createFn: FacultadesAPI.create,
    updateFn: FacultadesAPI.update,
    onSuccess,
    createSuccessMessage: 'Facultad creada exitosamente',
    updateSuccessMessage: 'Facultad actualizada exitosamente',
    createErrorMessage: 'Error al crear facultad',
    updateErrorMessage: 'Error al actualizar facultad'
  });

  const onSubmit = (data: InsertFaculty) => {
    if (isEditing) {
      update.mutate({ id: faculty.id, data });
    } else {
      create.mutate(data);
    }
  };

  const utaFaculties = [
    "Facultad de Ingeniería Civil y Mecánica",
    "Facultad de Ciencias de la Salud",
    "Facultad de Ciencias Humanas y de la Educación",
    "Facultad de Ciencias Administrativas",
    "Facultad de Contabilidad y Auditoría",
    "Facultad de Diseño y Arquitectura",
    "Facultad de Jurisprudencia y Ciencias Sociales"
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
                  
                  {/* Sugerencias de nombres comunes */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Sugerencias de la UTA:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {utaFaculties.slice(0, 4).map((name) => (
                        <Button
                          key={name}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto p-1 justify-start"
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
                  <FormLabel>Decano (Opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-dean">
                        <SelectValue placeholder="Seleccione un decano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((employee) => {
                        const person = people.find(p => p.id === employee.id);
                        return (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>
                                {person ? `${person.firstName} ${person.lastName}` : `Empleado ${employee.id}`}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {employees.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No hay empleados disponibles. Cree un empleado primero.
                    </p>
                  )}
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
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-700">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Decano seleccionado</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  {(() => {
                    const employee = employees.find(e => e.id === form.watch("deanEmployeeId"));
                    const person = people.find(p => p.id === employee?.id);
                    return person ? `${person.firstName} ${person.lastName}` : 'Empleado seleccionado';
                  })()}
                </p>
              </div>
            )}

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
