import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Timer, Save, X, MapPin, Calendar, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import {
  MarcacionesAPI,
  MarcacionesEspecializadasAPI,
  handleApiError,
  type ApiError,
  TimeAPI,
} from "@/lib/api";

interface AttendanceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface LastPunch {
  punchTime: string;
  punchType: string;
}

type AttendanceFormData = {
  employeeId: number;
  punchTime: string;
  punchType: "In" | "Out";
  deviceId: string;
  longitude: number | null;
  latitude: number | null;
};

export default function AttendanceForm({ onSuccess, onCancel }: AttendanceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastPunch, setLastPunch] = useState<LastPunch | null>(null);
  const [timeSinceLastPunch, setTimeSinceLastPunch] = useState<number>(0);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isSyncingTime, setIsSyncingTime] = useState(false);

  const syncServerTime = async () => {
    setIsSyncingTime(true);
    try {
      const response = await TimeAPI.getServerTime();

      if (response.status === "error") {
        throw new Error(response.error.message);
      }

      const serverTime = new Date(response.data.dateTime);
      const clientTime = new Date();
      const offset = serverTime.getTime() - clientTime.getTime();

      setTimeOffset(offset);
      setCurrentTime(new Date(Date.now() + offset));

      toast({
        title: "Hora sincronizada",
        description: "La hora se ha sincronizado correctamente con el servidor",
      });
    } catch (error) {
      console.error("Error syncing time with server:", error);
      toast({
        title: "Error al sincronizar hora",
        description: "Se usará la hora local del dispositivo",
        variant: "destructive",
      });
    } finally {
      setIsSyncingTime(false);
    }
  };

  useEffect(() => {
    syncServerTime();
    const syncInterval = setInterval(syncServerTime, 60000);
    return () => clearInterval(syncInterval);
  }, []);

  const { data: lastPunchData, refetch: refetchLastPunch } = useQuery({
    queryKey: ["lastPunch"],
    queryFn: async () => {
      try {
        const response = await MarcacionesEspecializadasAPI.getLastPunch(1);
        if (response.status === "error") {
          throw new Error(response.error.message);
        }
        return response.data;
      } catch (error) {
        console.error("Error fetching last punch:", error);
        toast({
          title: "Error al obtener última marcación",
          description: handleApiError(
            error instanceof Error
              ? { code: 0, message: error.message }
              : { code: 0, message: "Error desconocido" },
            "No se pudo obtener la última marcación"
          ),
          variant: "destructive",
        });
        return null;
      }
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (lastPunchData) {
      setLastPunch(lastPunchData);
    }
  }, [lastPunchData]);

  useEffect(() => {
    if (lastPunch) {
      const lastPunchTime = new Date(lastPunch.punchTime);
      const diffInMs = currentTime.getTime() - lastPunchTime.getTime();
      const diffInMinutes = Math.floor(diffInMs / 60000);
      setTimeSinceLastPunch(diffInMinutes);
    }
  }, [lastPunch, currentTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date(Date.now() + timeOffset));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeOffset]);

  const form = useForm<AttendanceFormData>({
    defaultValues: {
      employeeId: 1,
      punchTime: new Date().toISOString(),
      punchType: "In",
      deviceId: "WEB",
      longitude: null,
      latitude: null,
    },
  });

  useEffect(() => {
    setIsGettingLocation(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
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
          });
        },
        { timeout: 10000 }
      );
    } else {
      setIsGettingLocation(false);
    }
  }, [form, toast]);

  useEffect(() => {
    form.setValue("punchTime", currentTime.toISOString());
  }, [currentTime, form]);

  const createMutation = useMutation({
    mutationFn: async (data: AttendanceFormData) => {
      const response = await TimeAPI.getServerTime();
      if (response.status === "error") {
        throw response.error;
      }

      const payload = {
        ...data,
        punchTime: response.data.dateTime,
      };

      const marcacionResponse = await MarcacionesAPI.create(payload as any);

      if (marcacionResponse.status === "error") {
        throw marcacionResponse.error;
      }

      return marcacionResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      refetchLastPunch();
      toast({
        title: "Marcación registrada exitosamente",
        description: "Su registro de asistencia ha sido guardado correctamente.",
      });
      onSuccess?.();
    },
    onError: (error: ApiError) => {
      const errorMessage = handleApiError(
        error,
        "Error al registrar marcación. Por favor, intente nuevamente."
      );

      toast({
        title: "Error al registrar marcación",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AttendanceFormData) => {
    if (timeSinceLastPunch < 5 && lastPunch) {
      toast({
        title: "Tiempo insuficiente entre marcaciones",
        description: `Deben pasar al menos 5 minutos entre marcaciones. Su última marcación fue hace ${timeSinceLastPunch} minutos.`,
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(data);
  };

  const isLoading = createMutation.isPending;
  const isWithinCooldown = timeSinceLastPunch < 5 && lastPunch;

  const handleQuickPunch = async (punchType: "In" | "Out") => {
    if (isWithinCooldown) {
      toast({
        title: "Tiempo insuficiente entre marcaciones",
        description: `Deben pasar al menos 5 minutos entre marcaciones. Su última marcación fue hace ${timeSinceLastPunch} minutos.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await TimeAPI.getServerTime();
      if (response.status === "error") {
        throw new Error(response.error.message);
      }

      const serverTime = response.data.dateTime;
      const formData = form.getValues();

      const data: AttendanceFormData = {
        employeeId: formData.employeeId,
        punchTime: serverTime,
        punchType,
        deviceId: formData.deviceId || "WEB",
        latitude: currentLocation?.latitude ?? formData.latitude ?? null,
        longitude: currentLocation?.longitude ?? formData.longitude ?? null,
      };

      createMutation.mutate(data);
    } catch (error) {
      console.error("Error obteniendo hora del servidor:", error);
      toast({
        title: "Error al obtener hora del servidor",
        description: "Por favor, intente nuevamente",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={syncServerTime}
          disabled={isSyncingTime}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingTime ? "animate-spin" : ""}`} />
          {isSyncingTime ? "Sincronizando..." : "Sincronizar Hora"}
        </Button>
      </div>

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
            <div className="bg-background p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Usuario: Admin Usuario</p>
              <p className="text-xs text-muted-foreground">
                {currentTime.toLocaleString("es-EC", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
                <span className="ml-2 text-success">(Hora del servidor)</span>
              </p>

              {isGettingLocation ? (
                <p className="text-xs text-muted-foreground mt-2">Obteniendo ubicación...</p>
              ) : currentLocation ? (
                <p className="text-xs text-muted-foreground mt-2">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Ubicación detectada
                </p>
              ) : (
                <p className="text-xs text-warning mt-2">Ubicación no disponible</p>
              )}

              {lastPunch && (
                <div className="mt-3 p-2 bg-primary/10 rounded-md">
                  <p className="text-xs text-primary">
                    Última marcación: {new Date(lastPunch.punchTime).toLocaleString("es-EC")} (
                    {lastPunch.punchType === "In" ? "Entrada" : "Salida"})
                  </p>
                  <p className="text-xs text-primary">Hace {timeSinceLastPunch} minutos</p>
                </div>
              )}
            </div>

            {isWithinCooldown && (
              <div className="p-3 bg-amber-100 border border-amber-300 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-warning mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Debe esperar al menos 5 minutos entre marcaciones. Podrá registrar nuevamente en{" "}
                  {5 - timeSinceLastPunch} minutos.
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                className="flex-1 max-w-32 bg-success hover:bg-green-700 h-16 flex flex-col"
                onClick={() => handleQuickPunch("In")}
                disabled={isLoading || isGettingLocation || Boolean(isWithinCooldown)}
                data-testid="button-quick-in"
              >
                <Timer className="h-6 w-6 mb-1" />
                ENTRADA
              </Button>
              <Button
                size="lg"
                className="flex-1 max-w-32 bg-destructive hover:bg-red-700 h-16 flex flex-col"
                onClick={() => handleQuickPunch("Out")}
                disabled={isLoading || isGettingLocation || Boolean(isWithinCooldown)}
                data-testid="button-quick-out"
              >
                <Timer className="h-6 w-6 mb-1" />
                SALIDA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <div className="md:col-span-2 bg-background p-3 rounded">
                  <p className="text-sm font-medium text-foreground">Usuario: Admin Usuario</p>
                  <p className="text-xs text-muted-foreground">Solo puede registrar sus propias marcaciones</p>
                </div>

                <FormField
                  control={form.control}
                  name="punchType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Marcación *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "In"}>
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

                <FormItem>
                  <FormLabel>Fecha y Hora *</FormLabel>
                  <div className="flex items-center p-2 border rounded-md bg-background">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {currentTime.toLocaleString("es-EC", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
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
                        <Input placeholder="WEB" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {currentLocation && (
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-primary">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Ubicación detectada</span>
                  </div>
                  <p className="text-sm text-primary mt-1">
                    Lat: {currentLocation.latitude.toFixed(6)}, Lng: {currentLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {isWithinCooldown && (
                <div className="p-3 bg-amber-100 border border-amber-300 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-warning mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Debe esperar al menos 5 minutos entre marcaciones. Podrá registrar nuevamente en{" "}
                    {5 - timeSinceLastPunch} minutos.
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
                  disabled={isLoading || isGettingLocation || Boolean(isWithinCooldown)}
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