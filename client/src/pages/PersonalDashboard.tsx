// src/pages/PersonalDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarCheck, Sun, ClipboardCheck, Clock, Timer, ChevronRight,
  CheckCircle, XCircle, AlertCircle, MapPin, RefreshCw, Search
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import {
  PermisosAPI, VacacionesAPI, JustificationsAPI,
  MarcacionesEspecializadasAPI, handleApiError
} from "@/lib/api";

/* ----------------- helpers ----------------- */
const safeArray = (x: any) =>
  Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : Array.isArray(x?.items) ? x.items : Array.isArray(x?.results) ? x.results : [];

const fmt = (d?: string | Date | null) => {
  if (!d) return "—";
  const dd = typeof d === "string" ? new Date(d) : d;
  return isNaN(dd.getTime()) ? "—" : format(dd, "dd/MM/yyyy HH:mm", { locale: es });
};
const fmtDate = (s?: string | null) => (s ? format(new Date(s), "dd/MM/yyyy", { locale: es }) : "—");

type PermStatus = "Pending" | "Approved" | "Rejected";
type VacStatus = "Planned" | "InProgress" | "Completed" | "Canceled";
type JustStatus = "PENDING" | "APPROVED" | "REJECTED";

const canonicalPermissionStatus = (s?: any): PermStatus => {
  const v = String(s ?? "").toLowerCase();
  if (v.includes("aprob")) return "Approved";
  if (v.includes("rech")) return "Rejected";
  if (v.includes("pend")) return "Pending";
  if (["approved", "rejected", "pending"].includes(v)) return v[0].toUpperCase() + v.slice(1) as PermStatus;
  return "Pending";
};
const normalizeVacStatus = (s: any): VacStatus => {
  const v = String(s ?? "").toLowerCase();
  if (v.includes("progress")) return "InProgress";
  if (v.includes("complete") || v.includes("completa")) return "Completed";
  if (v.includes("cancel")) return "Canceled";
  return "Planned";
};
const normalizeJustStatus = (s: any): JustStatus => {
  const v = String(s ?? "").toUpperCase();
  if (v.includes("APPROV")) return "APPROVED";
  if (v.includes("REJECT")) return "REJECTED";
  return "PENDING";
};

const statusChip: Record<string, { label: string; className: string; Icon: any }> = {
  Pending:   { label: "Pendiente", className: "bg-yellow-100 text-yellow-800", Icon: Clock },
  Approved:  { label: "Aprobado",  className: "bg-green-100 text-green-800",  Icon: CheckCircle },
  Rejected:  { label: "Rechazado", className: "bg-red-100 text-red-800",     Icon: XCircle },
  Planned:   { label: "Planeado",  className: "bg-yellow-100 text-yellow-800", Icon: Clock },
  InProgress:{ label: "En Proceso",className: "bg-blue-100 text-blue-800",    Icon: AlertCircle },
  Completed: { label: "Completado",className: "bg-green-100 text-green-800",  Icon: CheckCircle },
  Canceled:  { label: "Cancelado", className: "bg-red-100 text-red-800",      Icon: XCircle },
  PENDING:   { label: "Pendiente", className: "bg-yellow-100 text-yellow-800", Icon: Clock },
  APPROVED:  { label: "Aprobada",  className: "bg-green-100 text-green-800",  Icon: CheckCircle },
  REJECTED:  { label: "Rechazada", className: "bg-red-100 text-red-800",      Icon: XCircle },
};

/* ----------------- tipos minimales ----------------- */
interface Permission {
  id?: number;
  permissionTypeId?: number;
  startDate?: string; endDate?: string;
  justification?: string;
  status?: PermStatus | string | number;
  requestDate?: string; createdAt?: string; approvedAt?: string;
  hourTaken?: number;
}
interface Vacation {
  VacationID?: number;
  StartDate?: string; EndDate?: string;
  DaysGranted?: number;
  Reason?: string;
  Status?: VacStatus | string;
  ApprovedAt?: string;
}
interface Justification {
  punchJustId?: number;
  justificationDate?: string | null;
  startDate?: string | null; endDate?: string | null;
  hoursRequested?: number | null;
  reason?: string | null;
  status?: JustStatus | string | null;
}
interface Punch {
  punchId: number;
  punchTime: string;
  punchType: "In" | "Out";
  deviceId?: string;
  latitude?: number; longitude?: number;
}

/* ----------------- componente ----------------- */
export default function PersonalDashboard() {
  const { employeeDetails } = useAuth();
  const employeeId = employeeDetails?.employeeID;

  const [tab, setTab] = useState<"resumen" | "permisos" | "vacaciones" | "justificaciones" | "marcaciones">("resumen");
  const [qPerm, setQPerm] = useState(""); const [qVac, setQVac] = useState(""); const [qJust, setQJust] = useState("");

  /* -------- queries por employeeId (solo datos del usuario) -------- */
  const { data: permsRes, isLoading: loadingPerms, error: errorPerms } = useQuery({
    queryKey: ["/api/v1/rh/permissions", "employee", employeeId],
    enabled: !!employeeId,
    queryFn: () => PermisosAPI.getByEmployee(employeeId!),
  });

  const { data: vacsRes, isLoading: loadingVacs, error: errorVacs } = useQuery({
    queryKey: ["/api/v1/rh/vacations", "employee", employeeId],
    enabled: !!employeeId,
    queryFn: () => VacacionesAPI.getByEmployee(employeeId!),
  });

  const { data: justRes, isLoading: loadingJust, error: errorJust } = useQuery({
    queryKey: ["/api/v1/rh/cv/justifications", "employee", employeeId],
    enabled: !!employeeId,
    queryFn: () => JustificationsAPI.getByEmployeeId(employeeId!),
  });

  const { data: lastPunchRes } = useQuery({
    queryKey: ["/api/v1/rh/attendance/punches/last", employeeId],
    enabled: !!employeeId,
    queryFn: () => MarcacionesEspecializadasAPI.getLastPunch(employeeId!),
    refetchInterval: 30_000,
  });

  const { data: todayPunchesRes, isLoading: loadingPunches, error: errorPunches, refetch: refetchPunches } = useQuery({
    queryKey: ["/api/v1/rh/attendance/punches/today", employeeId],
    enabled: !!employeeId,
    queryFn: () => MarcacionesEspecializadasAPI.getTodayPunches(employeeId!),
    refetchInterval: 30_000,
  });

  const perms: Permission[] = useMemo(() => safeArray(permsRes).map((p: any) => ({
    id: p.id ?? p.PermissionID ?? p.permissionId,
    permissionTypeId: p.permissionTypeId ?? p.PermissionTypeID,
    startDate: p.startDate ?? p.StartDate, endDate: p.endDate ?? p.EndDate,
    justification: p.justification ?? p.Justification,
    status: canonicalPermissionStatus(p.status ?? p.Status),
    requestDate: p.requestDate ?? p.RequestDate ?? p.createdAt ?? p.CreatedAt,
    createdAt: p.createdAt ?? p.CreatedAt, approvedAt: p.approvedAt ?? p.ApprovedAt,
    hourTaken: Number(p.hourTaken ?? p.HourTaken ?? 0),
  })), [permsRes]);

  const vacations: Vacation[] = useMemo(() => safeArray(vacsRes).map((v: any) => ({
    VacationID: v.VacationID ?? v.id ?? v.Id,
    StartDate: v.StartDate ?? v.startDate, EndDate: v.EndDate ?? v.endDate,
    DaysGranted: Number(v.DaysGranted ?? v.daysGranted ?? 0),
    Reason: v.Reason ?? v.reason,
    Status: normalizeVacStatus(v.Status ?? v.status),
    ApprovedAt: v.ApprovedAt ?? v.approvedAt,
  })), [vacsRes]);

  const justifications: Justification[] = useMemo(() => safeArray(justRes).map((j: any) => ({
    punchJustId: j.punchJustId ?? j.id ?? j.Id,
    justificationDate: j.justificationDate ?? j.JustificationDate ?? null,
    startDate: j.startDate ?? j.StartDate ?? null,
    endDate: j.endDate ?? j.EndDate ?? null,
    hoursRequested: j.hoursRequested ?? j.HoursRequested ?? null,
    reason: j.reason ?? j.Reason ?? null,
    status: normalizeJustStatus(j.status ?? j.Status),
  })), [justRes]);

  const todayPunches: Punch[] = useMemo(() => safeArray(todayPunchesRes).map((p: any) => ({
    punchId: p.punchId ?? p.id,
    punchTime: p.punchTime,
    punchType: p.punchType,
    deviceId: p.deviceId,
    latitude: p.latitude, longitude: p.longitude,
  })), [todayPunchesRes]);

  const lastPunch: Punch | null = useMemo(() => {
    const d = lastPunchRes?.data ?? lastPunchRes;
    if (!d) return null;
    return {
      punchId: d.punchId ?? d.id,
      punchTime: d.punchTime,
      punchType: d.punchType,
      deviceId: d.deviceId,
      latitude: d.latitude, longitude: d.longitude
    };
  }, [lastPunchRes]);

  /* -------- filtros rápidos -------- */
  const filteredPerms = perms
    .filter(p => (qPerm ? (p.justification ?? "").toLowerCase().includes(qPerm.toLowerCase()) : true))
    .sort((a, b) => (new Date(b.createdAt ?? b.requestDate ?? b.startDate ?? 0).getTime())
                  - (new Date(a.createdAt ?? a.requestDate ?? a.startDate ?? 0).getTime()));

  const filteredVacs = vacations
    .filter(v => (qVac ? (v.Reason ?? "").toLowerCase().includes(qVac.toLowerCase()) : true))
    .sort((a, b) => (new Date(b.StartDate ?? 0).getTime()) - (new Date(a.StartDate ?? 0).getTime()));

  const filteredJusts = justifications
    .filter(j => (qJust ? (j.reason ?? "").toLowerCase().includes(qJust.toLowerCase()) : true))
    .sort((a, b) => (new Date(b.justificationDate ?? b.startDate ?? 0).getTime())
                  - (new Date(a.justificationDate ?? a.startDate ?? 0).getTime()));

  /* -------- KPIs -------- */
  const kpiPermPending = perms.filter(p => canonicalPermissionStatus(p.status) === "Pending").length;
  const kpiVacInProgress = vacations.filter(v => v.Status === "InProgress").length;
  const kpiJustPending = justifications.filter(j => normalizeJustStatus(j.status) === "PENDING").length;
  const kpiTodayPunches = todayPunches.length;

  /* -------- UI -------- */
  const anyError = errorPerms || errorVacs || errorJust || errorPunches;
  const errorMsg = anyError ? handleApiError(anyError, "No se pudieron cargar todos los datos.") : null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mi Panel</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de permisos, vacaciones, justificaciones y marcaciones del día
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchPunches()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
        </div>
      </header>

      {errorMsg && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Problema al cargar datos
            </CardTitle>
            <CardDescription className="text-red-700">{errorMsg}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="hover:shadow-sm transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Permisos pendientes</p>
                <p className="text-3xl font-semibold mt-1">{kpiPermPending}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <CalendarCheck className="text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vacaciones en proceso</p>
                <p className="text-3xl font-semibold mt-1">{kpiVacInProgress}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Sun className="text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Justificaciones pendientes</p>
                <p className="text-3xl font-semibold mt-1">{kpiJustPending}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <ClipboardCheck className="text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Marcaciones de hoy</p>
                <p className="text-3xl font-semibold mt-1">{kpiTodayPunches}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Timer className="text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Última marcación */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Última marcación
          </CardTitle>
          <CardDescription>
            {lastPunch
              ? `${lastPunch.punchType === "In" ? "Entrada" : "Salida"} • ${fmt(lastPunch.punchTime)}`
              : "Aún no registra marcaciones"}
          </CardDescription>
        </CardHeader>
        {lastPunch && (
          <CardContent className="pt-0 text-sm text-muted-foreground flex flex-wrap items-center gap-3">
            {lastPunch.deviceId && <>Dispositivo: <Badge variant="secondary">{lastPunch.deviceId}</Badge></>}
            {(lastPunch.latitude && lastPunch.longitude) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {Number(lastPunch.latitude).toFixed(4)}, {Number(lastPunch.longitude).toFixed(4)}
              </span>
            )}
          </CardContent>
        )}
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
          <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>
          <TabsTrigger value="justificaciones">Justificaciones</TabsTrigger>
        </TabsList>

        {/* Resumen: Marcaciones de Hoy */}
        <TabsContent value="resumen">
          <Card>
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Mis marcaciones de hoy</CardTitle>
                <Badge variant="outline">Total: {todayPunches.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPunches ? (
                <div className="p-6 text-center text-muted-foreground">Cargando marcaciones…</div>
              ) : todayPunches.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No hay marcaciones registradas hoy.
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden p-3 space-y-3">
                    {todayPunches.map(p => (
                      <Card key={p.punchId} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{format(new Date(p.punchTime), "HH:mm:ss", { locale: es })}</div>
                          <Badge className={p.punchType === "In" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {p.punchType === "In" ? "Entrada" : "Salida"}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                          <span>Dispositivo: {p.deviceId ?? "—"}</span>
                          {(p.latitude && p.longitude) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hora</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Dispositivo</TableHead>
                          <TableHead>Ubicación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todayPunches.map(p => (
                          <TableRow key={p.punchId}>
                            <TableCell className="font-medium">
                              {format(new Date(p.punchTime), "HH:mm:ss", { locale: es })}
                            </TableCell>
                            <TableCell>
                              <Badge className={p.punchType === "In" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {p.punchType === "In" ? "Entrada" : "Salida"}
                              </Badge>
                            </TableCell>
                            <TableCell>{p.deviceId ?? "—"}</TableCell>
                            <TableCell>
                              {(p.latitude && p.longitude)
                                ? (<span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                                  </span>)
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permisos */}
        <TabsContent value="permisos" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Motivo…" value={qPerm} onChange={e => setQPerm(e.target.value)} />
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingPerms ? (
                <div className="p-6 text-center text-muted-foreground">Cargando permisos…</div>
              ) : filteredPerms.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Sin permisos</div>
              ) : (
                <>
                  {/* mobile */}
                  <div className="md:hidden p-3 space-y-3">
                    {filteredPerms.map((p, i) => {
                      const st = statusChip[canonicalPermissionStatus(p.status)];
                      const Icon = st?.Icon ?? Clock;
                      return (
                        <Card key={`perm-m-${p.id ?? i}`} className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">#{p.id ?? "—"}</div>
                            <Badge className={st?.className}>{st?.label}</Badge>
                          </div>
                          <div className="mt-2 text-xs grid grid-cols-2 gap-2">
                            <div><span className="text-muted-foreground">Desde: </span>{fmtDate(p.startDate)}</div>
                            <div><span className="text-muted-foreground">Hasta: </span>{fmtDate(p.endDate)}</div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Motivo: </span>{p.justification ?? "—"}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                  {/* desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Desde</TableHead>
                          <TableHead>Hasta</TableHead>
                          <TableHead>Solicitado</TableHead>
                          <TableHead>Horas</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPerms.map((p, i) => {
                          const st = statusChip[canonicalPermissionStatus(p.status)];
                          const Icon = st?.Icon ?? Clock;
                          return (
                            <TableRow key={`perm-${p.id ?? i}`}>
                              <TableCell>#{p.id ?? "—"}</TableCell>
                              <TableCell>{fmtDate(p.startDate)}</TableCell>
                              <TableCell>{fmtDate(p.endDate)}</TableCell>
                              <TableCell>{fmt(p.requestDate ?? p.createdAt)}</TableCell>
                              <TableCell>{p.hourTaken ?? 0}</TableCell>
                              <TableCell>
                                <Badge className={st?.className}><Icon className="h-3 w-3 mr-1" />{st?.label}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[360px]" title={p.justification ?? ""}>
                                {(p.justification ?? "—").length > 80 ? (p.justification ?? "—").slice(0,80) + "…" : (p.justification ?? "—")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vacaciones */}
        <TabsContent value="vacaciones" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Motivo…" value={qVac} onChange={e => setQVac(e.target.value)} />
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingVacs ? (
                <div className="p-6 text-center text-muted-foreground">Cargando vacaciones…</div>
              ) : filteredVacs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Sin vacaciones registradas</div>
              ) : (
                <>
                  {/* mobile */}
                  <div className="md:hidden p-3 space-y-3">
                    {filteredVacs.map((v, i) => {
                      const st = statusChip[v.Status ?? "Planned"];
                      return (
                        <Card key={`vac-m-${v.VacationID ?? i}`} className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">#{v.VacationID ?? "—"}</div>
                            <Badge className={st?.className}>{st?.label}</Badge>
                          </div>
                          <div className="mt-2 text-xs grid grid-cols-2 gap-2">
                            <div><span className="text-muted-foreground">Desde: </span>{fmtDate(v.StartDate)}</div>
                            <div><span className="text-muted-foreground">Hasta: </span>{fmtDate(v.EndDate)}</div>
                            <div><span className="text-muted-foreground">Días: </span>{v.DaysGranted ?? 0}</div>
                            <div className="col-span-2"><span className="text-muted-foreground">Motivo: </span>{v.Reason ?? "—"}</div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                  {/* desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Desde</TableHead>
                          <TableHead>Hasta</TableHead>
                          <TableHead>Días</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Aprobado el</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVacs.map((v, i) => {
                          const st = statusChip[v.Status ?? "Planned"];
                          return (
                            <TableRow key={`vac-${v.VacationID ?? i}`}>
                              <TableCell>#{v.VacationID ?? "—"}</TableCell>
                              <TableCell>{fmtDate(v.StartDate)}</TableCell>
                              <TableCell>{fmtDate(v.EndDate)}</TableCell>
                              <TableCell>{v.DaysGranted ?? 0}</TableCell>
                              <TableCell><Badge className={st?.className}>{st?.label}</Badge></TableCell>
                              <TableCell className="max-w-[360px]" title={v.Reason ?? ""}>
                                {(v.Reason ?? "—").length > 80 ? (v.Reason ?? "—").slice(0,80) + "…" : (v.Reason ?? "—")}
                              </TableCell>
                              <TableCell>{fmt(v.ApprovedAt)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Justificaciones */}
        <TabsContent value="justificaciones" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Motivo…" value={qJust} onChange={e => setQJust(e.target.value)} />
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingJust ? (
                <div className="p-6 text-center text-muted-foreground">Cargando justificaciones…</div>
              ) : filteredJusts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Sin justificaciones</div>
              ) : (
                <>
                  {/* mobile */}
                  <div className="md:hidden p-3 space-y-3">
                    {filteredJusts.map((j, i) => {
                      const st = statusChip[normalizeJustStatus(j.status)];
                      return (
                        <Card key={`just-m-${j.punchJustId ?? i}`} className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">#{j.punchJustId ?? "—"}</div>
                            <Badge className={st?.className}>{st?.label}</Badge>
                          </div>
                          <div className="mt-2 text-xs grid grid-cols-2 gap-2">
                            <div><span className="text-muted-foreground">Fecha/Desde: </span>{fmtDate(j.justificationDate ?? j.startDate ?? undefined)}</div>
                            <div><span className="text-muted-foreground">Hasta: </span>{fmtDate(j.endDate ?? undefined)}</div>
                            <div><span className="text-muted-foreground">Horas: </span>{j.hoursRequested ?? 0}</div>
                            <div className="col-span-2"><span className="text-muted-foreground">Motivo: </span>{j.reason ?? "—"}</div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                  {/* desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Fecha / Desde</TableHead>
                          <TableHead>Hasta</TableHead>
                          <TableHead>Horas</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJusts.map((j, i) => {
                          const st = statusChip[normalizeJustStatus(j.status)];
                          return (
                            <TableRow key={`just-${j.punchJustId ?? i}`}>
                              <TableCell>#{j.punchJustId ?? "—"}</TableCell>
                              <TableCell>{fmtDate(j.justificationDate ?? j.startDate ?? undefined)}</TableCell>
                              <TableCell>{fmtDate(j.endDate ?? undefined)}</TableCell>
                              <TableCell>{j.hoursRequested ?? 0}</TableCell>
                              <TableCell><Badge className={st?.className}>{st?.label}</Badge></TableCell>
                              <TableCell className="max-w-[360px]" title={j.reason ?? ""}>
                                {(j.reason ?? "—").length > 80 ? (j.reason ?? "—").slice(0,80) + "…" : (j.reason ?? "—")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CTA inferior en móvil */}
      <div className="md:hidden py-2">
        <Button className="w-full" variant="secondary">
          Ver más opciones <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
