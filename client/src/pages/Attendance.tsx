import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Clock, MapPin, Filter, AlertCircle, CheckCircle, Calendar, Search, RefreshCw } from "lucide-react";
import type { AttendancePunch, InsertAttendancePunch } from "@shared/schema";
import type { ApiResponse } from "@/lib/api";
import { useState, useEffect } from "react";
import { format, isToday, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { MarcacionesAPI, MarcacionesEspecializadasAPI, handleApiError, TimeAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { useAuth } from '@/contexts/AuthContext';

//  const { employeeDetails, user } = useAuth();

const punchTypeLabels: Record<string, string> = {
  "In": "Entrada",
  "Out": "Salida"
};

const punchTypeColors: Record<string, string> = {
  "In": "bg-green-100 text-green-800 border-green-200",
  "Out": "bg-red-100 text-red-800 border-red-200"
};

// Simulación de usuario logueado (deberías reemplazar esto con tu sistema de autenticación real)
const CURRENT_USER_ID = 1;

// Componente para consulta por rango de fechas
function RangeQueryModal() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [queryResults, setQueryResults] = useState<AttendancePunch[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleQuery = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Fechas requeridas",
        description: "Por favor, seleccione ambas fechas.",
        variant: "destructive"
      });
      return;
    }

    setIsQuerying(true);
    try {
      // Ajustar la fecha final para incluir todo el día
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      
      console.log("Consultando marcaciones por rango de fechas...");
      const response = await MarcacionesEspecializadasAPI.getPunchesByEmployeeAndDateRange(
        CURRENT_USER_ID,
        new Date(startDate).toISOString(),
        adjustedEndDate.toISOString()
      );
      
      console.log("Respuesta de API:", response);
      
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      
      setQueryResults(Array.isArray(response.data) ? response.data : []);
      
      toast({
        title: "Consulta completada",
        description: `Se encontraron ${response.data.length} marcaciones en el rango seleccionado.`,
      });
    } catch (error) {
      console.error("Error en consulta por rango:", error);
      toast({
        title: "Error en consulta",
        description: "No se pudieron obtener las marcaciones. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Consultar por Fechas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consultar Marcaciones por Rango de Fechas</DialogTitle>
          <DialogDescription>
            Seleccione un rango de fechas para consultar todas sus marcaciones.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Fecha de inicio</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end-date">Fecha de fin</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        
        <Button 
          onClick={handleQuery} 
          disabled={isQuerying || !startDate || !endDate}
          className="w-full"
        >
          {isQuerying ? "Buscando..." : "Buscar Marcaciones"}
        </Button>
        
        {queryResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">
              Resultados: {queryResults.length} marcaciones encontradas
            </h3>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha y Hora</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dispositivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {queryResults.map((punch) => (
                    <tr key={punch.punchId}>
                      <td className="px-4 py-3">
                        {format(new Date(punch.punchTime), "dd/MM/yyyy HH:mm:ss")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={punchTypeColors[punch.punchType]}>
                          {punchTypeLabels[punch.punchType]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{punch.deviceId || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {queryResults.length === 0 && startDate && endDate && !isQuerying && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No se encontraron marcaciones en el rango seleccionado.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Componente para mostrar el estado de conexión
function ConnectionStatus({ isOnline, isLoading }: { isOnline: boolean; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center text-amber-600">
        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        <span className="text-xs">Verificando conexión...</span>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
      <div className={`h-2 w-2 rounded-full mr-1 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-xs">{isOnline ? 'Conectado' : 'Sin conexión'}</span>
    </div>
  );
}

export default function AttendancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastPunch, setLastPunch] = useState<AttendancePunch | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  // Determinar el próximo tipo de marcación basado en la última del día actual
  const getNextPunchType = () => {
    // Si no hay última marcación o la última marcación no es del día actual, comenzar con "In"
    if (!lastPunch || !isSameDay(new Date(lastPunch.punchTime), new Date())) {
      return "In";
    }
    
    // Si la última marcación del día actual es "In", la próxima es "Out"
    return lastPunch.punchType === "In" ? "Out" : "In";
  };
  
  const nextPunchType = getNextPunchType();
  const nextPunchLabel = nextPunchType === "In" ? "Registrar Entrada" : "Registrar Salida";
  const nextPunchColor = nextPunchType === "In" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700";
  
  // Verificar estado de la API
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        setApiStatus('checking');
        const response = await TimeAPI.getServerTime();
        setApiStatus(response.status === 'success' ? 'online' : 'offline');
      } catch (error) {
        console.error("Error checking API status:", error);
        setApiStatus('offline');
      }
    };
    
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Verificar cada 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  // Obtener la última marcación del usuario
  const { data: lastPunchData, refetch: refetchLastPunch } = useQuery({
    queryKey: ['lastPunch', CURRENT_USER_ID],
    queryFn: async () => {
      try {
        console.log("Obteniendo última marcación...");
        const response = await MarcacionesEspecializadasAPI.getLastPunch(CURRENT_USER_ID);
        console.log("Respuesta última marcación:", response);
        
        if (response.status === 'error') {
          throw new Error(response.error.message);
        }
        return response.data;
      } catch (error) {
        console.error("Error fetching last punch:", error);
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  // Obtener marcaciones del usuario actual
  const { data: apiResponse, isLoading, error, refetch } = useQuery<ApiResponse<AttendancePunch[]>>({
    queryKey: ['/api/v1/rh/attendance/punches', CURRENT_USER_ID],
    queryFn: async () => {
      try {
        console.log("Obteniendo marcaciones...");
        const response = await MarcacionesAPI.list();
        console.log("Respuesta marcaciones:", response);

 
        
        if (response.status === 'error') {
          throw response.error;
        }
        
        // Filtrar solo las marcaciones del usuario actual y del día actual
        const userPunches = Array.isArray(response.data) 
          ? response.data.filter(punch => 
              punch.employeeId === CURRENT_USER_ID && 
              isToday(parseISO(punch.punchTime.toString()))
            )
          : [];
        
        return { status: 'success', data: userPunches } as ApiResponse<AttendancePunch[]>;
      } catch (error) {
        console.error("Error en query de marcaciones:", error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Obtener ubicación actual
  useEffect(() => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setIsGettingLocation(false);
        },
        (error) => {
          console.log("Error obteniendo ubicación:", error);
          setIsGettingLocation(false);
        },
        { 
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 300000 // 5 minutos
        }
      );
    } else {
      setIsGettingLocation(false);
    }
  }, []);

  // Actualizar última marcación
  useEffect(() => {
    if (lastPunchData) {
      setLastPunch(lastPunchData);
    }
  }, [lastPunchData]);

  // Actualizar hora actual cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mutación para crear una nueva marcación
  const createPunchMutation = useMutation({
    mutationFn: async (punchType: "In" | "Out") => {
      // Obtener la hora del servidor
      const timeResponse = await TimeAPI.getServerTime();
      console.log("timepo de servidor ", timeResponse);
      if (timeResponse.status === 'error') {
        throw new Error(timeResponse.error.message);
      }
          
      // Formatear la fecha en formato ISO sin información de zona horaria
      const formatLocalDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      // Usar la hora del servidor directamente
      const serverTime = new Date(timeResponse.data.dateTime);
      console.log("timepo de servidor2 ", serverTime, "tiempo a string: ",serverTime.toISOString());
      const punchData: InsertAttendancePunch = {
        employeeId: CURRENT_USER_ID,
        punchTime: formatLocalDateTime(serverTime),//.toISOString(),
        punchType,
        deviceId: "WEB",
        latitude: currentLocation?.latitude || 0,
        longitude: currentLocation?.longitude || 0
      };
      
      console.log("Enviando marcación:", punchData);
      const response = await MarcacionesAPI.create(punchData);
      console.log("Respuesta creación marcación:", response);
      
      if (response.status === 'error') {
        throw response.error;
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/rh/attendance/punches', CURRENT_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['lastPunch', CURRENT_USER_ID] });
      
      toast({
        title: "Marcación registrada",
        description: `Su ${nextPunchType === "In" ? "entrada" : "salida"} ha sido registrada correctamente.`,
        action: <CheckCircle className="h-5 w-5 text-green-500" />
      });
    },
    onError: (error: any) => {
      let errorMessage = "Error al registrar marcación. Por favor, intente nuevamente.";
      
      // Extraer mensajes de validación detallados del error 400
      if (error.code === 400 && error.details?.errors) {
        const validationErrors = error.details.errors;
        const messages = Object.entries(validationErrors).map(
          ([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`
        );
        errorMessage = `Errores de validación: ${messages.join('; ')}`;
      } else if (error.details?.message) {
        errorMessage = error.details.message;
      } else if (error.details?.error) {
        errorMessage = error.details.error;
      } else if (typeof error.details === 'string') {
        errorMessage = error.details;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: "Error al registrar marcación", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  // Extraer los datos del response y asegurar que sea un array
  const punches = apiResponse?.status === 'success' 
    ? (Array.isArray(apiResponse.data) ? apiResponse.data : []) 
    : [];

  // Filtrar marcas por tipo si es necesario
  const filteredPunches = filterType === "all" 
    ? punches 
    : punches.filter(punch => punch.punchType === filterType);

  // Obtener fecha actual formateada
  const formattedDate = format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  // Verificar si ha pasado el tiempo mínimo requerido entre marcaciones (5 minutos)
  const timeSinceLastPunch = lastPunch && isSameDay(new Date(lastPunch.punchTime), new Date())
    ? Math.floor((currentTime.getTime() - new Date(lastPunch.punchTime).getTime()) / 60000)
    : 0;
  
  const isWithinCooldown = timeSinceLastPunch < 5 && lastPunch && isSameDay(new Date(lastPunch.punchTime), new Date());
  const canPunch = !isWithinCooldown && !isGettingLocation && !createPunchMutation.isPending;

  const handlePunch = () => {
    if (apiStatus === 'offline') {
      toast({
        title: "Error de conexión",
        description: "No hay conexión con el servidor. Verifique su conexión e intente nuevamente.",
        variant: "destructive"
      });
      return;
    }
    
    if (isWithinCooldown) {
      toast({
        title: "Tiempo insuficiente entre marcaciones",
        description: `Deben pasar al menos 5 minutos entre marcaciones. Su última marcación fue hace ${timeSinceLastPunch} minutos.`,
        variant: "destructive"
      });
      return;
    }
    
    createPunchMutation.mutate(nextPunchType);
  };

  const handleRetry = () => {
    refetch();
    refetchLastPunch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = handleApiError(error, "Error al cargar los registros de asistencia. Intente nuevamente.");
    
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error de conexión
            </CardTitle>
            <CardDescription>
              No se pudieron cargar los datos de asistencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-600">{errorMessage}</p>
            <div className="flex space-x-2">
              <Button 
                onClick={handleRetry}
                className="bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Recargar página
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              <p>Si el problema persiste, verifique:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>Su conexión a internet</li>
                <li>Que el servidor esté ejecutándose</li>
                <li>La configuración de la API</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Control de Asistencia</h1>
          <div className="flex items-center text-gray-600 mt-2">
            <span>{formattedDate}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <ConnectionStatus 
            isOnline={apiStatus === 'online'} 
            isLoading={apiStatus === 'checking'} 
          />
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las marcas</option>
              <option value="In">Solo entradas</option>
              <option value="Out">Solo salidas</option>
            </select>
          </div>
          
          <RangeQueryModal />
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRetry}
            title="Actualizar datos"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tarjeta de marcación rápida */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Timer className="h-5 w-5 mr-2" />
            Registrar Marcación
          </CardTitle>
          <CardDescription>
            Haga clic en el botón para registrar su {nextPunchType === "In" ? "entrada" : "salida"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Hora actual del servidor</p>
                <p className="text-lg font-semibold">
                  {format(currentTime, "HH:mm:ss")}
                </p>
              </div>
              
              <div className="text-right">
                {isGettingLocation ? (
                  <p className="text-xs text-gray-500">Obteniendo ubicación...</p>
                ) : currentLocation ? (
                  <p className="text-xs text-gray-500">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Ubicación detectada
                  </p>
                ) : (
                  <p className="text-xs text-yellow-500">Ubicación no disponible</p>
                )}
              </div>
            </div>
            
            {/* Información de la última marcación */}
            {lastPunch && isSameDay(new Date(lastPunch.punchTime), new Date()) && (
              <div className="mt-3 p-2 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-700">
                  Última marcación: {format(new Date(lastPunch.punchTime), "HH:mm:ss")} ({punchTypeLabels[lastPunch.punchType]})
                </p>
                <p className="text-xs text-blue-700">
                  Hace {timeSinceLastPunch} minutos
                </p>
              </div>
            )}
            
            {/* Advertencia si el tiempo entre marcaciones es insuficiente */}
            {isWithinCooldown && (
              <div className="mt-3 p-2 bg-amber-100 border border-amber-300 rounded-md flex items-start">
                <AlertCircle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Debe esperar al menos 5 minutos entre marcaciones. Podrá registrar nuevamente en {5 - timeSinceLastPunch} minutos.
                </p>
              </div>
            )}

            {/* Advertencia si no hay conexión */}
            {apiStatus === 'offline' && (
              <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-md flex items-start">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">
                  Sin conexión con el servidor. No se pueden registrar marcaciones.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            <Button 
              size="lg"
              className={`${nextPunchColor} min-w-[200px] h-14 text-lg`}
              onClick={handlePunch}
              disabled={!canPunch || apiStatus === 'offline' || createPunchMutation.isPending}
            >
              {createPunchMutation.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Timer className="h-5 w-5 mr-2" />
                  {nextPunchLabel}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de marcaciones del día */}
      <Card>
        <CardHeader className="bg-gray-50 py-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Mis Marcaciones de Hoy</CardTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Total: {filteredPunches.length} marcaciones
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {filteredPunches.length === 0 ? (
            <div className="text-center p-8">
              <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay marcaciones registradas hoy
              </h3>
              <p className="text-gray-600">
                Registre su primera marcación del día usando el botón arriba
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Hora</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Dispositivo</th>
                    <th className="px-6 py-3">Ubicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPunches.map((punch) => (
                    <tr key={punch.punchId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="h-4 w-4 mr-1 text-gray-400" />
                          {format(new Date(punch.punchTime), "HH:mm:ss")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          className={`${punchTypeColors[punch.punchType] || "bg-gray-100 text-gray-800"} border`}
                        >
                          {punchTypeLabels[punch.punchType] || punch.punchType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {punch.deviceId || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(punch.latitude && punch.longitude) ? (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                            <span>
                              {Number(punch.latitude).toFixed(4)}, {Number(punch.longitude).toFixed(4)}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}