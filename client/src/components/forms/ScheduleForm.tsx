// ScheduleForm.tsx - VERSIÓN COMPLETA CON DEBUG
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
import { insertScheduleSchema, type InsertSchedule, type FrontendSchedule } from "@shared/schema";
import { Clock, Save, X, Calendar, Zap, Smartphone } from "lucide-react";
import { HorariosAPI, type ApiResponse } from "@/lib/api";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Badge } from "@/components/ui/badge";
import { tokenService } from "@/services/auth";

interface ScheduleFormProps {
  schedule?: FrontendSchedule;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// 🔧 FUNCIÓN PARA NORMALIZAR TIEMPO (eliminar segundos si los tiene)
const normalizeTime = (time: string | null): string | null => {
  if (!time) return null;
  // Si el tiempo tiene formato HH:MM:SS, convertir a HH:MM
  if (time.length === 8 && time.split(':').length === 3) {
    return time.substring(0, 5); // "08:00:00" → "08:00"
  }
  return time;
};

// 🔧 FUNCIÓN ESPECÍFICA PARA DEBUG DE UPDATE
const debugUpdateSchedule = async (id: number, data: any): Promise<ApiResponse<any>> => {
  const url = `http://localhost:5000/api/v1/rh/schedules/${id}`;
  const accessToken = tokenService.getAccessToken();
  
  console.group('🔍 DEBUG UPDATE SCHEDULE');
  console.log('📤 URL:', url);
  console.log('📦 Payload:', data);
  console.log('🔑 Token:', accessToken ? 'Presente' : 'No presente');
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    const responseText = await response.text();
    
    console.log('📥 Response Status:', response.status, response.statusText);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('📄 Response Body (RAW):', responseText);
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      parsedData = { rawText: responseText };
    }

    console.log('📊 Response Body (Parsed):', parsedData);
    console.groupEnd();

    if (!response.ok) {
      return {
        status: "error",
        error: {
          code: response.status,
          message: `HTTP Error ${response.status}: ${response.statusText}`,
          details: parsedData,
          responseText: responseText
        }
      };
    }

    return {
      status: "success",
      data: parsedData
    };
  } catch (error: any) {
    console.groupEnd();
    console.error('💥 Network Error:', error);
    
    return {
      status: "error",
      error: {
        code: 0,
        message: error.message || "Network error"
      }
    };
  }
};

export default function ScheduleForm({ schedule, onSuccess, onCancel }: ScheduleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isEditing = !!schedule;
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const form = useForm<InsertSchedule>({
    resolver: zodResolver(insertScheduleSchema),
    defaultValues: {
      description: "",
      entryTime: "08:00",
      exitTime: "17:00",
      workingDays: "Lunes a Viernes",
      requiredHoursPerDay: "8.0",
      hasLunchBreak: false,
      lunchStart: null,
      lunchEnd: null,
      isRotating: false,
      rotationPattern: null
    }
  });

  // Efecto para capturar el ID de forma segura y resetear el formulario
  useEffect(() => {
    console.log("🔄 ScheduleForm useEffect - schedule:", schedule);
    
    if (schedule) {
      try {
        const scheduleId = schedule.id || schedule.scheduleId;
        console.log("✅ ID extraído:", scheduleId);
        
        if (scheduleId) {
          setEditingId(scheduleId);
        }
        
        // 🔧 Normalizar tiempos al cargar
        const formattedSchedule = {
          description: schedule.description || "",
          entryTime: normalizeTime(schedule.entryTime) || "08:00",
          exitTime: normalizeTime(schedule.exitTime) || "17:00", 
          workingDays: schedule.workingDays || "Lunes a Viernes",
          requiredHoursPerDay: typeof schedule.requiredHoursPerDay === 'number' 
            ? schedule.requiredHoursPerDay.toString() 
            : (schedule.requiredHoursPerDay || "8.0"),
          hasLunchBreak: schedule.hasLunchBreak ?? false,
          lunchStart: normalizeTime(schedule.lunchStart),
          lunchEnd: normalizeTime(schedule.lunchEnd),
          isRotating: schedule.isRotating ?? false,
          rotationPattern: schedule.rotationPattern || null
        };
        
        console.log("📋 Datos formateados para formulario:", formattedSchedule);
        form.reset(formattedSchedule);
      } catch (error) {
        console.error("❌ Error al procesar schedule:", error);
        toast({
          title: "Error al cargar datos",
          description: "No se pudieron cargar los datos del horario",
          variant: "destructive"
        });
      }
    } else {
      setEditingId(null);
      form.reset({
        description: "",
        entryTime: "08:00",
        exitTime: "17:00",
        workingDays: "Lunes a Viernes",
        requiredHoursPerDay: "8.0",
        hasLunchBreak: false,
        lunchStart: null,
        lunchEnd: null,
        isRotating: false,
        rotationPattern: null
      });
    }
    
    setIsInitialized(true);
  }, [schedule, form, toast]);

  const ensureLunchCoherence = (hasLunch: boolean) => {
    if (!hasLunch) {
      form.setValue("lunchStart", null);
      form.setValue("lunchEnd", null);
    } else {
      if (!form.getValues("lunchStart")) form.setValue("lunchStart", "13:00");
      if (!form.getValues("lunchEnd")) form.setValue("lunchEnd", "14:00");
    }
  };

  const invalidateSchedulesList = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/schedules"] });

  // CREATE mutation 
  const createMutation = useMutation({
    mutationFn: async (data: InsertSchedule) => {
      console.log("🚀 Creando horario con datos:", data);
      
      // 🔧 NORMALIZAR Y CONVERTIR TIPOS para el backend
      const payload = {
        description: data.description,
        entryTime: normalizeTime(data.entryTime)!, // Asegurar formato HH:MM
        exitTime: normalizeTime(data.exitTime)!,   // Asegurar formato HH:MM
        workingDays: data.workingDays,
        requiredHoursPerDay: parseFloat(data.requiredHoursPerDay), // Convertir a número
        hasLunchBreak: data.hasLunchBreak,
        lunchStart: data.hasLunchBreak ? normalizeTime(data.lunchStart) : null,
        lunchEnd: data.hasLunchBreak ? normalizeTime(data.lunchEnd) : null,
        isRotating: data.isRotating,
        rotationPattern: data.isRotating ? data.rotationPattern : null
      };
      
      console.log("📤 Payload final (convertido):", payload);
      console.log("📤 Tipo de requiredHoursPerDay:", typeof payload.requiredHoursPerDay);
      console.log("📤 Formato de entryTime:", payload.entryTime);
      console.log("📤 Formato de exitTime:", payload.exitTime);
      
      const res = await HorariosAPI.create(payload);
      if (res.status === "error") {
        console.error("❌ Error en creación:", res.error);
        throw new Error(res.error.message || "Error al crear horario");
      }
      return res.data;
    },
    onSuccess: () => {
      invalidateSchedulesList();
      toast({ 
        title: "✅ Horario creado exitosamente",
        description: "El horario ha sido registrado en el sistema"
      });
      onSuccess?.();
    },
    onError: (e: any) => {
      console.error("💥 Error en creación:", e);
      toast({ 
        title: "❌ Error al crear horario", 
        description: e?.message || "Error desconocido",
        variant: "destructive" 
      });
    }
  });

  // UPDATE mutation - VERSIÓN CON DEBUG ESPECÍFICO
  // UPDATE mutation - VERSIÓN CON MANEJO DE CONCURRENCIA OPTIMISTA
const updateMutation = useMutation({
  mutationFn: async (data: InsertSchedule) => {
    console.log("🔄 Iniciando actualización con manejo de concurrencia...");
    
    if (!editingId) {
      throw new Error("ID de horario no proporcionado");
    }

    // 🔧 PASO 1: Obtener el registro ACTUAL con todos los campos (incluyendo el de concurrencia)
    console.log("📋 Obteniendo horario actual para concurrencia...");
    const currentResponse = await HorariosAPI.get(editingId);
    
    if (currentResponse.status === "error") {
      throw new Error("El horario no existe o fue eliminado. Recargando página...");
    }

    const currentSchedule = currentResponse.data;
    console.log("📊 Horario actual obtenido:", currentSchedule);

    // 🔧 PASO 2: Construir payload INCLUYENDO el campo de concurrencia
    // El campo podría llamarse: rowVersion, version, timestamp, concurrencyToken, etc.
    const payload: any = {
      // 🔧 Incluir todos los campos que el backend espera para UPDATE
      scheduleId: editingId, // Posiblemente requerido
      description: data.description,
      entryTime: data.entryTime,
      exitTime: data.exitTime,
      workingDays: data.workingDays,
      requiredHoursPerDay: parseFloat(data.requiredHoursPerDay),
      hasLunchBreak: data.hasLunchBreak,
      isRotating: data.isRotating,
      lunchStart: data.hasLunchBreak ? data.lunchStart : null,
      lunchEnd: data.hasLunchBreak ? data.lunchEnd : null,
      rotationPattern: data.isRotating ? data.rotationPattern : "",
      
      // 🔧 INCLUIR CAMPOS DE CONCURRENCIA (probables nombres)
      // El backend NECESITA estos campos para la verificación de concurrencia
      rowVersion: currentSchedule.rowVersion || currentSchedule.version || currentSchedule.timestamp,
      
      // 🔧 Posiblemente también necesite estos campos
      updatedAt: currentSchedule.updatedAt,
      createdAt: currentSchedule.createdAt
    };

    // 🔧 Limpiar campos undefined/null
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    });

    console.log("🎯 Payload FINAL con campos de concurrencia:", payload);

    // 🔧 PASO 3: Intentar la actualización
    const updateRes = await HorariosAPI.update(editingId, payload);
    
    if (updateRes.status === "error") {
      console.error("❌ Error en actualización:", updateRes.error);
      
      // 🔧 Manejar específicamente el error de concurrencia
      if (updateRes.error.message?.includes("concurrency") || 
          updateRes.error.details?.title?.includes("validation errors")) {
        throw new Error("CONCURRENCY_ERROR: El horario fue modificado por otro usuario. Por favor, recargue la página y vuelva a intentar.");
      }
      
      throw updateRes.error;
    }
    
    console.log("✅ Actualización exitosa con manejo de concurrencia");
    return updateRes.data;
  },
  onSuccess: () => {
    invalidateSchedulesList();
    toast({ 
      title: "✅ Horario actualizado",
      description: "Los cambios han sido guardados correctamente",
      duration: 5000
    });
    onSuccess?.();
  },
  onError: (e: any) => {
    console.error("💥 Error en actualización:", e);
    
    let errorMessage = e?.message || "Error desconocido al actualizar el horario";
    let title = "❌ Error al actualizar";
    let shouldReload = false;

    // 🔧 Manejo específico de errores
    if (errorMessage.includes("CONCURRENCY_ERROR")) {
      title = "⚠️ Conflicto de concurrencia";
      errorMessage = "El horario fue modificado por otro usuario. La página se recargará automáticamente.";
      shouldReload = true;
    } else if (errorMessage.includes("no existe") || errorMessage.includes("eliminado")) {
      title = "❌ Horario no encontrado";
      errorMessage = "El horario que intenta editar ya no existe. Recargando página...";
      shouldReload = true;
    } else if (errorMessage.includes("validation") || errorMessage.includes("validación")) {
      title = "❌ Error de validación";
      errorMessage = "Los datos enviados no son válidos. Verifique la información.";
    }

    toast({ 
      title, 
      description: errorMessage,
      variant: "destructive",
      duration: 8000
    });

    // 🔧 Recargar página si es necesario
    if (shouldReload) {
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }
});

  // 🔧 TEST DE DIFERENTES FORMATOS
  const testDifferentFormats = async () => {
    if (!editingId) return;

    const formats = [
      {
        name: "Formato CREATE",
        payload: {
          description: "TEST CREATE FORMAT",
          entryTime: "08:00",
          exitTime: "17:00",
          workingDays: "Lunes a Viernes",
          requiredHoursPerDay: 8,
          hasLunchBreak: false,
          isRotating: false
        }
      },
      {
        name: "Formato con scheduleId",
        payload: {
          scheduleId: editingId,
          description: "TEST WITH SCHEDULEID",
          entryTime: "08:00",
          exitTime: "17:00",
          workingDays: "Lunes a Viernes",
          requiredHoursPerDay: 8,
          hasLunchBreak: false,
          isRotating: false
        }
      },
      {
        name: "Formato mínimo",
        payload: {
          description: "TEST MINIMAL"
        }
      }
    ];

    for (const format of formats) {
      console.log(`🧪 Testing: ${format.name}`);
      const result = await debugUpdateSchedule(editingId, format.payload);
      
      if (result.status === "success") {
        console.log(`✅ ${format.name} - FUNCIONÓ`);
        toast({
          title: `✅ ${format.name} funciona`,
          description: "Revisa consola para detalles"
        });
        break;
      } else {
        console.log(`❌ ${format.name} - Falló:`, result.error);
      }
    }
  };

  const onSubmit = (data: InsertSchedule) => {
    console.log("📝 Enviando formulario...");
    console.log("🔄 Modo edición:", isEditing);
    console.log("🆔 ID disponible:", editingId);
    console.log("📋 Datos del formulario:", data);

    if (isEditing) {
      if (!editingId) {
        toast({
          title: "❌ Error crítico",
          description: "No se pudo obtener el ID del horario.",
          variant: "destructive"
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
    "Fines de Semana"
  ];

  const scheduleTemplates = [
    { name: "Administrativo", entry: "08:00", exit: "17:00", hours: "8.0", lunch: true, color: "blue" },
    { name: "Docente Matutino", entry: "07:00", exit: "13:00", hours: "8.0", lunch: false, color: "green" },
    { name: "Docente Vespertino", entry: "14:00", exit: "20:00", hours: "8.0", lunch: false, color: "orange" },
    { name: "Nocturno", entry: "18:00", exit: "22:00", hours: "8.0", lunch: false, color: "purple" }
  ] as const;

  const applyTemplate = (t: typeof scheduleTemplates[number]) => {
    form.setValue("entryTime", t.entry);
    form.setValue("exitTime", t.exit);
    form.setValue("requiredHoursPerDay", t.hours);
    form.setValue("hasLunchBreak", t.lunch);
    ensureLunchCoherence(t.lunch);
    
    toast({
      title: "📋 Plantilla aplicada",
      description: `Configuración "${t.name}" cargada`
    });
  };

  const getBadgeVariant = (color: string) => {
    switch (color) {
      case 'blue': return 'default';
      case 'green': return 'secondary';
      case 'orange': return 'outline';
      case 'purple': return 'default';
      default: return 'secondary';
    }
  };

  // Si no está inicializado, mostrar loading
  if (!isInitialized) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            <div className={`p-2 rounded-lg ${
              isEditing ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            }`}>
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
                {isEditing ? "Modifique el horario de trabajo" : "Configure un nuevo horario de trabajo"}
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
        {/* Plantillas de Horario */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-medium text-blue-900">Plantillas Rápidas</h4>
            <Badge variant="outline" className="text-xs bg-white">
              {isMobile ? "Toque" : "Click"} para aplicar
            </Badge>
          </div>
          <div className={`grid gap-2 ${
            isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
          }`}>
            {scheduleTemplates.map((t) => (
              <Button
                key={t.name}
                type="button"
                variant="outline"
                size="sm"
                className={`h-auto p-3 text-xs border-2 hover:scale-105 transition-transform ${
                  t.color === 'blue' ? 'hover:border-blue-300' :
                  t.color === 'green' ? 'hover:border-green-300' :
                  t.color === 'orange' ? 'hover:border-orange-300' :
                  'hover:border-purple-300'
                }`}
                onClick={() => applyTemplate(t)}
                data-testid={`template-${t.name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div className="text-center space-y-1">
                  <Badge variant={getBadgeVariant(t.color)} className="text-xs mb-1">
                    {t.name}
                  </Badge>
                  <div className="font-mono text-xs">{t.entry} - {t.exit}</div>
                  <div className="text-gray-500 text-xs">{t.hours}h</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Descripción del Horario *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Horario Administrativo Regular"
                      data-testid="input-description"
                      className="h-11 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Horarios - Grid Responsive */}
            <div className={`grid gap-4 ${
              isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
            }`}>
              <FormField
                control={form.control}
                name="entryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Hora de Entrada *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        data-testid="input-entryTime" 
                        className="h-11 text-sm"
                        {...field} 
                      />
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
                    <FormLabel className="text-sm font-semibold">Hora de Salida *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        data-testid="input-exitTime" 
                        className="h-11 text-sm"
                        {...field} 
                      />
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
                    <FormLabel className="text-sm font-semibold">Horas Requeridas/Día *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        max="12"
                        placeholder="8.0"
                        data-testid="input-requiredHours"
                        className="h-11 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Días de Trabajo */}
            <FormField
              control={form.control}
              name="workingDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Días de Trabajo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-sm" data-testid="select-workingDays">
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

            {/* Switch Almuerzo */}
            <div className={`space-y-4 ${isMobile ? 'bg-gray-50 p-4 rounded-lg' : ''}`}>
              <FormField
                control={form.control}
                name="hasLunchBreak"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-white">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base font-semibold">Incluye Almuerzo</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Indique si el horario incluye tiempo de almuerzo
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(v) => { field.onChange(v); ensureLunchCoherence(v); }}
                        data-testid="switch-hasLunchBreak"
                        className="data-[state=checked]:bg-green-600"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("hasLunchBreak") && (
                <div className={`grid gap-4 ${
                  isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                } bg-blue-50 p-4 rounded-lg border border-blue-200`}>
                  <FormField
                    control={form.control}
                    name="lunchStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold flex items-center gap-2">
                          <span>Inicio de Almuerzo</span>
                          <Badge variant="outline" className="text-xs">Opcional</Badge>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            data-testid="input-lunchStart"
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
                        <FormLabel className="text-sm font-semibold flex items-center gap-2">
                          <span>Fin de Almuerzo</span>
                          <Badge variant="outline" className="text-xs">Opcional</Badge>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            data-testid="input-lunchEnd"
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
            </div>

            {/* Horario Rotativo */}
            <div className={`space-y-4 ${isMobile ? 'bg-gray-50 p-4 rounded-lg' : ''}`}>
              <FormField
                control={form.control}
                name="isRotating"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-white">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base font-semibold">Horario Rotativo</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Marque si es un horario con rotación de turnos
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-isRotating"
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
                    <FormItem className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <FormLabel className="text-sm font-semibold">Patrón de Rotación</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describa el patrón de rotación (ej: Semana 1: Mañana 08:00-16:00, Semana 2: Tarde 14:00-22:00, etc.)"
                          data-testid="input-rotationPattern"
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
            </div>

            {/* Vista previa del horario */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 text-green-700 mb-3">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold text-sm">Vista Previa del Horario</span>
              </div>
              <div className="text-sm text-green-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Horario:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded text-xs">
                    {form.watch("entryTime")} - {form.watch("exitTime")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Horas diarias:</span>
                  <Badge variant="secondary" className="font-mono">
                    {form.watch("requiredHoursPerDay")}h
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Días:</span>
                  <span className="text-right">{form.watch("workingDays")}</span>
                </div>
                {form.watch("hasLunchBreak") && form.watch("lunchStart") && form.watch("lunchEnd") && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Almuerzo:</span>
                    <span className="font-mono bg-white px-2 py-1 rounded text-xs">
                      {form.watch("lunchStart")} - {form.watch("lunchEnd")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium">Tipo:</span>
                  <Badge variant={form.watch("isRotating") ? "default" : "outline"} className="text-xs">
                    {form.watch("isRotating") ? "🔄 Rotativo" : "⏰ Fijo"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 🔧 SECCIÓN DEBUG (Solo desarrollo y modo edición) */}
            {/* {process.env.NODE_ENV === 'development' && isEditing && (
              <div className="mt-6 p-4 border border-orange-300 bg-orange-50 rounded-lg">
                <p className="text-sm font-medium text-orange-800 mb-3">
                  🐛 Debug Update (Solo Desarrollo)
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={testDifferentFormats}
                    className="text-xs"
                  >
                    Probar Diferentes Formatos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => console.log("🆔 Editing ID:", editingId)}
                    className="text-xs"
                  >
                    Ver ID Actual
                  </Button>
                </div>
              </div>
            )} */}

            {/* Botones de acción */}
            <div className={`flex flex-col sm:flex-row gap-3 pt-6 border-t ${
              isMobile ? 'sticky bottom-0 bg-white pb-2' : ''
            }`}>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12 sm:h-10 bg-green-600 hover:bg-green-700"
                data-testid="button-save-schedule"
                size={isMobile ? "default" : "default"}
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Guardando..." : (isEditing ? "Actualizar Horario" : "Crear Horario")}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 h-12 sm:h-10"
                  data-testid="button-cancel"
                  size={isMobile ? "default" : "default"}
                >
                  <X className="mr-2 h-4 w-4" />
                  {isMobile ? "Cancelar" : "Cancelar Operación"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}