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
import { insertDepartmentSchema, type InsertDepartment, type Department, type Faculty } from "@shared/schema";
import { Building, Save, X, Building2 } from "lucide-react";

interface DepartmentFormProps {
  department?: Department;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DepartmentForm({ department, onSuccess, onCancel }: DepartmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const createMutation = useMutation({
    mutationFn: async (data: InsertDepartment) => {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Error al crear departamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Departamento creado exitosamente" });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error al crear departamento", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertDepartment) => {
      const response = await fetch(`/api/departments/${department!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Error al actualizar departamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Departamento actualizado exitosamente" });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error al actualizar departamento", variant: "destructive" });
    }
  });

  const onSubmit = (data: InsertDepartment) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

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