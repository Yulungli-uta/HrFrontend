import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertScheduleSchema, type InsertSchedule, type Schedule } from "@shared/schema";
import { Clock, Save, X, Calendar } from "lucide-react";

interface ScheduleFormProps {
  schedule?: Schedule;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ScheduleForm({ schedule, onSuccess, onCancel }: ScheduleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!schedule;

  const form = useForm<InsertSchedule>({
    resolver: zodResolver(insertScheduleSchema),
    defaultValues: schedule || {
      description: "",
      entryTime: "08:00",
      exitTime: "17:00",
      workingDays: "Lunes a Viernes",
      requiredHoursPerDay: "8.0",
      hasLunchBreak: true,
      lunchStart: "12:00",
      lunchEnd: "13:00",
      isRotating: false,
      rotationPattern: null
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSchedule) => {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Error al crear horario");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Horario creado exitosamente" });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error al crear horario", variant: "destructive" });
    }
  });

  const onSubmit = (data: InsertSchedule) => {
    createMutation.mutate(data);
  };

  const isLoading = createMutation.isPending;

  const workingDaysOptions = [
    "Lunes a Viernes",
    "Lunes a Sábado", 
    "Días Específicos",
    "Rotativo",
    "Fines de Semana"
  ];

  const scheduleTemplates = [
    {
      name: "Horario Administrativo",
      entry: "08:00",
      exit: "17:00",
      hours: "8.0",
      lunch: true
    },
    {
      name: "Horario Docente Matutino",
      entry: "07:00",
      exit: "13:00", 
      hours: "6.0",
      lunch: false
    },
    {
      name: "Horario Docente Vespertino",
      entry: "14:00",
      exit: "20:00",
      hours: "6.0", 
      lunch: false
    },
    {
      name: "Horario Nocturno",
      entry: "18:00",
      exit: "22:00",
      hours: "4.0",
      lunch: false
    }
  ];

  const applyTemplate = (template: typeof scheduleTemplates[0]) => {
    form.setValue("entryTime", template.entry);
    form.setValue("exitTime", template.exit);
    form.setValue("requiredHoursPerDay", template.hours);
    form.setValue("hasLunchBreak", template.lunch);
    if (!template.lunch) {
      form.setValue("lunchStart", null);
      form.setValue("lunchEnd", null);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>{isEditing ? "Editar Horario" : "Crear Nuevo Horario"}</span>
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modifique el horario de trabajo" : "Configure un nuevo horario de trabajo"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Plantillas de Horario */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3">Plantillas de Horario</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {scheduleTemplates.map((template) => (
              <Button
                key={template.name}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto p-2 text-xs"
                onClick={() => applyTemplate(template)}
                data-testid={`template-${template.name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div className="text-center">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-gray-500">{template.entry} - {template.exit}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del Horario *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: Horario Administrativo Regular"
                      data-testid="input-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="entryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Entrada *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        data-testid="input-entryTime"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exitTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Salida *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        data-testid="input-exitTime"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredHoursPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas Requeridas/Día *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.5"
                        min="1"
                        max="12"
                        placeholder="8.0"
                        data-testid="input-requiredHours"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workingDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de Trabajo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-workingDays">
                          <SelectValue placeholder="Seleccione los días" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {workingDaysOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hasLunchBreak"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Incluye Almuerzo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Indique si el horario incluye tiempo de almuerzo
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-hasLunchBreak"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("hasLunchBreak") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lunchStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inicio de Almuerzo</FormLabel>
                      <FormControl>
                        <Input 
                          type="time"
                          data-testid="input-lunchStart"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lunchEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin de Almuerzo</FormLabel>
                      <FormControl>
                        <Input 
                          type="time"
                          data-testid="input-lunchEnd"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="isRotating"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Horario Rotativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Marque si es un horario con rotación de turnos
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-isRotating"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isRotating") && (
              <FormField
                control={form.control}
                name="rotationPattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patrón de Rotación</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describa el patrón de rotación (ej: Semana 1: Mañana, Semana 2: Tarde, etc.)"
                        data-testid="input-rotationPattern"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Vista previa del horario */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-700 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Vista Previa del Horario</span>
              </div>
              <div className="text-sm text-blue-600 space-y-1">
                <p>Entrada: {form.watch("entryTime")} | Salida: {form.watch("exitTime")}</p>
                <p>Horas diarias: {form.watch("requiredHoursPerDay")}</p>
                <p>Días: {form.watch("workingDays")}</p>
                {form.watch("hasLunchBreak") && form.watch("lunchStart") && form.watch("lunchEnd") && (
                  <p>Almuerzo: {form.watch("lunchStart")} - {form.watch("lunchEnd")}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1"
                data-testid="button-save-schedule"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Guardando..." : (isEditing ? "Actualizar" : "Crear Horario")}
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