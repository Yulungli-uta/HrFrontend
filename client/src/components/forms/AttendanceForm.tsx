import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertAttendancePunchSchema, type InsertAttendancePunch } from "@shared/schema";
import { Timer, Save, X, MapPin, Calendar, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { 
  MarcacionesAPI, 
  MarcacionesEspecializadasAPI, 
  handleApiError, 
  type ApiError,
  TimeAPI, 
  type TimeResponse 
} from "@/lib/api";

interface AttendanceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface LastPunch {
  punchTime: string;
  punchType: string;
}

export default function AttendanceForm({ onSuccess, onCancel }: AttendanceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastPunch, setLastPunch] = useState<LastPunch | null>(null);
  const [timeSinceLastPunch, setTimeSinceLastPunch] = useState<number>(0);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isSyncingTime, setIsSyncingTime] = useState(false);

  // Función para sincronizar la hora con el servidor
  const syncServerTime = async () => {
    setIsSyncingTime(true);
    try {
      const response = await TimeAPI.getServerTime();
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      
      const serverTime = new Date(response.data.dateTime);
      const clientTime = new Date();
      const offset = serverTime.getTime() - clientTime.getTime();
      setTimeOffset(offset);
      
      // Actualizar la hora actual con la del servidor
      setCurrentTime(new Date(Date.now() + offset));
      
      toast({
        title: "Hora sincronizada",
        description: "La hora se ha sincronizado correctamente con el servidor",
        variant: "default"
      });
    } catch (error) {
      console.error("Error syncing time with server:", error);
      toast({
        title: "Error al sincronizar hora",
        description: "Se usará la hora local del dispositivo",
        variant: "destructive"
      });
    } finally {
      setIsSyncingTime(false);
    }
  };

  // Sincronizar la hora al cargar el componente
  useEffect(() => {
    syncServerTime();
    
    // Sincronizar cada minuto para mantener la precisión
    const syncInterval = setInterval(syncServerTime, 60000);
    return () => clearInterval(syncInterval);
  }, []);

  // Consultar la última marcación del usuario usando la API especializada
  const { data: lastPunchData, refetch: refetchLastPunch } = useQuery({
    queryKey: ['lastPunch'],
    queryFn: async () => {
      try {
        const response = await MarcacionesEspecializadasAPI.getLastPunch(1); // employeeId fijo por ahora
        if (response.status === 'error') {
          throw new Error(response.error.message);
        }
        return response.data;
      } catch (error) {
        console.error("Error fetching last punch:", error);
        // Mostrar error al usuario
        toast({
          title: "Error al obtener última marcación",
          description: handleApiError(
            error instanceof Error 
              ? { code: 0, message: error.message } 
              : { code: 0, message: "Error desconocido" },
            "No se pudo obtener la última marcación"
          ),
          variant: "destructive"
        });
        return null;
      }
    },
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  // Actualizar el estado con la última marcación
  useEffect(() => {
    if (lastPunchData) {
      setLastPunch(lastPunchData);
    }
  }, [lastPunchData]);

  // Calcular el tiempo transcurrido desde la última marcación
  useEffect(() => {
    if (lastPunch) {
      const lastPunchTime = new Date(lastPunch.punchTime);
      const diffInMs = currentTime.getTime() - lastPunchTime.getTime();
      const diffInMinutes = Math.floor(diffInMs / 60000);
      setTimeSinceLastPunch(diffInMinutes);
    }
  }, [lastPunch, currentTime]);

  // Actualizar la hora actual cada segundo usando el offset del servidor
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date(Date.now() + timeOffset));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeOffset]);

  const form = useForm<InsertAttendancePunch>({
    resolver: zodResolver(insertAttendancePunchSchema),
    defaultValues: {
      employeeId: 1,
      punchTime: new Date().toISOString(),
      punchType: "In",
      deviceId: "WEB",
      longitude: null,
      latitude: null
    }
  });

  useEffect(() => {
    // Obtener ubicación actual
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          form.setValue("latitude", position.coords.latitude);
          form.setValue("longitude", position.coords.longitude);
          setIsGettingLocation(false);
        },
        (error) => {
          console.log("Error obteniendo ubicación:", error);
          setIsGettingLocation(false);
          toast({
            title: "No se pudo obtener la ubicación",
            description: "Puede registrar la marcación sin ubicación",
            variant: "default"
          });
        },
        { timeout: 10000 }
      );
    } else {
      setIsGettingLocation(false);
    }
  }, [form, toast]);

  // Actualizar el valor de punchTime cuando currentTime cambie
  useEffect(() => {
    form.setValue("punchTime", currentTime.toISOString());
  }, [currentTime, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertAttendancePunch) => {
      console.log("Submitting data:", data);
      
      // Forzar el uso de la hora del servidor
      const response = await TimeAPI.getServerTime();
      if (response.status === 'error') {
        throw response.error;
      }
      
      data.punchTime = response.data.dateTime;
      
      const marcacionResponse = await MarcacionesAPI.create(data);
      
      if (marcacionResponse.status === 'error') {
        // Lanzar el error completo para que onError pueda manejarlo
        throw marcacionResponse.error;
      }
      
      return marcacionResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      refetchLastPunch(); // Volver a cargar la última marcación
      toast({ 
        title: "Marcación registrada exitosamente",
        description: "Su registro de asistencia ha sido guardado correctamente."
      });
      onSuccess?.();
    },
    onError: (error: ApiError) => {
      // Usar handleApiError para mostrar mensajes de error apropiados
      const errorMessage = handleApiError(
        error, 
        "Error al registrar marcación. Por favor, intente nuevamente."
      );
      
      toast({ 
        title: "Error al registrar marcación", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: InsertAttendancePunch) => {
    // Verificar si ha pasado el tiempo mínimo requerido
    if (timeSinceLastPunch < 5 && lastPunch) {
      toast({
        title: "Tiempo insuficiente entre marcaciones",
        description: `Deben pasar al menos 5 minutos entre marcaciones. Su última marcación fue hace ${timeSinceLastPunch} minutos.`,
        variant: "destructive"
      });
      return;
    }
    
    // Usar la hora actual del servidor (ya se establece en mutationFn)
    createMutation.mutate(data);
  };

  const isLoading = createMutation.isPending;
  const isWithinCooldown = timeSinceLastPunch < 5 && lastPunch;

  const handleQuickPunch = async (punchType: "In" | "Out") => {
    // Verificar si ha pasado el tiempo mínimo requerido
    if (isWithinCooldown) {
      toast({
        title: "Tiempo insuficiente entre marcaciones",
        description: `Deben pasar al menos 5 minutos entre marcaciones. Su última marcación fue hace ${timeSinceLastPunch} minutos.`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Obtener la hora actual del servidor
      const response = await TimeAPI.getServerTime();
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      
      const serverTime = response.data.dateTime;
      
      const formData = form.getValues();
      const data: InsertAttendancePunch = {
        employeeId: formData.employeeId,
        punchTime: serverTime, // Usar la hora del servidor
        punchType,
        deviceId: formData.deviceId,
        latitude: currentLocation?.latitude || formData.latitude || null,
        longitude: currentLocation?.longitude || formData.longitude || null
      };
      createMutation.mutate(data);
    } catch (error) {
      console.error("Error obteniendo hora del servidor:", error);
      toast({
        title: "Error al obtener hora del servidor",
        description: "Por favor, intente nuevamente",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Botón para sincronizar manualmente la hora */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={syncServerTime}
          disabled={isSyncingTime}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingTime ? 'animate-spin' : ''}`} />
          {isSyncingTime ? "Sincronizando..." : "Sincronizar Hora"}
        </Button>
      </div>

      {/* Marcación Rápida */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Registrar Mi Marcación</span>
          </CardTitle>
          <CardDescription>
            Registre su entrada o salida con un solo clic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Usuario: Admin Usuario</p>
              <p className="text-xs text-gray-500">
                {currentTime.toLocaleString('es-EC', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
                <span className="ml-2 text-green-600">(Hora del servidor)</span>
              </p>
              {isGettingLocation ? (
                <p className="text-xs text-gray-500 mt-2">
                  Obteniendo ubicación...
                </p>
              ) : currentLocation ? (
                <p className="text-xs text-gray-500 mt-2">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Ubicación detectada
                </p>
              ) : (
                <p className="text-xs text-yellow-500 mt-2">
                  Ubicación no disponible
                </p>
              )}
              
              {/* Mostrar información de la última marcación */}
              {lastPunch && (
                <div className="mt-3 p-2 bg-blue-50 rounded-md">
                  <p className="text-xs text-blue-700">
                    Última marcación: {new Date(lastPunch.punchTime).toLocaleString('es-EC')} ({lastPunch.punchType === "In" ? "Entrada" : "Salida"})
                  </p>
                  <p className="text-xs text-blue-700">
                    Hace {timeSinceLastPunch} minutos
                  </p>
                </div>
              )}
            </div>
            
            {/* Advertencia si el tiempo entre marcaciones es insuficiente */}
            {isWithinCooldown && (
              <div className="p-3 bg-amber-100 border border-amber-300 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Debe esperar al menos 5 minutos entre marcaciones. Podrá registrar nuevamente en {5 - timeSinceLastPunch} minutos.
                </p>
              </div>
            )}
            
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg"
                className="flex-1 max-w-32 bg-green-600 hover:bg-green-700 h-16 flex flex-col"
                onClick={() => handleQuickPunch("In")}
                disabled={isLoading || isGettingLocation || isWithinCooldown}
                data-testid="button-quick-in"
              >
                <Timer className="h-6 w-6 mb-1" />
                ENTRADA
              </Button>
              <Button 
                size="lg"
                className="flex-1 max-w-32 bg-red-600 hover:bg-red-700 h-16 flex flex-col"
                onClick={() => handleQuickPunch("Out")}
                disabled={isLoading || isGettingLocation || isWithinCooldown}
                data-testid="button-quick-out"
              >
                <Timer className="h-6 w-6 mb-1" />
                SALIDA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario Detallado */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Marcación Manual</span>
          </CardTitle>
          <CardDescription>
            Ajuste el tipo de marcación si es necesario. La fecha y hora se registrarán automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 bg-gray-50 p-3 rounded">
                  <p className="text-sm font-medium text-gray-700">Usuario: Admin Usuario</p>
                  <p className="text-xs text-gray-500">Solo puede registrar sus propias marcaciones</p>
                </div>

                <FormField
                  control={form.control}
                  name="punchType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Marcación *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-punch-type">
                            <SelectValue placeholder="Seleccione el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="In">Entrada</SelectItem>
                          <SelectItem value="Out">Salida</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Mostrar fecha y hora actual (solo lectura) */}
                <FormItem>
                  <FormLabel>Fecha y Hora *</FormLabel>
                  <div className="flex items-center p-2 border rounded-md bg-gray-50">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm">
                      {currentTime.toLocaleString('es-EC', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    La fecha y hora se registran automáticamente
                  </p>
                </FormItem>

                <FormField
                  control={form.control}
                  name="deviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID del Dispositivo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="WEB" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {currentLocation && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-700">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Ubicación detectada</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Lat: {currentLocation.latitude.toFixed(6)}, Lng: {currentLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {/* Advertencia si el tiempo entre marcaciones es insuficiente */}
              {isWithinCooldown && (
                <div className="p-3 bg-amber-100 border border-amber-300 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Debe esperar al menos 5 minutos entre marcaciones. Podrá registrar nuevamente en {5 - timeSinceLastPunch} minutos.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  data-testid="button-cancel"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || isGettingLocation || isWithinCooldown}
                  data-testid="button-save"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Guardando..." : "Guardar Marcación"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}