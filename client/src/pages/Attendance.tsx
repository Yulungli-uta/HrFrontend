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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Timer, Clock, MapPin, Filter, AlertCircle, CheckCircle, Calendar, Search, RefreshCw, Info } from "lucide-react";
import type { AttendancePunch } from "@/shared/schema";
import { MarcacionesEspecializadasAPI, handleApiError, TimeAPI } from "@/lib/api";
import { useAuth } from "@/features/auth";
import { PunchTable } from "@/components/forms/PunchTable";
import { parseApiError } from "@/lib/error-handling";
import { getServerErrorMessage } from "@/lib/api/utils/error-handling";
import { logger } from "@/lib/logger";
import { todayEcuador } from "@/lib/clock";

// =========================
// Utilidades y constantes
// =========================
const PUNCH_TYPES = {
  In: { label: "Entrada", className: "bg-success/15 text-success border-success/30" },
  Out: { label: "Salida", className: "bg-destructive/15 text-destructive border-destructive/30" },
} as const;

type PunchKind = keyof typeof PUNCH_TYPES;

const nf = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 4 });

const SERVER_SYNC_INTERVAL_MS = 60_000;
const TODAY_PUNCHES_STALE_MS = 30_000;
const COOLDOWN_MINUTES = 5;

const getDeviceType = () => {
  const ua = navigator.userAgent || "";
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "WEB-TABLET";
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return "WEB-MOBILE";
  }
  return "WEB-DESKTOP";
};

const buildLocalDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/** Errores de conexión o de espera (se pueden reintentar); un 400, 403 o 409 no. */
const isTransientError = (error: unknown): boolean => {
  const e = error as { code?: number; message?: string } | null;
  const code = Number(e?.code);
  if (!Number.isFinite(code) || code === 0 || code === 408 || (code >= 502 && code <= 504)) return true;
  return /network|failed to fetch|timeout|tiempo de espera|abort|conexi/i.test(String(e?.message ?? ""));
};

const sortPunchesDesc = (rows: AttendancePunch[]) =>
  [...rows].sort(
    (a, b) =>
      +(b.punchTime ? new Date(b.punchTime) : new Date(0)) -
      +(a.punchTime ? new Date(a.punchTime) : new Date(0))
  );

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
      toast({
        title: "Fechas requeridas",
        description: "Por favor, seleccione ambas fechas.",
        variant: "destructive",
      });
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

      const rows = Array.isArray(response.data) ? sortPunchesDesc(response.data) : [];
      setQueryResults(rows);

      toast({
        title: "Consulta completada",
        description: `Se encontraron ${rows.length} marcaciones.`,
      });
    } catch (error) {
      logger.error("Attendance", "Error en consulta por rango:", error);
      toast({
        title: "Error en consulta",
        description: "No se pudieron obtener las marcaciones.",
        variant: "destructive",
      });
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
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || todayEcuador()}
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
              max={todayEcuador()}
            />
          </div>
        </div>

        <Button onClick={handleQuery} disabled={isQuerying || !startDate || !endDate} className="w-full">
          {isQuerying ? "Buscando..." : "Buscar Marcaciones"}
        </Button>

        {queryResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Resultados: {queryResults.length} marcaciones</h3>

            <div className="hidden md:block border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Fecha y Hora</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Dispositivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queryResults.map((punch) => (
                    <tr key={punch.id ?? `${punch.punchTime ?? "no-time"}-${punch.deviceId ?? "no-device"}`}>
                      <td className="px-4 py-3">{format(punch.punchTime ? new Date(punch.punchTime) : new Date(0), "dd/MM/yyyy HH:mm:ss")}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${PUNCH_TYPES[punch.punchType as PunchKind]?.className ?? "bg-muted text-foreground"} border`}>
                          {PUNCH_TYPES[punch.punchType as PunchKind]?.label ?? punch.punchType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{punch.deviceId || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {queryResults.map((punch) => (
                <div key={punch.id ?? `${punch.punchTime ?? "no-time"}-${punch.deviceId ?? "no-device"}`} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{format(punch.punchTime ? new Date(punch.punchTime) : new Date(0), "dd/MM/yyyy HH:mm:ss")}</div>
                    <Badge className={`${PUNCH_TYPES[punch.punchType as PunchKind]?.className ?? "bg-muted text-foreground"} border`}>
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
          <div className="text-center py-8 text-muted-foreground">
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
function ConnectionStatus({
  isOnline,
  isLoading,
  lastSync,
}: {
  isOnline: boolean;
  isLoading: boolean;
  lastSync?: Date | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center text-warning" aria-live="polite">
        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        <span className="text-xs">Verificando...</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center ${isOnline ? "text-success" : "text-destructive"}`}
      title={lastSync ? `Última sync: ${format(lastSync, "HH:mm:ss")}` : undefined}
    >
      <div className={`h-2 w-2 rounded-full mr-1 ${isOnline ? "bg-success" : "bg-destructive"}`} />
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

  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "checking">("checking");
  const [serverDriftMs, setServerDriftMs] = useState<number>(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<string>("all");
  // Fecha de Ecuador del día en curso: la clave cambia sola al pasar la medianoche aunque la pestaña quede abierta
  const todayKey = todayEcuador();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // =========================
  // Sincroniza hora del servidor
  // =========================
  useEffect(() => {
    let mounted = true;

    const syncServerTime = async () => {
      try {
        if (mounted) setApiStatus("checking");
        const res = await TimeAPI.getServerTime();

        if (!mounted) return;

        if (res.status === "success") {
          const server = new Date(res.data.dateTime);
          setServerDriftMs(server.getTime() - Date.now());
          setCurrentTime(server);
          setApiStatus("online");
          setLastSync(new Date());
        } else {
          setApiStatus("offline");
        }
      } catch (e) {
        logger.error("Attendance", "Error checking API status:", e);
        if (mounted) setApiStatus("offline");
      }
    };

    syncServerTime();
    const intervalId = setInterval(syncServerTime, SERVER_SYNC_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Ticker local basado en drift
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date(Date.now() + serverDriftMs));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [serverDriftMs]);

  // =========================
  // React Query
  // =========================
  const {
    data: todaysPunches = [],
    isLoading,
    error,
    refetch,
  } = useQuery<AttendancePunch[]>({
    queryKey: ["todayPunches", employeeId, todayKey],
    queryFn: async () => {
      const response = await MarcacionesEspecializadasAPI.getTodayPunches(employeeId as number);

      if (response.status === "error") {
        const msg = String(response.error?.message || "").toLowerCase();
        const details = String(response.error?.details || "").toLowerCase();
        const code = response.error?.code;

        const isEmptyTodayCase =
          code === 404 ||
          msg.includes("no se encontraron marcaciones para hoy") ||
          details.includes("no se encontraron marcaciones para hoy") ||
          msg.includes("no records") ||
          msg.includes("not found");

        if (isEmptyTodayCase) {
          return [];
        }

        throw response.error;
      }

      const rows = Array.isArray(response.data) ? response.data : [];
      return sortPunchesDesc(rows);
    },
    enabled: !!employeeId,
    staleTime: TODAY_PUNCHES_STALE_MS,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const lastPunchToday = useMemo(() => {
    if (!todaysPunches.length) return null;
    return todaysPunches[0] ?? null;
  }, [todaysPunches]);

  const timeSinceLastPunch = useMemo(() => {
    if (!lastPunchToday) return 0;
    return Math.floor((currentTime.getTime() - new Date(lastPunchToday.punchTime ?? 0).getTime()) / 60000);
  }, [currentTime, lastPunchToday]);

  const nextPunchType = useMemo<PunchKind>(() => {
    if (!lastPunchToday) return "In";
    return (lastPunchToday.punchType as PunchKind) === "In" ? "Out" : "In";
  }, [lastPunchToday]);

  const filteredPunches = useMemo(() => {
    if (filterType === "all") return todaysPunches;
    return todaysPunches.filter((p) => p.punchType === filterType);
  }, [todaysPunches, filterType]);

  const isWithinCooldown = !!lastPunchToday && timeSinceLastPunch < COOLDOWN_MINUTES;
  // La ubicación se pide en segundo plano: nunca debe impedir ni retrasar la marcación
  const canPunch = !isWithinCooldown && apiStatus !== "offline";

  // =========================
  // Geolocalización bajo demanda
  // =========================
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

  // =========================
  // Registro de la marcación
  // =========================
  // Aviso que NO desaparece solo: en un celular el toast se pierde y el usuario no sabe si quedó registrada.
  const [punchResult, setPunchResult] = useState<{ kind: "ok" | "error"; title: string; message: string } | null>(null);

  // Informa al servidor lo que ocurre en el dispositivo (CLICK, RETRY, SEND_FAILED...). Nunca debe afectar la marcación.
  const reportPunchEvent = useCallback(
    (event: "CLICK" | "RETRY" | "SEND_FAILED" | "HIDDEN_BEFORE_RESPONSE", detail?: string) => {
      try {
        void MarcacionesEspecializadasAPI.logClientEvent(event, detail).catch(() => undefined);
      } catch {
        /* la bitácora es opcional */
      }
    },
    []
  );

  const createPunchMutation = useMutation({
    mutationFn: async ({
      punchType,
      coords,
    }: {
      punchType: PunchKind;
      coords: { latitude: number; longitude: number };
    }) => {
      // Una sola petición al pulsar: la hora la define el servidor al recibirla, así que no hace falta consultarla antes.
      const punchData = {
        employeeId: employeeId as number,
        punchTime: buildLocalDateTime(new Date(Date.now() + serverDriftMs)),
        punchType,
        deviceId: getDeviceType(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      let response = await MarcacionesEspecializadasAPI.registerPunch(punchData);

      // Falla de conexión: un único reintento. Si el primer intento sí había llegado, el intervalo mínimo hace que el segundo
      // responda 409 y eso significa que la marcación ya existe.
      if (response.status === "error" && isTransientError(response.error)) {
        reportPunchEvent("RETRY", `${(response.error as { code?: number }).code ?? "?"}`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        response = await MarcacionesEspecializadasAPI.registerPunch(punchData);
        if (response.status === "error" && (response.error as { code?: number }).code === 409) {
          return { alreadyRegistered: true } as const;
        }
      }

      if (response.status === "error") throw response.error;
      return response.data;
    },

    onError: (error: unknown) => {
      const apiErr = parseApiError(error);
      // El mensaje del servidor (p. ej. "solo puedes picar dentro del campus") tiene prioridad sobre el genérico.
      let errorMessage = getServerErrorMessage(error) ?? apiErr.message;
      const errorCode = (error as { code?: number } | null)?.code;
      const forbidden = errorCode === 403 || errorCode === 409;

      if (apiErr.status === 400 && apiErr.details && apiErr.details.length > 0) {
        const messages = apiErr.details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message));
        errorMessage = `Errores de validación: ${messages.join("; ")}`;
      }

      reportPunchEvent("SEND_FAILED", `${errorCode ?? "?"} ${errorMessage}`);
      setPunchResult({
        kind: "error",
        title: forbidden ? "Marcación no permitida" : "No se pudo registrar la marcación",
        message: errorMessage,
      });
      toast({
        title: forbidden ? "Marcación no permitida" : "Error al registrar marcación",
        description: errorMessage,
        variant: "destructive",
      });
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["todayPunches", employeeId, todayKey] });
      const kind = nextPunchType === "In" ? "entrada" : "salida";
      const created = data as { punchTime?: string; punchId?: number; alreadyRegistered?: boolean } | undefined;
      const at = created?.punchTime ? format(new Date(created.punchTime), "HH:mm:ss") : null;
      const message = created?.alreadyRegistered
        ? `Su ${kind} ya estaba registrada. Revise "Mis Marcaciones de Hoy".`
        : `Su ${kind} quedó registrada${at ? ` a las ${at}` : ""}${created?.punchId ? ` (N.º ${created.punchId})` : ""}.`;
      setPunchResult({ kind: "ok", title: "Marcación registrada", message });
      toast({
        title: "Marcación registrada",
        description: message,
        action: <CheckCircle className="h-5 w-5 text-success" />,
      });
    },
  });

  // Si el usuario sale de la pantalla (bloquea el celular, cambia de app) mientras la petición sigue en curso, queda anotado.
  const isPunchPending = createPunchMutation.isPending;
  useEffect(() => {
    if (!isPunchPending) return;
    const onHidden = () => {
      if (document.visibilityState === "hidden") reportPunchEvent("HIDDEN_BEFORE_RESPONSE");
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [isPunchPending, reportPunchEvent]);

  const handlePunch = useCallback(async () => {
    // Lo primero: dejar constancia en el servidor de que el usuario pulsó, pase lo que pase después.
    reportPunchEvent(
      "CLICK",
      `${nextPunchType} | api=${apiStatus} | cooldown=${isWithinCooldown ? "si" : "no"} | visible=${document.visibilityState}`
    );

    if (apiStatus === "offline") {
      setPunchResult({ kind: "error", title: "Sin conexión", message: "No hay conexión con el servidor. Reintente en unos segundos." });
      toast({
        title: "Error de conexión",
        description: "No hay conexión con el servidor.",
        variant: "destructive",
      });
      return;
    }

    if (isWithinCooldown) {
      toast({
        title: "Tiempo insuficiente",
        description: `Deben pasar al menos ${COOLDOWN_MINUTES} minutos. Última hace ${timeSinceLastPunch} min.`,
        variant: "destructive",
      });
      return;
    }

    setPunchResult(null);

    // La marcación sale YA, con la última ubicación conocida (o 0, 0): la ubicación no se usa para validar y nunca debe
    // retrasarla. Si el usuario no responde el aviso de permiso, la marcación igualmente queda registrada.
    createPunchMutation.mutate({
      punchType: nextPunchType,
      coords: currentLocation ?? { latitude: 0, longitude: 0 },
    });

    // Después de enviar, y sin esperar, se pide la ubicación para la próxima marcación.
    void ensureLocation()
      .then((loc) => setCurrentLocation(loc ? { latitude: loc.lat, longitude: loc.lon } : null))
      .catch(() => undefined);
  }, [apiStatus, ensureLocation, isWithinCooldown, timeSinceLastPunch, nextPunchType, createPunchMutation, toast, currentLocation, reportPunchEvent]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // =========================
  // Estados de autenticación
  // =========================
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
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                <span>Cargando sesión...</span>
              </div>
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
        <Card className="border-warning/30 bg-warning/10">
          <CardHeader>
            <CardTitle className="text-warning flex items-center gap-2">
              <Info className="h-5 w-5" />
              Sesión requerida
            </CardTitle>
            <CardDescription>No se pudo determinar su identificador de empleado.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-warning text-sm">
              Inicie sesión nuevamente o verifique que su cuenta tenga detalles de empleado asociados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================
  // Loader de datos
  // =========================
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
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Registrar Marcación
            </CardTitle>
            <CardDescription>Preparando interfaz...</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-28 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-background py-3">
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

  // =========================
  // Error de carga real
  // =========================
  if (error) {
    const errorMessage = handleApiError(error as any, "Error al cargar los registros de asistencia. Intente nuevamente.");

    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error de conexión
            </CardTitle>
            <CardDescription>No se pudieron cargar los datos de asistencia</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-destructive text-sm">{errorMessage}</p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRetry} className="bg-destructive hover:bg-destructive/90">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Recargar página
              </Button>
            </div>

            <div className="text-sm text-foreground">
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

  // =========================
  // Render principal
  // =========================
  const formattedDate = format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const nextPunchLabel = nextPunchType === "In" ? "Registrar Entrada" : "Registrar Salida";
  const nextPunchColor = nextPunchType === "In" ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90";

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mi Control de Asistencia</h1>
          <div className="flex items-center text-muted-foreground mt-1 sm:mt-2">
            <span className="text-sm sm:text-base">{formattedDate}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ConnectionStatus isOnline={apiStatus === "online"} isLoading={apiStatus === "checking"} lastSync={lastSync} />

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-input py-2 px-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Registrar Marcación
          </CardTitle>
          {/* <CardDescription>
            Haga clic para registrar su {nextPunchType === "In" ? "entrada" : "salida"} con hora del servidor.
          </CardDescription> */}
        </CardHeader>

        <CardContent>
          <div className="bg-background p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Hora actual del servidor</p>
                <p className="text-xl sm:text-2xl font-semibold">{format(currentTime, "HH:mm:ss")}</p>
              </div>

              <div className="text-left sm:text-right">
                {isGettingLocation ? (
                  <p className="text-xs text-muted-foreground">Obteniendo ubicación...</p>
                ) : currentLocation ? (
                  <p className="text-xs text-muted-foreground flex items-center justify-start sm:justify-end">
                    <MapPin className="h-3 w-3 mr-1" />
                    Ubicación detectada
                  </p>
                ) : (
                  <p className="text-xs text-warning">Ubicación no disponible (se solicitará al registrar)</p>
                )}

                {lastPunchToday && (
                  <div className="mt-2 p-2 bg-primary/10 rounded-md text-xs text-primary">
                    Última: {format(new Date(lastPunchToday.punchTime ?? 0), "HH:mm:ss")} (
                    {PUNCH_TYPES[lastPunchToday.punchType as PunchKind]?.label ?? lastPunchToday.punchType}) · Hace{" "}
                    {timeSinceLastPunch} min
                  </div>
                )}

                {apiStatus === "offline" && (
                  <div className="mt-2 p-2 bg-destructive/15 border border-destructive/40 rounded-md flex items-start text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
                    Sin conexión con el servidor.
                  </div>
                )}

                {isWithinCooldown && (
                  <div className="mt-2 p-2 bg-warning/10 border border-warning/40 rounded-md flex items-start text-xs text-warning">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
                    Debe esperar {COOLDOWN_MINUTES - timeSinceLastPunch} min para volver a marcar.
                  </div>
                )}
              </div>
            </div>
          </div>

          {punchResult && (
            <div
              role={punchResult.kind === "error" ? "alert" : "status"}
              className={`mb-4 flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
                punchResult.kind === "ok"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              <div className="min-w-0">
                <p className="font-semibold">{punchResult.title}</p>
                <p className="break-words">{punchResult.message}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {punchResult.kind === "error" && (
                  <Button size="sm" variant="outline" onClick={handlePunch} disabled={createPunchMutation.isPending}>
                    Reintentar
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setPunchResult(null)} aria-label="Cerrar aviso">
                  Cerrar
                </Button>
              </div>
            </div>
          )}

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

      <Card>
        <CardHeader className="bg-background py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Mis Marcaciones de Hoy</CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary w-fit">
              Total: {filteredPunches.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredPunches.length === 0 ? (
            <div className="text-center p-10">
              <Timer className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Sin marcaciones hoy</h3>
              <p className="text-muted-foreground">Use el botón de arriba para registrar su marcación.</p>
            </div>
          ) : (
            <PunchTable
              punches={filteredPunches.map((p) => ({
                ...p,
                punchId: p.id ?? `${p.punchTime ?? "no-time"}-${p.deviceId ?? "no-device"}`,
              })) as any}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}