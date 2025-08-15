import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertAttendancePunchSchema, type InsertAttendancePunch } from "@shared/schema";
import { Timer, Save, X, MapPin } from "lucide-react";
import { useState, useEffect } from "react";

interface AttendanceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AttendanceForm({ onSuccess, onCancel }: AttendanceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const form = useForm<InsertAttendancePunch>({
    resolver: zodResolver(insertAttendancePunchSchema),
    defaultValues: {
      employeeId: 1, // Usuario actual fijo (admin)
      punchTime: new Date().toISOString(),
      punchType: "In",
      deviceId: "WEB",
      longitude: null,
      latitude: null
    }
  });

  useEffect(() => {
    // Obtener ubicación actual
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          form.setValue("latitude", position.coords.latitude);
          form.setValue("longitude", position.coords.longitude);
        },
        (error) => {
          console.log("Error obteniendo ubicación:", error);
        }
      );
    }
  }, [form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertAttendancePunch) => {
      const response = await fetch("/api/attendance/punches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Error al registrar marcación");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/my-punches"] });
      toast({ title: "Marcación registrada exitosamente" });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error al registrar marcación", variant: "destructive" });
    }
  });

  const onSubmit = (data: InsertAttendancePunch) => {
    createMutation.mutate(data);
  };

  const isLoading = createMutation.isPending;

  const handleQuickPunch = (punchType: "In" | "Out") => {
    const data: InsertAttendancePunch = {
      employeeId: 1, // Usuario actual
      punchTime: new Date().toISOString(),
      punchType,
      deviceId: "WEB",
      latitude: currentLocation?.latitude || null,
      longitude: currentLocation?.longitude || null
    };
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
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
                {new Date().toLocaleString('es-EC', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              {currentLocation && (
                <p className="text-xs text-gray-500 mt-2">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Ubicación detectada
                </p>
              )}
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg"
                className="flex-1 max-w-32 bg-green-600 hover:bg-green-700 h-16 flex flex-col"
                onClick={() => handleQuickPunch("In")}
                disabled={isLoading}
                data-testid="button-quick-in"
              >
                <Timer className="h-6 w-6 mb-1" />
                ENTRADA
              </Button>
              <Button 
                size="lg"
                className="flex-1 max-w-32 bg-red-600 hover:bg-red-700 h-16 flex flex-col"
                onClick={() => handleQuickPunch("Out")}
                disabled={isLoading}
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
            Ajuste la hora o tipo de marcación si es necesario
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

                <FormField
                  control={form.control}
                  name="punchTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha y Hora *</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                          data-testid="input-punch-time"
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
                  disabled={isLoading}
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