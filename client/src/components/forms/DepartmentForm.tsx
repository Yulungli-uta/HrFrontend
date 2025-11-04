import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertDepartmentSchema, type InsertDepartment, type Department, type Faculty } from "@shared/schema";
import { Building, Save, X, Building2 } from "lucide-react";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import { DepartamentosAPI } from "@/lib/api";
import type { BaseCrudFormProps } from "@/types/components";

interface DepartmentFormProps extends BaseCrudFormProps<Department, InsertDepartment> {}

export default function DepartmentForm({ entity: department, onSuccess, onCancel }: DepartmentFormProps) {
  const isEditing = !!department;

  const { data: faculties } = useQuery<Faculty[]>({
    queryKey: ['/api/faculties'],
  });

  const form = useForm<InsertDepartment>({
    resolver: zodResolver(insertDepartmentSchema),
    defaultValues: department || {
      name: "",
      facultyId: null,
      isActive: true
    }
  });

  // Usar el hook useCrudMutation para eliminar código duplicado
  const { create, update, isLoading } = useCrudMutation({
    queryKey: ['/api/departments'],
    createFn: DepartamentosAPI.create,
    updateFn: DepartamentosAPI.update,
    onSuccess,
    createSuccessMessage: 'Departamento creado exitosamente',
    updateSuccessMessage: 'Departamento actualizado exitosamente',
    createErrorMessage: 'Error al crear departamento',
    updateErrorMessage: 'Error al actualizar departamento'
  });

  const onSubmit = (data: InsertDepartment) => {
    if (isEditing) {
      update.mutate({ id: department.id, data });
    } else {
      create.mutate(data);
    }
  };

  const commonDepartments = [
    "Departamento de Ingeniería Civil",
    "Departamento de Ingeniería Mecánica",
    "Departamento de Psicología",
    "Departamento de Educación Básica",
    "Departamento de Ciencias Exactas",
    "Departamento de Ciencias Humanas",
    "Departamento de Administración",
    "Departamento de Contabilidad",
    "Departamento de Marketing",
    "Departamento de Sistemas",
    "Departamento de Investigación",
    "Departamento de Vinculación"
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building className="h-5 w-5" />
          <span>{isEditing ? "Editar Departamento" : "Crear Nuevo Departamento"}</span>
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modifique la información del departamento" : "Complete los datos del nuevo departamento"}
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
                  <FormLabel>Nombre del Departamento *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ingrese el nombre del departamento"
                      data-testid="input-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  
                  {/* Sugerencias de nombres comunes */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Sugerencias:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {commonDepartments.slice(0, 6).map((name) => (
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
              name="facultyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facultad *</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-faculty">
                        <SelectValue placeholder="Seleccione una facultad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {faculties?.map((faculty) => (
                        <SelectItem key={faculty.id} value={faculty.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4" />
                            <span>{faculty.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {faculties && faculties.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No hay facultades disponibles. Cree una facultad primero.
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
                      Indique si el departamento está activo y operativo
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

            {form.watch("facultyId") && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-green-700">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">Facultad seleccionada</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {faculties?.find(f => f.id === form.watch("facultyId"))?.name}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1"
                data-testid="button-save-department"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Guardando..." : (isEditing ? "Actualizar" : "Crear Departamento")}
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
