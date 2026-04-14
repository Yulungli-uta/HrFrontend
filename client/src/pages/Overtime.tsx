// src/pages/Overtime.tsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronDown,
  Eye,
  RefreshCw,
  Filter,
  Plus,
  Clock,
  TimerReset,
} from "lucide-react";

import {
  TimePlanningsAPI,
  TiposReferenciaAPI,
  type ApiResponse,
} from "@/lib/api";
import { useAuth } from "@/features/auth";
import TimePlanningEmployeeForm from "@/components/forms/TimePlanningEmployeeForm";
import CreatePlanningDialog from "@/components/planning/CreatePlanningDialog";

type TimePlanning = {
  planID: number;
  planType: "Overtime" | "Recovery";
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  overtimeType?: string | null;
  factor?: number | null;
  owedMinutes?: number | null;
  planStatusTypeID: number;
  requiresApproval: boolean;
  createdBy: number;
  createdAt: string;
  updatedBy?: number | null;
  updatedAt?: string | null;
};

type RefType = {
  typeId: number;
  category: string;
  name: string;
  description?: string;
  isActive: boolean;
};

const fmtDate = (value?: string | null) => {
  if (!value) return "—";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-");
    return `${d}/${m}/${y}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString();
};

const fmtTime = (hhmmss?: string) => (hhmmss ? hhmmss.slice(0, 5) : "—");

function StatusBadge({
  statusId,
  list,
}: {
  statusId: number;
  list: RefType[];
}) {
  const s = list?.find((x) => x.typeId === statusId);

  const map: Record<
    string,
    "default" | "secondary" | "destructive" | "outline" | "success"
  > = {
    Borrador: "secondary",
    "En Progreso": "default",
    Planificado: "outline",
    Aprobado: "success",
    Completado: "success",
    Rechazado: "destructive",
    Cancelado: "destructive",
  };

  if (!s) return <Badge variant="outline">Desconocido</Badge>;
  return <Badge variant={map[s.name] || "outline"}>{s.name}</Badge>;
}

export default function OvertimePage() {
  const { employeeDetails } = useAuth();
  const currentEmployeeId = employeeDetails?.employeeID ?? 0;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<number | "all">("all");
  const [selectedPlan, setSelectedPlan] = useState<TimePlanning | null>(null);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: refPlanStatusResp } = useQuery<ApiResponse<RefType[]>>({
    queryKey: ["ref-types", "PLAN_STATUS"],
    queryFn: () => TiposReferenciaAPI.byCategory("PLAN_STATUS"),
    staleTime: 5 * 60_000,
  });

  const planStatuses =
    refPlanStatusResp?.status === "success" ? refPlanStatusResp.data || [] : [];

  const {
    data: plansResp,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<ApiResponse<TimePlanning[]>>({
    queryKey: ["time-plannings", "created-by", currentEmployeeId],
    queryFn: () => TimePlanningsAPI.getByCreateBy(currentEmployeeId),
    enabled: currentEmployeeId > 0,
    staleTime: 30_000,
  });

  const plans = plansResp?.status === "success" ? plansResp.data || [] : [];

  const filtered = useMemo(() => {
    return plans
      .filter((p) =>
        statusFilter === "all" ? true : p.planStatusTypeID === statusFilter
      )
      .filter((p) =>
        search.trim()
          ? [p.title, p.description || "", p.planType, p.overtimeType || ""]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase())
          : true
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [plans, statusFilter, search]);

  const openEmployees = (plan: TimePlanning) => {
    setSelectedPlan(plan);
    setIsEmployeesOpen(true);
  };

  const closeEmployees = () => {
    setIsEmployeesOpen(false);
    setSelectedPlan(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold">Planificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tus planificaciones de horas extra y recuperación.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-10"
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Refrescar
          </Button>

          <Button className="h-10" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva planificación
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">Filtro</CardTitle>
          <CardDescription>
            Busca por título, descripción o tipo y filtra por estado
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              className="h-10"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full md:w-64">
            <Select
              value={String(statusFilter)}
              onValueChange={(val) =>
                setStatusFilter(val === "all" ? "all" : Number(val))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="max-h-[50vh]">
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Todos
                  </div>
                </SelectItem>

                {planStatuses.map((s) => (
                  <SelectItem key={s.typeId} value={String(s.typeId)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden md:block">
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">Planificaciones</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[260px]">Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right min-w-[160px]">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.planID} className="align-top">
                      <TableCell>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {p.description || "—"}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          {p.planType === "Recovery" ? (
                            <TimerReset className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                          {p.planType}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {p.planType === "Overtime"
                            ? `Tipo: ${p.overtimeType ?? "—"} · Factor: ${p.factor ?? "—"}`
                            : `Deuda (min): ${p.owedMinutes ?? 0}`}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm whitespace-nowrap">
                        {fmtTime(p.startTime)} – {fmtTime(p.endTime)}
                      </TableCell>

                      <TableCell>
                        <StatusBadge statusId={p.planStatusTypeID} list={planStatuses} />
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8">
                                Opciones <ChevronDown className="h-4 w-4 ml-2" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => openEmployees(p)}
                                className="text-sm"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalle
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!isLoading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No hay planificaciones creadas por ti.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedPlan && (
        <Dialog
          open={isEmployeesOpen}
          onOpenChange={(open) => {
            if (!open) closeEmployees();
            else setIsEmployeesOpen(true);
          }}
        >
          <DialogContent className="w-[95vw] max-w-[980px] max-h-[88vh] overflow-hidden p-0">
            <div className="flex h-full flex-col">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle>Detalle de planificación — {selectedPlan.title}</DialogTitle>
                <DialogDescription>
                  Consulta los empleados asignados a esta planificación.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <TimePlanningEmployeeForm
                  planningId={selectedPlan.planID}
                  planningTitle={selectedPlan.title}
                  onClose={closeEmployees}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <CreatePlanningDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        planStatuses={planStatuses.map((x) => ({
          typeId: x.typeId,
          name: x.name,
        }))}
      />
    </div>
  );
}