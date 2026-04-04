// src/pages/Justifications.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock, Eye, Trash2, FileText, Plus, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { TiposReferenciaAPI, JustificationsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import JustificationForm from "@/components/justifications/JustificationForm";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "APPLIED";

const STATUS_META: Record<Status, { label: string; icon: any; klass: string }> = {
  PENDING: { label: "Pendiente", icon: Clock, klass: "bg-warning/15 text-warning border-warning/30" },
  APPROVED: { label: "Aprobada", icon: CheckCircle, klass: "bg-success/15 text-success border-success/30" },
  REJECTED: { label: "Rechazada", icon: AlertCircle, klass: "bg-destructive/15 text-destructive border-destructive/30" },
  APPLIED: { label: "Aplicada", icon: CheckCircle, klass: "bg-primary/15 text-primary border-indigo-200" },
};

interface Justif {
  punchJustId: number;
  employeeId: number;
  bossEmployeeId: number;

  // OJO: lo normalizamos, no asumimos que el backend lo trae así
  justificationTypeId: number;

  startDate: string | null;
  endDate: string | null;
  justificationDate: string | null;
  reason: string;
  hoursRequested: number;
  approved: boolean;
  approvedAt?: string | null;
  createdAt: string;
  createdBy: number;
  comments?: string | null;
  status: Status;
}

/** ---------- Extractores (mismos criterios que tu Form) ---------- **/
function extractTypeId(typ: any): number {
  return Number(typ?.typeId ?? typ?.id ?? typ?.value ?? typ?.code ?? typ?.tipoReferenciaId ?? typ?.tipo_referencia_id ?? 0);
}
function extractTypeName(typ: any): string {
  return (typ?.nombre ?? typ?.name ?? typ?.typeName ?? typ?.label ?? typ?.description ?? typ?.descripcion ?? "Tipo").toString();
}

/** ---------- Normalización del item del backend ---------- **/
function normalizeJustification(raw: any): Justif {
  const justificationTypeId = Number(
    raw?.justificationTypeId ??
      raw?.justificationTypeID ??
      raw?.JustificationTypeId ??
      raw?.JustificationTypeID ??
      raw?.tipoJustificacionId ??
      raw?.tipoJustificacionID ??
      raw?.justificationType?.id ??
      raw?.justificationType?.typeId ??
      0
  );

  return {
    punchJustId: Number(raw?.punchJustId ?? raw?.punchJustID ?? raw?.PunchJustId ?? raw?.PunchJustID ?? raw?.id ?? 0),
    employeeId: Number(raw?.employeeId ?? raw?.employeeID ?? raw?.EmployeeId ?? raw?.EmployeeID ?? 0),
    bossEmployeeId: Number(raw?.bossEmployeeId ?? raw?.bossEmployeeID ?? raw?.BossEmployeeId ?? raw?.BossEmployeeID ?? 0),
    justificationTypeId,

    startDate: raw?.startDate ?? raw?.StartDate ?? null,
    endDate: raw?.endDate ?? raw?.EndDate ?? null,
    justificationDate: raw?.justificationDate ?? raw?.JustificationDate ?? null,
    reason: String(raw?.reason ?? raw?.Reason ?? ""),
    hoursRequested: Number(raw?.hoursRequested ?? raw?.HoursRequested ?? 0),
    approved: Boolean(raw?.approved ?? raw?.Approved ?? false),
    approvedAt: raw?.approvedAt ?? raw?.ApprovedAt ?? null,
    createdAt: String(raw?.createdAt ?? raw?.CreatedAt ?? ""),
    createdBy: Number(raw?.createdBy ?? raw?.CreatedBy ?? 0),
    comments: raw?.comments ?? raw?.Comments ?? null,
    status: (raw?.status ?? raw?.Status ?? "PENDING") as Status,
  };
}

export default function JustificationsPage() {
  const { employeeDetails } = useAuth();
  const queryClient = useQueryClient();

  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState<Justif | null>(null);

  const currentYear = new Date().getFullYear();

  // filtros
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<number | "ALL">("ALL");
  const [searchText, setSearchText] = useState<string>("");

  const { data: types } = useQuery({
    queryKey: ["justificationTypes"],
    queryFn: async () => {
      const resp = await TiposReferenciaAPI.byCategory("JUSTIFICATION");
      if (resp.status === "error") throw new Error(resp.error.message);
      return resp.data || [];
    },
  });

  const typeNameById = useMemo(() => {
    const map = new Map<number, string>();
    (types || []).forEach((t: any) => {
      const id = extractTypeId(t);
      if (!Number.isFinite(id) || id <= 0) return;
      const name = extractTypeName(t);
      map.set(id, name || `Tipo #${id}`);
    });
    return map;
  }, [types]);

  const empId = employeeDetails?.employeeID ? Number(employeeDetails.employeeID) : undefined;

  const { data: listRaw, isLoading } = useQuery({
    queryKey: ["justifications", empId],
    enabled: !!empId,
    queryFn: async () => {
      const resp = await JustificationsAPI.getByEmployeeId(empId!);
      if (resp.status === "error") {
        if (resp.error.code === 404) return [];
        throw new Error(resp.error.message);
      }
      return Array.isArray(resp.data) ? resp.data : [];
    },
  });

  const list = useMemo(() => (listRaw || []).map(normalizeJustification), [listRaw]);

  const del = useMutation({
    mutationFn: async (id: number) => {
      const resp = await JustificationsAPI.remove(id);
      if (resp.status === "error") throw resp.error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["justifications", empId] });
    },
  });

  const stats = useMemo(() => {
    return {
      total: list.length,
      pending: list.filter((x) => x.status === "PENDING").length,
      approved: list.filter((x) => x.status === "APPROVED").length,
      rejected: list.filter((x) => x.status === "REJECTED").length,
      applied: list.filter((x) => x.status === "APPLIED").length,
    };
  }, [list]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    list.forEach((j) => {
      const d = j.justificationDate || j.startDate || j.createdAt;
      if (!d) return;
      const y = new Date(d).getFullYear();
      if (Number.isFinite(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [list, currentYear]);

  const filteredList = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return list.filter((j) => {
      const d = j.justificationDate || j.startDate || j.createdAt;
      const y = d ? new Date(d).getFullYear() : NaN;

      const okYear = y === yearFilter;
      const okStatus = statusFilter === "ALL" ? true : j.status === statusFilter;
      const okType = typeFilter === "ALL" ? true : j.justificationTypeId === typeFilter;
      const okQ = !q ? true : (j.reason || "").toLowerCase().includes(q);

      return okYear && okStatus && okType && okQ;
    });
  }, [list, yearFilter, statusFilter, typeFilter, searchText]);

  const getTypeLabel = (id: number | undefined | null) => {
    const safeId = Number(id ?? 0);
    if (!safeId) return "Tipo";
    return typeNameById.get(safeId) ?? `Tipo #${safeId}`;
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Justificación de Marcaciones</h1>
          <p className="text-muted-foreground mt-1">Gestione sus solicitudes de justificación</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto" onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4" />
          Nueva Justificación
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat title="Total" value={stats.total} icon={FileText} klass="border-primary/30 bg-primary/10" />
        <Stat title="Pendientes" value={stats.pending} icon={Clock} klass="border-warning/30 bg-warning/10" />
        <Stat title="Aprobadas" value={stats.approved} icon={CheckCircle} klass="border-success/30 bg-success/10" />
        <Stat title="Rechazadas" value={stats.rejected} icon={AlertCircle} klass="border-destructive/30 bg-destructive/10" />
        <Stat title="Aplicadas" value={stats.applied} icon={CheckCircle} klass="border-indigo-200 bg-primary/10" />
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="cards">Tarjetas</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <ListView
            items={filteredList}
            allCount={list.length}
            getTypeLabel={getTypeLabel}
            onView={(j) => setOpenDetail(j)}
            onDelete={(j) => del.mutate(j.punchJustId)}
            isLoading={isLoading}
            // 👉 filtros “pegados” encima de la lista (estándar)
            filters={
              <FiltersBar
                availableYears={availableYears}
                yearFilter={yearFilter}
                setYearFilter={setYearFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                types={types || []}
                searchText={searchText}
                setSearchText={setSearchText}
                currentYear={currentYear}
                onReset={() => {
                  setYearFilter(currentYear);
                  setStatusFilter("ALL");
                  setTypeFilter("ALL");
                  setSearchText("");
                }}
                shown={filteredList.length}
                total={list.length}
              />
            }
          />
        </TabsContent>

        <TabsContent value="cards">
          {/* En tarjetas también va arriba, pero aquí sí es normal que quede como barra arriba del grid */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <FiltersBar
                  availableYears={availableYears}
                  yearFilter={yearFilter}
                  setYearFilter={setYearFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  typeFilter={typeFilter}
                  setTypeFilter={setTypeFilter}
                  types={types || []}
                  searchText={searchText}
                  setSearchText={setSearchText}
                  currentYear={currentYear}
                  onReset={() => {
                    setYearFilter(currentYear);
                    setStatusFilter("ALL");
                    setTypeFilter("ALL");
                    setSearchText("");
                  }}
                  shown={filteredList.length}
                  total={list.length}
                />
              </CardContent>
            </Card>

            <CardView items={filteredList} getTypeLabel={getTypeLabel} onView={(j) => setOpenDetail(j)} onDelete={(j) => del.mutate(j.punchJustId)} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Crear */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitar Justificación</DialogTitle>
            <DialogDescription>Complete los campos según el tipo.</DialogDescription>
          </DialogHeader>

          <JustificationForm
            onCreated={() => {
              setOpenCreate(false);
              queryClient.invalidateQueries({ queryKey: ["justifications", empId] });
            }}
            onCancel={() => setOpenCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Detalle */}
      <Dialog open={!!openDetail} onOpenChange={(v) => !v && setOpenDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Justificación</DialogTitle>
            <DialogDescription>Información completa de la solicitud</DialogDescription>
          </DialogHeader>

          {openDetail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium truncate">{getTypeLabel(openDetail.justificationTypeId)}</p>
                </div>

                <Badge className={`${STATUS_META[openDetail.status].klass} flex items-center gap-1`}>
                  {(() => {
                    const Icon = STATUS_META[openDetail.status].icon;
                    return <Icon className="h-3 w-3" />;
                  })()}
                  {STATUS_META[openDetail.status].label}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Info label="Fecha" value={fmtDate(openDetail.justificationDate)} />
                <Info label="Horas" value={String(openDetail.hoursRequested ?? 0)} />
              </div>

              {openDetail.startDate ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Info label="Inicio" value={fmtDateTime(openDetail.startDate)} />
                  <Info label="Fin" value={fmtDateTime(openDetail.endDate)} />
                </div>
              ) : null}

              <Info label="Motivo" value={openDetail.reason || "-"} />
              {openDetail.comments ? <Info label="Comentarios" value={openDetail.comments} /> : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** ---------- Barra de filtros (reutilizable) ---------- **/
function FiltersBar({
  availableYears,
  yearFilter,
  setYearFilter,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  types,
  searchText,
  setSearchText,
  currentYear,
  onReset,
  shown,
  total,
}: {
  availableYears: number[];
  yearFilter: number;
  setYearFilter: (v: number) => void;
  statusFilter: Status | "ALL";
  setStatusFilter: (v: Status | "ALL") => void;
  typeFilter: number | "ALL";
  setTypeFilter: (v: number | "ALL") => void;
  types: any[];
  searchText: string;
  setSearchText: (v: string) => void;
  currentYear: number;
  onReset: () => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Año</p>
          <Select value={String(yearFilter)} onValueChange={(v) => setYearFilter(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Estado</p>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="APPROVED">Aprobada</SelectItem>
              <SelectItem value="REJECTED">Rechazada</SelectItem>
              <SelectItem value="APPLIED">Aplicada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Tipo</p>
          <Select value={typeFilter === "ALL" ? "ALL" : String(typeFilter)} onValueChange={(v) => setTypeFilter(v === "ALL" ? "ALL" : Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {types.map((t: any) => {
                const id = extractTypeId(t);
                if (!Number.isFinite(id) || id <= 0) return null;
                const name = extractTypeName(t);
                return (
                  <SelectItem key={id} value={String(id)}>
                    {name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Buscar</p>
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground/70 absolute left-3 top-3" />
            <Input className="pl-9" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Motivo..." />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Badge variant="outline" className="bg-background w-fit">
          Mostrando {shown} de {total}
        </Badge>

        {/* <Button variant="ghost" className="gap-2 w-fit" onClick={onReset}>
          <X className="h-4 w-4" />
          Limpiar (año {currentYear})
        </Button> */}
      </div>
    </div>
  );
}

/** ---------- Subcomponentes ---------- **/

function Stat({ title, value, icon: Icon, klass }: { title: string; value: number; icon: any; klass: string }) {
  return (
    <Card className={`border ${klass}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
          <Icon className="h-6 w-6 text-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground break-words">{value}</p>
    </div>
  );
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    return format(parseISO(value), "dd/MM/yyyy", { locale: es });
  } catch {
    return value;
  }
}

function fmtDateTime(value: string | null | undefined) {
  if (!value) return "-";
  try {
    return format(parseISO(value), "dd/MM/yyyy HH:mm", { locale: es });
  } catch {
    return value;
  }
}

function ListView({
  items,
  allCount,
  getTypeLabel,
  onView,
  onDelete,
  isLoading,
  filters,
}: {
  items: Justif[];
  allCount: number;
  getTypeLabel: (id: number) => string;
  onView: (j: Justif) => void;
  onDelete: (j: Justif) => void;
  isLoading: boolean;
  filters: React.ReactNode;
}) {
  return (
    <Card>
      {/* Header de tabla + filtros pegados (estándar) */}
      <CardHeader className="bg-background">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lista de justificaciones</CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Mostrando: {items.length} de {allCount}
            </Badge>
          </div>
          {filters}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6">Cargando...</div>
        ) : !items.length ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay justificaciones registradas</p>
          </div>
        ) : (
          <ScrollArea className="h-[580px]">
            <div className="divide-y">
              {items.map((j) => (
                <Row key={`j-${j.punchJustId}`} j={j} getTypeLabel={getTypeLabel} onView={onView} onDelete={onDelete} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  j,
  getTypeLabel,
  onView,
  onDelete,
}: {
  j: Justif;
  getTypeLabel: (id: number) => string;
  onView: (x: Justif) => void;
  onDelete: (x: Justif) => void;
}) {
  const Meta = STATUS_META[j.status];
  const Icon = Meta.icon;

  return (
    <div className="p-4 hover:bg-background transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{getTypeLabel(j.justificationTypeId)}</p>
            <Badge className={`${Meta.klass} flex items-center gap-1`}>
              <Icon className="h-3 w-3" />
              {Meta.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{j.reason}</p>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => onView(j)}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver</TooltipContent>
          </Tooltip>

          {j.status === "PENDING" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => onDelete(j)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

function CardView({
  items,
  getTypeLabel,
  onView,
  onDelete,
}: {
  items: Justif[];
  getTypeLabel: (id: number) => string;
  onView: (j: Justif) => void;
  onDelete: (j: Justif) => void;
}) {
  if (!items.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
          <p className="text-muted-foreground">No hay justificaciones registradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((j) => (
        <CardItem key={`jc-${j.punchJustId}`} j={j} getTypeLabel={getTypeLabel} onView={onView} onDelete={onDelete} />
      ))}
    </div>
  );
}

function CardItem({
  j,
  getTypeLabel,
  onView,
  onDelete,
}: {
  j: Justif;
  getTypeLabel: (id: number) => string;
  onView: (x: Justif) => void;
  onDelete: (x: Justif) => void;
}) {
  const Meta = STATUS_META[j.status];
  const Icon = Meta.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{getTypeLabel(j.justificationTypeId)}</CardTitle>
            <CardDescription className="mt-1">{fmtDate(j.justificationDate)}</CardDescription>
          </div>
          <Badge className={`${Meta.klass} flex items-center gap-1`}>
            <Icon className="h-3 w-3" />
            {Meta.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-foreground line-clamp-2">{j.reason}</p>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => onView(j)}>
            <Eye className="h-4 w-4" />
            Ver
          </Button>

          {j.status === "PENDING" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => onDelete(j)}>
              <Trash2 className="h-4 w-4 text-destructive" />
              Eliminar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
