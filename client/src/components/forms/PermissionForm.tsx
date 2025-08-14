import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertPermissionSchema, type InsertPermission, type Employee, type Person, type PermissionType } from "@shared/schema";
import { CalendarCheck, Save, X, Clock } from "lucide-react";

interface PermissionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PermissionForm({ onSuccess, onCancel }: PermissionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const { data: people } = useQuery<Person[]>({
    queryKey: ['/api/people'],
  });

  const { data: permissionTypes } = useQuery<PermissionType[]>({
    queryKey: ['/api/permission-types'],
  });

  const form = useForm<InsertPermission>({
    resolver: zodResolver(insertPermissionSchema),
    defaultValues: {
      employeeId: 0,
      permissionTypeId: 0,
      startDate: "",
      endDate: "",
      chargedToVacation: false,
      approvedBy: null,
      justification: "",
      status: "Pending",
      vacationId: null
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPermission) => {
      const response = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Error al crear solicitud de permiso");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      toast({ title: "Solicitud de permiso creada exitosamente" });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error al crear solicitud de permiso", variant: "destructive" });
    }
  });

  const onSubmit = (data: InsertPermission) => {
    createMutation.mutate(data);
  };

  const isLoading = createMutation.isPending;

  const calculateDays = () => {
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarCheck className="h-5 w-5" />
          <span>Solicitar Permiso</span>
        </CardTitle>
        <CardDescription>
          Complete el formulario para solicitar un permiso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empleado *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-employee">
                          <SelectValue placeholder="Seleccione un empleado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map((employee) => {
                          const person = people?.find(p => p.id === employee.id);
                          return (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                              {person ? `${person.firstName} ${person.lastName}` : `Empleado #${employee.id}`}
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
                name="permissionTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Permiso *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-permission-type">
                          <SelectValue placeholder="Seleccione el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {permissionTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} {type.maxDays && `(máx. ${type.maxDays} días)`}
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        data-testid="input-startDate"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Fin *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        data-testid="input-endDate"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {calculateDays() > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Duración del permiso</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  {calculateDays()} día(s) solicitado(s)
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justificación *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Explique el motivo del permiso..."
                      data-testid="input-justification"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chargedToVacation"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Cargar a Vacaciones</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Marque si este permiso debe descontarse de las vacaciones
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-chargedToVacation"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Seleccione el estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Pending">Pendiente</SelectItem>
                      <SelectItem value="Approved">Aprobado</SelectItem>
                      <SelectItem value="Rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1"
                data-testid="button-save-permission"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Enviando..." : "Enviar Solicitud"}
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