import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { HorariosAPI } from "@/lib/api";
import { parseApiError } from "@/lib/error-handling";
import {
  insertScheduleSchema,
  type InsertSchedule,
  type FrontendSchedule,
} from "@/shared/schema";
import { Calendar, Clock, Save, Smartphone, X, Zap } from "lucide-react";
import { z } from "zod";
interface ScheduleFormProps {
  schedule?: FrontendSchedule;
  onSuccess?: () => void;
  onCancel?: () => void;
}
type ScheduleFormValues = z.input<typeof insertScheduleSchema>;
const normalizeTime = (time: string | null | undefined): string | null => {
  if (!time) return null;
  if (time.length === 8 && time.split(":").length === 3) {
    return time.substring(0, 5);
  }
  return time;
};

const timeToMinutes = (time?: string | null): number | null => {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const calculateRequiredHours = (
  entryTime?: string | null,
  exitTime?: string | null,
  hasLunchBreak?: boolean,
  lunchStart?: string | null,
  lunchEnd?: string | null
): string => {
  const entryMinutes = timeToMinutes(entryTime);
  const exitMinutes = timeToMinutes(exitTime);

  if (entryMinutes === null || exitMinutes === null || exitMinutes <= entryMinutes) {
    return "0.0";
  }

  let totalWorkedMinutes = exitMinutes - entryMinutes;

  if (hasLunchBreak) {
    const lunchStartMinutes = timeToMinutes(lunchStart);
    const lunchEndMinutes = timeToMinutes(lunchEnd);

    if (
      lunchStartMinutes !== null &&
      lunchEndMinutes !== null &&
      lunchEndMinutes > lunchStartMinutes
    ) {
      totalWorkedMinutes -= lunchEndMinutes - lunchStartMinutes;
    }
  }

  if (totalWorkedMinutes < 0) totalWorkedMinutes = 0;

  return (totalWorkedMinutes / 60).toFixed(2);
};

export default function ScheduleForm({
  schedule,
  onSuccess,
  onCancel,
}: ScheduleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isEditing = !!schedule;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(insertScheduleSchema),
    defaultValues: {
      description: "",
      entryTime: "08:00",
      exitTime: "17:00",
      workingDays: "Lunes a Viernes",
      requiredHoursPerDay: "8.00",
      hasLunchBreak: false,
      lunchStart: null,
      lunchEnd: null,
      isRotating: false,
      rotationPattern: null,
      isActive: true,
    },
  });

  useEffect(() => {
    if (schedule) {
      const scheduleId = schedule.id ?? schedule.scheduleId ?? null;
      setEditingId(scheduleId);

      const entryTime = normalizeTime(schedule.entryTime) || "08:00";
      const exitTime = normalizeTime(schedule.exitTime) || "17:00";
      const hasLunchBreak = schedule.hasLunchBreak ?? false;
      const lunchStart = normalizeTime(schedule.lunchStart);
      const lunchEnd = normalizeTime(schedule.lunchEnd);

      form.reset({
        description: schedule.description || "",
        entryTime,
        exitTime,
        workingDays: schedule.workingDays || "Lunes a Viernes",
        requiredHoursPerDay: calculateRequiredHours(
          entryTime,
          exitTime,
          hasLunchBreak,
          lunchStart,
          lunchEnd
        ),
        hasLunchBreak,
        lunchStart,
        lunchEnd,
        isRotating: schedule.isRotating ?? false,
        rotationPattern: schedule.rotationPattern || null,
        isActive: schedule.isActive ?? true,
      });
    } else {
      setEditingId(null);
      form.reset({
        description: "",
        entryTime: "08:00",
        exitTime: "17:00",
        workingDays: "Lunes a Viernes",
        requiredHoursPerDay: "9.00",
        hasLunchBreak: false,
        lunchStart: null,
        lunchEnd: null,
        isRotating: false,
        rotationPattern: null,
        isActive: true,
      });
    }

    setIsInitialized(true);
  }, [schedule, form]);

  const entryTime = form.watch("entryTime");
  const exitTime = form.watch("exitTime");
  const hasLunchBreak = form.watch("hasLunchBreak");
  const lunchStart = form.watch("lunchStart");
  const lunchEnd = form.watch("lunchEnd");

  const computedHours = useMemo(() => {
    return calculateRequiredHours(
      entryTime,
      exitTime,
      hasLunchBreak,
      lunchStart,
      lunchEnd
    );
  }, [entryTime, exitTime, hasLunchBreak, lunchStart, lunchEnd]);

  useEffect(() => {
    form.setValue("requiredHoursPerDay", computedHours, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [computedHours, form]);

  const ensureLunchCoherence = (hasLunch: boolean) => {
    if (!hasLunch) {
      form.setValue("lunchStart", null);
      form.setValue("lunchEnd", null);
    } else {
      if (!form.getValues("lunchStart")) form.setValue("lunchStart", "13:00");
      if (!form.getValues("lunchEnd")) form.setValue("lunchEnd", "14:00");
    }
  };

  const invalidateSchedulesList = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/schedules"] });
    await queryClient.invalidateQueries({ queryKey: ["schedules"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: ScheduleFormValues) => {
      const payload = {
        description: data.description,
        entryTime: normalizeTime(data.entryTime)!,
        exitTime: normalizeTime(data.exitTime)!,
        workingDays: data.workingDays,
        requiredHoursPerDay: parseFloat(
          calculateRequiredHours(
            data.entryTime,
            data.exitTime,
            data.hasLunchBreak,
            data.lunchStart,
            data.lunchEnd
          )
        ),
        hasLunchBreak: data.hasLunchBreak,
        lunchStart: data.hasLunchBreak ? normalizeTime(data.lunchStart) : null,
        lunchEnd: data.hasLunchBreak ? normalizeTime(data.lunchEnd) : null,
        isRotating: data.isRotating,
        rotationPattern: data.isRotating ? data.rotationPattern : null,
        isActive: data.isActive,
      };

      const res = await HorariosAPI.create(payload);
      if (res.status === "error") {
        throw new Error(res.error.message || "Error al crear horario");
      }
      return res.data;
    },
    onSuccess: async () => {
      await invalidateSchedulesList();
      toast({
        title: "Horario creado exitosamente",
        description: "El horario ha sido registrado en el sistema",
      });
      onSuccess?.();
    },
    onError: (e: unknown) => {
      toast({
        title: "Error al crear horario",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertSchedule) => {
      if (!editingId) {
        throw new Error("ID de horario no proporcionado");
      }

      const currentResponse = await HorariosAPI.get(editingId);
      if (currentResponse.status === "error") {
        throw new Error("El horario no existe o fue eliminado");
      }

      const currentSchedule = currentResponse.data as any;

      const payload: any = {
        scheduleId: editingId,
        description: data.description,
        entryTime: normalizeTime(data.entryTime)!,
        exitTime: normalizeTime(data.exitTime)!,
        workingDays: data.workingDays,
        requiredHoursPerDay: parseFloat(
          calculateRequiredHours(
            data.entryTime,
            data.exitTime,
            data.hasLunchBreak,
            data.lunchStart,
            data.lunchEnd
          )
        ),
        hasLunchBreak: data.hasLunchBreak,
        lunchStart: data.hasLunchBreak ? normalizeTime(data.lunchStart) : null,
        lunchEnd: data.hasLunchBreak ? normalizeTime(data.lunchEnd) : null,
        isRotating: data.isRotating,
        rotationPattern: data.isRotating ? data.rotationPattern : null,
        isActive: data.isActive,
        createdAt: currentSchedule.createdAt,
        updatedAt: currentSchedule.updatedAt,
        rowVersion:
          currentSchedule.rowVersion ??
          currentSchedule.version ??
          currentSchedule.timestamp,
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      const updateRes = await HorariosAPI.update(editingId, payload);
      if (updateRes.status === "error") {
        throw updateRes.error;
      }

      return updateRes.data;
    },
    onSuccess: async () => {
      await invalidateSchedulesList();
      toast({
        title: "Horario actualizado",
        description: "Los cambios han sido guardados correctamente",
      });
      onSuccess?.();
    },
    onError: (e: unknown) => {
      toast({
        title: "Error al actualizar",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSchedule) => {
    if (isEditing) {
      if (!editingId) {
        toast({
          title: "Error",
          description: "No se pudo obtener el ID del horario.",
          variant: "destructive",
        });
        return;
      }
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const workingDaysOptions = [
    "Lunes a Viernes",
    "Lunes a Sábado",
    "Días Específicos",
    "Rotativo",
    "Fines de Semana",
  ];

  const scheduleTemplates = [
    {
      name: "Administrativo",
      entry: "08:00",
      exit: "17:00",
      lunch: true,
      color: "blue",
    },
    {
      name: "Docente Matutino",
      entry: "07:00",
      exit: "13:00",
      lunch: false,
      color: "green",
    },
    {
      name: "Docente Vespertino",
      entry: "14:00",
      exit: "20:00",
      lunch: false,
      color: "orange",
    },
    {
      name: "Nocturno",
      entry: "18:00",
      exit: "22:00",
      lunch: false,
      color: "purple",
    },
  ] as const;

  const applyTemplate = (t: (typeof scheduleTemplates)[number]) => {
    form.setValue("entryTime", t.entry);
    form.setValue("exitTime", t.exit);
    form.setValue("hasLunchBreak", t.lunch);
    ensureLunchCoherence(t.lunch);

    toast({
      title: "Plantilla aplicada",
      description: `Configuración "${t.name}" cargada`,
    });
  };

  const getBadgeVariant = (color: string) => {
    switch (color) {
      case "blue":
        return "default";
      case "green":
        return "secondary";
      case "orange":
        return "outline";
      case "purple":
        return "default";
      default:
        return "secondary";
    }
  };

  if (!isInitialized) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-2">Cargando formulario...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                isEditing ? "bg-primary/15 text-primary" : "bg-success/15 text-success"
              }`}
            >
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                {isEditing ? "Editar Horario" : "Crear Nuevo Horario"}
                {isMobile && (
                  <Badge variant="outline" className="text-xs">
                    <Smartphone className="h-3 w-3 mr-1" />
                    Móvil
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {isEditing
                  ? "Modifique el horario de trabajo"
                  : "Configure un nuevo horario de trabajo"}
              </CardDescription>
            </div>
          </div>
          {isEditing && editingId && (
            <Badge variant="outline" className="text-xs">
              ID: {editingId}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-0 sm:px-6">
        <div className="bg-primary/10 dark:bg-primary/15 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium text-primary">Plantillas Rápidas</h4>
            <Badge variant="outline" className="text-xs bg-card">
              {isMobile ? "Toque" : "Click"} para aplicar
            </Badge>
          </div>
          <div
            className={`grid gap-2 ${
              isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
            }`}
          >
            {scheduleTemplates.map((t) => (
              <Button
                key={t.name}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto p-3 text-xs border-2 hover:scale-105 transition-transform"
                onClick={() => applyTemplate(t)}
              >
                <div className="text-center space-y-1">
                  <Badge variant={getBadgeVariant(t.color)} className="text-xs mb-1">
                    {t.name}
                  </Badge>
                  <div className="font-mono text-xs">
                    {t.entry} - {t.exit}
                  </div>
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
                  <FormLabel className="text-sm font-semibold">
                    Descripción del Horario *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Horario Administrativo Regular"
                      className="h-11 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div
              className={`grid gap-4 ${
                isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
              }`}
            >
              <FormField
                control={form.control}
                name="entryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      Hora de Entrada *
                    </FormLabel>
                    <FormControl>
                      <Input type="time" className="h-11 text-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exitTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      Hora de Salida *
                    </FormLabel>
                    <FormControl>
                      <Input type="time" className="h-11 text-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredHoursPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      Horas Requeridas/Día
                    </FormLabel>
                    <FormControl>
                      <Input
                        readOnly
                        className="h-11 text-sm bg-muted font-mono"
                        {...field}
                        value={computedHours}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Se calcula automáticamente: salida - entrada - almuerzo
                    </p>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="workingDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">
                    Días de Trabajo *
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-sm">
                        <SelectValue placeholder="Seleccione los días" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workingDaysOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-sm">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasLunchBreak"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-card">
                  <div className="space-y-0.5 flex-1">
                    <FormLabel className="text-base font-semibold">
                      Incluye Almuerzo
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Indique si el horario incluye tiempo de almuerzo
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => {
                        field.onChange(v);
                        ensureLunchCoherence(v);
                      }}
                      className="data-[state=checked]:bg-success"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("hasLunchBreak") && (
              <div
                className={`grid gap-4 ${
                  isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                } bg-primary/10 p-4 rounded-lg border border-primary/30`}
              >
                <FormField
                  control={form.control}
                  name="lunchStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Inicio de Almuerzo
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          className="h-11 text-sm"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lunchEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Fin de Almuerzo
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          className="h-11 text-sm"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="isRotating"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-card">
                  <div className="space-y-0.5 flex-1">
                    <FormLabel className="text-base font-semibold">
                      Horario Rotativo
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Marque si es un horario con rotación de turnos
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-purple-600"
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
                  <FormItem className="bg-accent/50 p-4 rounded-lg border border-secondary/30">
                    <FormLabel className="text-sm font-semibold">
                      Patrón de Rotación
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa el patrón de rotación"
                        className="min-h-[80px] text-sm resize-vertical"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-card">
                  <div className="space-y-0.5 flex-1">
                    <FormLabel className="text-base font-semibold">
                      Horario Activo
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Define si el horario estará disponible para uso
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="bg-success/10 dark:bg-success/15 p-4 rounded-lg border border-success/30">
              <div className="flex items-center space-x-2 text-success mb-3">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold text-sm">Vista Previa del Horario</span>
              </div>
              <div className="text-sm text-success space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Horario:</span>
                  <span className="font-mono bg-card px-2 py-1 rounded text-xs">
                    {form.watch("entryTime")} - {form.watch("exitTime")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Horas diarias:</span>
                  <Badge variant="secondary" className="font-mono">
                    {computedHours}h
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Días:</span>
                  <span className="text-right">{form.watch("workingDays")}</span>
                </div>
                {form.watch("hasLunchBreak") &&
                  form.watch("lunchStart") &&
                  form.watch("lunchEnd") && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Almuerzo:</span>
                      <span className="font-mono bg-card px-2 py-1 rounded text-xs">
                        {form.watch("lunchStart")} - {form.watch("lunchEnd")}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between items-center">
                  <span className="font-medium">Tipo:</span>
                  <Badge variant={form.watch("isRotating") ? "default" : "outline"}>
                    {form.watch("isRotating") ? "Rotativo" : "Fijo"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Estado:</span>
                  {form.watch("isActive") ? (
                    <Badge className="bg-success/15 text-success">Activo</Badge>
                  ) : (
                    <Badge className="bg-destructive/15 text-destructive">
                      Inactivo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`flex flex-col sm:flex-row gap-3 pt-6 border-t ${
                isMobile ? "sticky bottom-0 bg-card pb-2" : ""
              }`}
            >
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12 sm:h-10 bg-success hover:bg-green-700"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading
                  ? "Guardando..."
                  : isEditing
                  ? "Actualizar Horario"
                  : "Crear Horario"}
              </Button>

              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 h-12 sm:h-10"
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