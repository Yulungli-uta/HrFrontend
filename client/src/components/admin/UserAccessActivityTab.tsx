// components/admin/UserAccessActivityTab.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronRight,
  Clock,
  Fingerprint,
  Loader2,
  LogIn,
  LockOpen,
  LogOut,
  RefreshCw,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";
import type { User } from "@/features/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AuthUsersAPI,
  LocalCredentialsAPI,
  UserAccessAPI,
  MarcacionesEspecializadasAPI,
  type UserAccessEvent,
  type UserAccessEventType,
  type UserAccessSummary,
} from "@/lib/api";
import {
  groupRenewals,
  mergeTimeline,
  unwrapApiData,
  type PunchRecord,
  type TimelineRow,
} from "@/features/auth/services/userAccessTimeline";
import { formatDateTime } from "@/lib/clock";

export interface AccessUserSelection {
  id: string;
  email: string;
}

interface UserAccessActivityTabProps {
  selectedUser: AccessUserSelection | null;
  onSelectUser: (user: AccessUserSelection | null) => void;
}

type RangeKey = "today" | "7d" | "31d";
type FilterKey = "all" | "access" | "punches" | "anomalies";

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Hoy",
  "7d": "Últimos 7 días",
  "31d": "Últimos 31 días",
};

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Todo",
  access: "Accesos",
  punches: "Picadas",
  anomalies: "Anomalías",
};

const ANOMALY_TYPES: UserAccessEventType[] = ["LOGIN_FAILED", "SECURITY", "ACTIVITY", "SESSION_REVOKED"];
const ACCESS_TYPES: UserAccessEventType[] = ["LOGIN", "SESSION_RENEWED", "LOGOUT", "SESSION_EXPIRED", ...ANOMALY_TYPES];

const EVENT_STYLE: Record<UserAccessEventType, { icon: LucideIcon; color: string }> = {
  LOGIN: { icon: LogIn, color: "text-success" },
  LOGIN_FAILED: { icon: ShieldAlert, color: "text-destructive" },
  SESSION_RENEWED: { icon: RefreshCw, color: "text-muted-foreground" },
  LOGOUT: { icon: LogOut, color: "text-muted-foreground" },
  SESSION_EXPIRED: { icon: Clock, color: "text-muted-foreground" },
  SESSION_REVOKED: { icon: Ban, color: "text-warning" },
  SECURITY: { icon: ShieldAlert, color: "text-destructive" },
  ACTIVITY: { icon: AlertTriangle, color: "text-warning" },
  PUNCH: { icon: Fingerprint, color: "text-primary" },
};

const PAGE_SIZE = 200;
const MAX_PAGES = 10;

/** Fecha local sin zona horaria (el servidor guarda hora local): YYYY-MM-DDTHH:mm:ss */
function toLocalIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function rangeBounds(range: RangeKey): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now);
  if (range === "today") start.setHours(0, 0, 0, 0);
  else start.setDate(start.getDate() - (range === "7d" ? 7 : 31));
  return { from: toLocalIso(start), to: toLocalIso(now) };
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return formatDateTime(iso, "es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default function UserAccessActivityTab({ selectedUser, onSelectUser }: UserAccessActivityTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search.trim(), 300);
  const [range, setRange] = useState<RangeKey>("7d");
  const [filter, setFilter] = useState<FilterKey>("all");

  // ── Búsqueda de usuario ───────────────────────────────────────────────────
  const { data: usersResponse, isFetching: searching } = useQuery({
    queryKey: ["access-activity-user-search", debouncedSearch],
    queryFn: () =>
      AuthUsersAPI.listPaged({ page: 1, pageSize: 8, search: debouncedSearch, sortBy: "lastlogin", sortDirection: "desc" }),
    enabled: debouncedSearch.length >= 3 && !selectedUser,
  });
  const foundUsers = useMemo(() => unwrapApiData<{ items: User[] }>(usersResponse)?.items ?? [], [usersResponse]);

  // ── Línea de tiempo (todas las páginas del rango) ─────────────────────────
  const bounds = useMemo(() => rangeBounds(range), [range, selectedUser?.id]);

  const timelineQuery = useQuery({
    queryKey: ["user-access-timeline", selectedUser?.id, range],
    enabled: !!selectedUser,
    queryFn: async () => {
      const items: UserAccessEvent[] = [];
      let summary: UserAccessSummary | null = null;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await UserAccessAPI.timeline(selectedUser!.id, { ...bounds, page, pageSize: PAGE_SIZE });
        const data = unwrapApiData<{ summary: UserAccessSummary; items: UserAccessEvent[]; totalPages: number }>(res);
        if (!data) throw new Error("No se pudo cargar la actividad del usuario.");
        summary = data.summary;
        items.push(...data.items);
        if (page >= data.totalPages) break;
      }
      return { summary: summary!, items };
    },
  });

  const summary = timelineQuery.data?.summary ?? null;

  const unlockMutation = useMutation({
    mutationFn: (userId: string) => LocalCredentialsAPI.unlock(userId),
    onSuccess: () => {
      toast({ title: "Cuenta desbloqueada", description: "El usuario ya puede intentar iniciar sesión." });
      queryClient.invalidateQueries({ queryKey: ["user-access-timeline"] });
    },
    onError: (err) =>
      toast({ title: "No se pudo desbloquear", description: parseApiError(err).message, variant: "destructive" }),
  });

  // ── Picadas (HrBackend) ───────────────────────────────────────────────────
  const punchesQuery = useQuery({
    queryKey: ["user-access-punches", summary?.hrEmployeeId, range],
    enabled: !!summary?.hrEmployeeId,
    queryFn: async () => {
      const res = await MarcacionesEspecializadasAPI.getPunchesByEmployeeAndDateRange(
        summary!.hrEmployeeId!,
        bounds.from,
        bounds.to
      );
      // 404 "sin marcaciones" llega como error: significa lista vacía, no un fallo
      const list = unwrapApiData<PunchRecord[]>(res);
      return Array.isArray(list) ? list : [];
    },
  });

  const rows: TimelineRow[] = useMemo(() => {
    const merged = mergeTimeline(timelineQuery.data?.items ?? [], punchesQuery.data ?? []);
    const filtered = merged.filter((e) => {
      if (filter === "punches") return e.type === "PUNCH";
      if (filter === "access") return ACCESS_TYPES.includes(e.type);
      if (filter === "anomalies") return ANOMALY_TYPES.includes(e.type);
      return true;
    });
    return groupRenewals(filtered);
  }, [timelineQuery.data, punchesQuery.data, filter]);

  return (
    <div className="space-y-4">
      {/* Selección de usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedUser ? (
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{selectedUser.email}</div>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  onSelectUser(null);
                  setSearch("");
                }}
              >
                Cambiar usuario
              </button>
            </div>
          ) : (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por correo o nombre (mínimo 3 letras)"
                aria-label="Buscar usuario"
              />
              {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {foundUsers.length > 0 && (
                <ul className="divide-y rounded-md border">
                  {foundUsers.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => onSelectUser({ id: u.id, email: u.email })}
                      >
                        <div className="text-sm font-medium">{u.email}</div>
                        {u.displayName && <div className="text-xs text-muted-foreground">{u.displayName}</div>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {debouncedSearch.length >= 3 && !searching && foundUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">No se encontraron usuarios.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <>
          {summary && (
            <SummaryCards
              summary={summary}
              onUnlock={() => unlockMutation.mutate(summary.userId)}
              unlocking={unlockMutation.isPending}
            />
          )}

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <SelectTrigger className="w-48" aria-label="Rango de fechas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {RANGE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <SelectTrigger className="w-40" aria-label="Tipo de evento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {FILTER_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Línea de tiempo */}
          <Card>
            <CardContent className="pt-6">
              {timelineQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : timelineQuery.isError ? (
                <p className="py-8 text-center text-destructive">No se pudo cargar la actividad del usuario.</p>
              ) : rows.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Sin actividad en el rango seleccionado.</p>
              ) : (
                <ol className="space-y-3">
                  {rows.map((row, index) =>
                    row.kind === "event" ? (
                      <EventRow key={`${row.event.timestamp}-${row.event.type}-${index}`} event={row.event} />
                    ) : (
                      <RenewalsRow key={`renewals-${row.newest}-${index}`} row={row} />
                    )
                  )}
                </ol>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCards({
  summary,
  onUnlock,
  unlocking,
}: {
  summary: UserAccessSummary;
  onUnlock: () => void;
  unlocking: boolean;
}) {
  const accountStatus = summary.accountLocked ? "Bloqueada" : summary.isActive ? "Activa" : "Inactiva";
  const items: { label: string; value: string }[] = [
    { label: "Último login con Microsoft", value: fmtDateTime(summary.lastMicrosoftLogin) },
    { label: "Último acceso a la app", value: fmtDateTime(summary.lastAppAccess) },
    { label: "Sesiones vigentes", value: String(summary.validSessions) },
    { label: "Cuenta", value: accountStatus },
  ];
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{summary.displayName ?? summary.email}</span>
          <Badge variant="secondary">{summary.userType}</Badge>
          {summary.roles.map((role) => (
            <Badge key={role} variant="outline">
              {role}
            </Badge>
          ))}
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className={`text-sm font-medium ${item.label === "Cuenta" && summary.accountLocked ? "text-destructive" : ""}`}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        {summary.accountLocked && summary.userType === "Local" && (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onUnlock} disabled={unlocking}>
              {unlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockOpen className="mr-2 h-4 w-4" />}
              Desbloquear cuenta
            </Button>
            <span className="text-xs text-muted-foreground">
              Se bloquea tras 5 contraseñas incorrectas y no se levanta solo: solo un administrador puede desbloquearla.
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          «Último acceso» incluye las renovaciones de sesión: un usuario puede usar el sistema varios días sin volver a
          iniciar sesión con Microsoft.
        </p>
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: UserAccessEvent }) {
  const style = EVENT_STYLE[event.type] ?? EVENT_STYLE.ACTIVITY;
  const Icon = style.icon;
  const meta = [event.device, event.ipAddress].filter(Boolean).join(" · ");
  return (
    <li className="flex items-start gap-3">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.color}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{event.title}</span>
          <time className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(event.timestamp)}</time>
        </div>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
        {event.detail && <div className="break-all text-xs text-muted-foreground">{event.detail}</div>}
      </div>
    </li>
  );
}

function RenewalsRow({ row }: { row: Extract<TimelineRow, { kind: "renewals" }> }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Chevron className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {row.count === 1 ? "1 renovación de sesión" : `${row.count} renovaciones de sesión`}
              <span className="text-xs"> (el usuario seguía conectado; no inició sesión de nuevo)</span>
            </span>
            <time className="whitespace-nowrap text-xs text-muted-foreground">
              {row.count === 1 ? fmtDateTime(row.newest) : `${fmtDateTime(row.oldest)} – ${fmtDateTime(row.newest)}`}
            </time>
          </div>
        </div>
      </button>
      {open && (
        <ul className="ml-8 mt-2 space-y-1">
          {row.events.map((e, i) => (
            <li key={`${e.timestamp}-${i}`} className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>{[e.device, e.ipAddress].filter(Boolean).join(" · ") || "Renovación"}</span>
              <time>{fmtDateTime(e.timestamp)}</time>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
