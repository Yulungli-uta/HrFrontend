import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertAttendancePunchSchema, type InsertAttendancePunch, type Employee, type Person } from "@shared/schema";
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

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const { data: people } = useQuery<Person[]>({
    queryKey: ['/api/people'],
  });

  const form = useForm<InsertAttendancePunch>({
    resolver: zodResolver(insertAttendancePunchSchema),
    defaultValues: {
      employeeId: 0,
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
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/punches"] });
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

  const handleQuickPunch = (employeeId: number, punchType: "In" | "Out") => {
    const data: InsertAttendancePunch = {
      employeeId,
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
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Marcación Rápida</span>
          </CardTitle>
          <CardDescription>
            Registre entrada o salida de empleados con un solo clic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees?.slice(0, 6).map((employee) => {
              const person = people?.find(p => p.id === employee.id);
              return (
                <Card key={employee.id} className="p-4">
                  <div className="text-center space-y-3">
                    <h4 className="font-medium">
                      {person ? `${person.firstName} ${person.lastName}` : `Empleado #${employee.id}`}
                    </h4>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleQuickPunch(employee.id, "In")}
                        disabled={isLoading}
                        data-testid={`button-in-${employee.id}`}
                      >
                        Entrada
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                        onClick={() => handleQuickPunch(employee.id, "Out")}
                        disabled={isLoading}
                        data-testid={`button-out-${employee.id}`}
                      >
                        Salida
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Formulario Detallado */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Registrar Marcación</span>
          </CardTitle>
          <CardDescription>
            Complete los detalles para registrar una marcación específica
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
                  name="punchType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Marcación *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          data-testid="input-punchTime"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dispositivo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="WEB"
                          data-testid="input-deviceId"
                          {...field}
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

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1"
                  data-testid="button-save-punch"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Registrando..." : "Registrar Marcación"}
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
    </div>
  );
}