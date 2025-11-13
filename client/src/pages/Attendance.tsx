import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Timer, Clock, MapPin, Filter, AlertCircle, CheckCircle, Calendar, Search, RefreshCw, Info } from "lucide-react";
import type { AttendancePunch, InsertAttendancePunch } from "@shared/schema";
import type { ApiResponse } from "@/lib/api";
import { MarcacionesAPI, MarcacionesEspecializadasAPI, handleApiError, TimeAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// =========================
// Utilidades y constantes
// =========================
const PUNCH_TYPES = {
  In: { label: "Entrada", className: "bg-green-100 text-green-800 border-green-200" },
  Out: { label: "Salida", className: "bg-red-100 text-red-800 border-red-200" },
} as const;

type PunchKind = keyof typeof PUNCH_TYPES;

const nf = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 4 });

// =========================
// Modal de consulta por rango
// =========================
function RangeQueryModal({ employeeId }: { employeeId: number }) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [queryResults, setQueryResults] = useState<AttendancePunch[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleQuery = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Fechas requeridas", description: "Por favor, seleccione ambas fechas.", variant: "destructive" });
      return;
    }

    setIsQuerying(true);
    try {
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);

      const response = await MarcacionesEspecializadasAPI.getPunchesByEmployeeAndDateRange(
        employeeId,
        new Date(startDate).toISOString(),
        adjustedEndDate.toISOString()
      );

      if (response.status === "error") throw new Error(response.error.message);

      const rows = Array.isArray(response.data) ? response.data : [];
      setQueryResults(rows);

      toast({ title: "Consulta completada", description: `Se encontraron ${rows.length} marcaciones.` });
    } catch (error) {
      console.error("Error en consulta por rango:", error);
      toast({ title: "Error en consulta", description: "No se pudieron obtener las marcaciones.", variant: "destructive" });
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" aria-label="Consultar por fechas" title="Consultar por fechas">
          <Search className="h-4 w-4" /> Consultar por Fechas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consultar Marcaciones por Rango</DialogTitle>
          <DialogDescription>Seleccione un rango para listar todas sus marcaciones.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Fecha de inicio</Label>
            <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate || new Date().toISOString().split("T")[0]} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Fecha de fin</Label>
            <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} max={new Date().toISOString().split("T")[0]} />
          </div>
        </div>

        <Button onClick={handleQuery} disabled={isQuerying || !startDate || !endDate} className="w-full">
          {isQuerying ? "Buscando..." : "Buscar Marcaciones"}
        </Button>

        {/* Resultados responsivos */}
        {queryResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Resultados: {queryResults.length} marcaciones</h3>

            {/* Tabla en md+ */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
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
                    <tr key={punch.punchId ?? `${punch.punchTime}-${punch.deviceId}`}>
                      <td className="px-4 py-3">{format(new Date(punch.punchTime), "dd/MM/yyyy HH:mm:ss")}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${PUNCH_TYPES[punch.punchType as PunchKind]?.className ?? "bg-gray-100 text-gray-800"} border`}>
                          {PUNCH_TYPES[punch.punchType as PunchKind]?.label ?? punch.punchType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{punch.deviceId || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Lista en mobile */}
            <div className="md:hidden space-y-3">
              {queryResults.map((punch) => (
                <div key={punch.punchId ?? `${punch.punchTime}-${punch.deviceId}`} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{format(new Date(punch.punchTime), "dd/MM/yyyy HH:mm:ss")}</div>
                    <Badge className={`${PUNCH_TYPES[punch.punchType as PunchKind]?.className ?? "bg-gray-100 text-gray-800"} border`}>
                      {PUNCH_TYPES[punch.punchType as PunchKind]?.label ?? punch.punchType}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Dispositivo: {punch.deviceId || "-"}</div>
                </div>
              ))}
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

// =========================
// Estado de conexión de API
// =========================
function ConnectionStatus({ isOnline, isLoading, lastSync }: { isOnline: boolean; isLoading: boolean; lastSync?: Date | null }) {
  if (isLoading) {
    return (
      <div className="flex items-center text-amber-600" aria-live="polite">
        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        <span className="text-xs">Verificando...</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center ${isOnline ? "text-green-600" : "text-red-600"}`} title={lastSync ? `Última sync: ${format(lastSync, "HH:mm:ss")}` : undefined}>
      <div className={`h-2 w-2 rounded-full mr-1 ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
      <span className="text-xs">{isOnline ? "Conectado" : "Sin conexión"}</span>
    </div>
  );
}

// =========================
// Página principal
// =========================
export default function AttendancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isLoading: isAuthLoading, isAuthenticated, employeeDetails } = useAuth();
  const employeeId = employeeDetails?.employeeID;

  // Estado de API y hora del servidor (drift)
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [serverNow, setServerNow] = useState<Date | null>(null);
  const [serverDriftMs, setServerDriftMs] = useState<number>(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<string>("all");
  const [lastPunch, setLastPunch] = useState<AttendancePunch | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Sincroniza hora del servidor cada 60s y calcula drift
  useEffect(() => {
    const syncServerTime = async () => {
      try {
        setApiStatus('checking');
        const res = await TimeAPI.getServerTime();
        if (res.status === 'success') {
          const server = new Date(res.data.dateTime);
          setServerNow(server);
          setServerDriftMs(server.getTime() - Date.now());
          setApiStatus('online');
          setLastSync(new Date());
        } else {
          setApiStatus('offline');
        }
      } catch (e) {
        console.error('Error checking API status:', e);
        setApiStatus('offline');
      }
    };
    syncServerTime();
    const i = setInterval(syncServerTime, 60_000);
    return () => clearInterval(i);
  }, []);

  // Ticker local de hora del servidor
  useEffect(() => {
    if (!serverNow) return;
    const i = setInterval(() => {
      setCurrentTime(new Date(Date.now() + serverDriftMs));
    }, 1000);
    return () => clearInterval(i);
  }, [serverNow, serverDriftMs]);

  // ========= React Query =========
  const TODAY_KEY = format(new Date(), 'yyyy-MM-dd');

  const { data: lastPunchData, refetch: refetchLastPunch } = useQuery({
    queryKey: ['lastPunch', employeeId],
    queryFn: async () => {
      const response = await MarcacionesEspecializadasAPI.getLastPunch(employeeId as number);
      if (response.status === 'error') throw new Error(response.error.message);
      return response.data as AttendancePunch | null;
    },
    enabled: !!employeeId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: 30_000,
  });

  const { data: todaysPunches = [], isLoading, error, refetch } = useQuery<AttendancePunch[]>({
    queryKey: ['/api/v1/rh/attendance/punches', employeeId, TODAY_KEY],
    queryFn: async () => {
      const response = await MarcacionesAPI.list();
      if (response.status === 'error') throw response.error;
      const rows = Array.isArray(response.data) ? response.data : [];
      return rows
        .filter((p: AttendancePunch) => p.employeeId === employeeId && isToday(parseISO(String(p.punchTime))))
        .sort((a: AttendancePunch, b: AttendancePunch) => +new Date(a.punchTime) - +new Date(b.punchTime));
    },
    enabled: !!employeeId,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: 'always',
  });

  // Última marcación cacheada en estado local
  useEffect(() => {
    if (lastPunchData) setLastPunch(lastPunchData);
  }, [lastPunchData]);

  // Derivados memoizados
  const lastPunchToday = useMemo(() => {
    if (!lastPunch) return null;
    const d = new Date(lastPunch.punchTime);
    return isSameDay(d, new Date()) ? lastPunch : null;
  }, [lastPunch]);

  const timeSinceLastPunch = useMemo(() => {
    if (!lastPunchToday) return 0;
    return Math.floor((currentTime.getTime() - new Date(lastPunchToday.punchTime).getTime()) / 60000);
  }, [currentTime, lastPunchToday]);

  const nextPunchType = useMemo<PunchKind>(() => {
    if (!lastPunchToday) return "In";
    return (lastPunchToday.punchType as PunchKind) === "In" ? "Out" : "In";
  }, [lastPunchToday]);

  const filteredPunches = useMemo(() => {
    if (filterType === "all") return todaysPunches;
    return todaysPunches.filter((p) => p.punchType === filterType);
  }, [todaysPunches, filterType]);

  const isWithinCooldown = lastPunchToday ? timeSinceLastPunch < 5 : false;
  const canPunch = !isWithinCooldown && !isGettingLocation && apiStatus !== 'offline';

  // Geolocalización bajo demanda
  const ensureLocation = useCallback(async (): Promise<{ lat: number; lon: number } | null> => {
    if (!navigator.geolocation) return null;
    setIsGettingLocation(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsGettingLocation(false);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          setIsGettingLocation(false);
          resolve(null);
        },
        { timeout: 10_000, enableHighAccuracy: true, maximumAge: 300_000 }
      );
    });
  }, []);

  // Mutación con optimistic update
  const createPunchMutation = useMutation({
    mutationFn: async (punchType: PunchKind) => {
      const timeResponse = await TimeAPI.getServerTime();
      if (timeResponse.status === 'error') throw new Error(timeResponse.error.message);

      const formatLocalDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      const serverTime = new Date(timeResponse.data.dateTime);
      const punchData: InsertAttendancePunch = {
        employeeId: employeeId as number,
        punchTime: formatLocalDateTime(serverTime),
        punchType,
        deviceId: "WEB",
        latitude: currentLocation?.latitude || 0,
        longitude: currentLocation?.longitude || 0,
      } as InsertAttendancePunch;

      const response = await MarcacionesAPI.create(punchData);
      if (response.status === 'error') throw response.error;
      return response.data;
    },
    onMutate: async (punchType) => {
      await queryClient.cancelQueries({ queryKey: ['/api/v1/rh/attendance/punches', employeeId, TODAY_KEY] });
      const prev = queryClient.getQueryData<AttendancePunch[]>(['/api/v1/rh/attendance/punches', employeeId, TODAY_KEY]) || [];

      const optimistic: AttendancePunch = {
        punchId: `temp-${Date.now()}` as any,
        employeeId: employeeId as number,
        punchTime: format(new Date(Date.now() + serverDriftMs), "yyyy-MM-dd'T'HH:mm:ss"),
        punchType: punchType as any,
        deviceId: "WEB",
        latitude: currentLocation?.latitude || 0,
        longitude: currentLocation?.longitude || 0,
      };

      queryClient.setQueryData(['/api/v1/rh/attendance/punches', employeeId, TODAY_KEY], [...prev, optimistic]);
      return { prev } as const;
    },
    onError: (error: any, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['/api/v1/rh/attendance/punches', employeeId, TODAY_KEY], ctx.prev);

      let errorMessage = "Error al registrar marcación. Por favor, intente nuevamente.";
      if (error?.code === 400 && error.details?.errors) {
        const validationErrors = error.details.errors;
        const messages = Object.entries(validationErrors).map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`);
        errorMessage = `Errores de validación: ${messages.join('; ')}`;
      } else if (error?.details?.message) {
        errorMessage = error.details.message;
      } else if (error?.details?.error) {
        errorMessage = error.details.error;
      } else if (typeof error?.details === 'string') {
        errorMessage = error.details;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({ title: "Error al registrar marcación", description: errorMessage, variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/rh/attendance/punches', employeeId, TODAY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['lastPunch', employeeId] });
      toast({ title: "Marcación registrada", description: `Su ${nextPunchType === 'In' ? 'entrada' : 'salida'} ha sido registrada correctamente.`, action: <CheckCircle className="h-5 w-5 text-green-500" /> });
    },
  });

  const handlePunch = useCallback(async () => {
    if (apiStatus === 'offline') {
      toast({ title: "Error de conexión", description: "No hay conexión con el servidor.", variant: "destructive" });
      return;
    }
    if (isWithinCooldown) {
      toast({ title: "Tiempo insuficiente", description: `Deben pasar al menos 5 minutos. Última hace ${timeSinceLastPunch} min.`, variant: "destructive" });
      return;
    }
    const loc = await ensureLocation();
    setCurrentLocation(loc ? { latitude: loc.lat, longitude: loc.lon } : null);
    createPunchMutation.mutate(nextPunchType);
  }, [apiStatus, ensureLocation, isWithinCooldown, timeSinceLastPunch, nextPunchType, createPunchMutation]);

  const handleRetry = () => {
    refetch();
    refetchLastPunch();
  };

  // ============ Estados de autenticación ==========
  if (isAuthLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2"><Timer className="h-5 w-5" /><span>Cargando sesión...</span></div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !employeeId) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2"><Info className="h-5 w-5" />Sesión requerida</CardTitle>
            <CardDescription>No se pudo determinar su identificador de empleado.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 text-sm">Inicie sesión nuevamente o verifique que su cuenta tenga detalles de empleado asociados.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =============== Loader de datos ===============
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5" /> Registrar Marcación</CardTitle>
            <CardDescription>Preparando interfaz...</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-28 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="bg-gray-50 py-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // =============== Error de carga ===============
  if (error) {
    const errorMessage = handleApiError(error, "Error al cargar los registros de asistencia. Intente nuevamente.");
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2"><AlertCircle className="h-5 w-5" />Error de conexión</CardTitle>
            <CardDescription>No se pudieron cargar los datos de asistencia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700 text-sm">{errorMessage}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRetry} className="bg-red-600 hover:bg-red-700"><RefreshCw className="h-4 w-4 mr-2" />Reintentar</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>Recargar página</Button>
            </div>
            <div className="text-sm text-gray-700">
              <p>Si el problema persiste, verifique:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
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

  // =============== Render principal (responsive) ===============
  const formattedDate = format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const nextPunchLabel = nextPunchType === 'In' ? 'Registrar Entrada' : 'Registrar Salida';
  const nextPunchColor = nextPunchType === 'In' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
      {/* Header responsivo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mi Control de Asistencia</h1>
          <div className="flex items-center text-gray-600 mt-1 sm:mt-2">
            <span className="text-sm sm:text-base">{formattedDate}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ConnectionStatus isOnline={apiStatus === 'online'} isLoading={apiStatus === 'checking'} lastSync={lastSync} />
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filtrar por tipo de marcación"
            >
              <option value="all">Todas</option>
              <option value="In">Solo entradas</option>
              <option value="Out">Solo salidas</option>
            </select>
          </div>
          <RangeQueryModal employeeId={employeeId} />
          <Button variant="outline" size="icon" onClick={handleRetry} title="Actualizar datos" aria-label="Actualizar datos">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tarjeta de marcación rápida */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5" /> Registrar Marcación</CardTitle>
          <CardDescription>Haga clic para registrar su {nextPunchType === 'In' ? 'entrada' : 'salida'} con hora del servidor.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Hora actual del servidor</p>
                <p className="text-xl sm:text-2xl font-semibold">{format(currentTime, 'HH:mm:ss')}</p>
              </div>
              <div className="text-left sm:text-right">
                {isGettingLocation ? (
                  <p className="text-xs text-gray-500">Obteniendo ubicación...</p>
                ) : currentLocation ? (
                  <p className="text-xs text-gray-500 flex items-center justify-start sm:justify-end"><MapPin className="h-3 w-3 mr-1" />Ubicación detectada</p>
                ) : (
                  <p className="text-xs text-yellow-600">Ubicación no disponible (se solicitará al registrar)</p>
                )}
                {lastPunchToday && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md text-xs text-blue-700">
                    Última: {format(new Date(lastPunchToday.punchTime), 'HH:mm:ss')} ({PUNCH_TYPES[lastPunchToday.punchType as PunchKind]?.label ?? lastPunchToday.punchType}) · Hace {timeSinceLastPunch} min
                  </div>
                )}
                {apiStatus === 'offline' && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-md flex items-start text-xs text-red-800">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />Sin conexión con el servidor.
                  </div>
                )}
                {isWithinCooldown && (
                  <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded-md flex items-start text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />Debe esperar {5 - timeSinceLastPunch} min para volver a marcar.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              className={`${nextPunchColor} min-w-[220px] h-14 text-lg`}
              onClick={handlePunch}
              disabled={!canPunch || createPunchMutation.isPending}
              aria-label={nextPunchLabel}
            >
              {createPunchMutation.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Procesando...
                </>
              ) : (
                <>
                  <Timer className="h-5 w-5 mr-2" /> {nextPunchLabel}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de marcaciones del día (responsive) */}
      <Card>
        <CardHeader className="bg-gray-50 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Mis Marcaciones de Hoy</CardTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 w-fit">Total: {filteredPunches.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPunches.length === 0 ? (
            <div className="text-center p-10">
              <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin marcaciones hoy</h3>
              <p className="text-gray-600">Use el botón de arriba para registrar su marcación.</p>
            </div>
          ) : (
            <>
              {/* Tabla para md+ */}
              <div className="hidden md:block overflow-x-auto">
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
                      <tr key={punch.punchId ?? `${punch.punchTime}-${punch.deviceId}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900"><Clock className="h-4 w-4 mr-1 text-gray-400" />{format(new Date(punch.punchTime), 'HH:mm:ss')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`${PUNCH_TYPES[punch.punchType as PunchKind]?.className ?? 'bg-gray-100 text-gray-800'} border`}>
                            {PUNCH_TYPES[punch.punchType as PunchKind]?.label ?? punch.punchType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{punch.deviceId || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {punch.latitude && punch.longitude ? (
                            <div className="flex items-center"><MapPin className="h-4 w-4 mr-1 text-gray-400" /><span>{nf.format(Number(punch.latitude))}, {nf.format(Number(punch.longitude))}</span></div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>) )}
                  </tbody>
                </table>
              </div>

              {/* Lista para mobile */}
              <div className="md:hidden divide-y">
                {filteredPunches.map((punch) => (
                  <div key={punch.punchId ?? `${punch.punchTime}-${punch.deviceId}`} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-900"><Clock className="h-4 w-4 mr-1 text-gray-400" />{format(new Date(punch.punchTime), 'HH:mm:ss')}</div>
                      <Badge className={`${PUNCH_TYPES[punch.punchType as PunchKind]?.className ?? 'bg-gray-100 text-gray-800'} border`}>
                        {PUNCH_TYPES[punch.punchType as PunchKind]?.label ?? punch.punchType}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div><span className="font-medium">Dispositivo:</span> {punch.deviceId || '-'}</div>
                      <div>
                        <span className="font-medium">Ubicación:</span> {punch.latitude && punch.longitude ? `${nf.format(Number(punch.latitude))}, ${nf.format(Number(punch.longitude))}` : '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
