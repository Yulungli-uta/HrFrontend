// src/pages/Justifications.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock, Eye, Trash2, FileText, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { TiposReferenciaAPI, JustificationsAPI, handleApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import JustificationForm from "@/components/justifications/JustificationForm";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "APPLIED";

// 2) Agrega la entrada en STATUS_META
const STATUS_META: Record<Status, { label: string; icon: any; klass: string }> = {
  PENDING:  { label: "Pendiente", icon: Clock,      klass: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  APPROVED: { label: "Aprobada",  icon: CheckCircle,klass: "bg-green-100 text-green-800 border-green-200" },
  REJECTED: { label: "Rechazada", icon: AlertCircle,klass: "bg-red-100 text-red-800 border-red-200" },
  APPLIED:  { label: "Aplicada",  icon: CheckCircle,klass: "bg-indigo-100 text-indigo-800 border-indigo-200" },
};

interface Justif {
  punchJustId: number;
  employeeId: number;
  bossEmployeeId: number;
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

export default function JustificationsPage() {
  const { employeeDetails } = useAuth();
  const queryClient = useQueryClient();

  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState<Justif | null>(null);

  const { data: types } = useQuery({
    queryKey: ["justificationTypes"],
    queryFn: async () => {
      const resp = await TiposReferenciaAPI.byCategory("JUSTIFICATION");
      if (resp.status === "error") throw new Error(resp.error.message);
      return resp.data || [];
    },
  });

  const empId = employeeDetails?.employeeID ? Number(employeeDetails.employeeID) : undefined;

  const { data: list, isLoading } = useQuery({
    queryKey: ["justifications", empId],
    enabled: !!empId,
    queryFn: async () => {
      // Endpoint correcto con /cv/ según tus logs
      const resp = await JustificationsAPI.getByEmployeeId(empId!);
      if (resp.status === "error") {
        // si tu API retorna 404 cuando no hay data, devuelvo []
        if (resp.error.code === 404) return [];
        throw new Error(resp.error.message);
      }
      const data = Array.isArray(resp.data) ? resp.data : [];
      return data as Justif[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const resp = await JustificationsAPI.remove(id); // DELETE /api/v1/rh/cv/justifications/:id
      if (resp.status === "error") throw resp.error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["justifications", empId] });
    },
  });

  const stats = useMemo(() => {
    const arr = list || [];
    return {
      total: arr.length,
      pending: arr.filter((x) => x.status === "PENDING").length,
      approved: arr.filter((x) => x.status === "APPROVED").length,
      rejected: arr.filter((x) => x.status === "REJECTED").length,
      applied: arr.filter((x) => x.status === "APPLIED").length,
    };
  }, [list]);

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Justificación de Marcaciones</h1>
          <p className="text-gray-600 mt-2">Gestione sus solicitudes de justificación</p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4" />
          Nueva Justificación
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat title="Total"       value={stats.total}    icon={FileText}   klass="border-blue-200 bg-blue-50" />
        <Stat title="Pendientes"  value={stats.pending}  icon={Clock}      klass="border-yellow-200 bg-yellow-50" />
        <Stat title="Aprobadas"   value={stats.approved} icon={CheckCircle}klass="border-green-200 bg-green-50" />
        <Stat title="Rechazadas"  value={stats.rejected} icon={AlertCircle}klass="border-red-200 bg-red-50" />
        <Stat title="Aplicadas"   value={stats.applied}  icon={CheckCircle}klass="border-indigo-200 bg-indigo-50" />
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="cards">Tarjetas</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <ListView
            items={list || []}
            onView={(j) => setOpenDetail(j)}
            onDelete={(j) => del.mutate(j.punchJustId)}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="cards">
          <CardView items={list || []} onView={(j) => setOpenDetail(j)} onDelete={(j) => del.mutate(j.punchJustId)} />
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
            types={types || []}
            onCreated={() => {
              setOpenCreate(false);
              queryClient.invalidateQueries({ queryKey: ["justifications", empId] });
            }}
            onCancel={() => setOpenCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Detalle */}
      <Dialog open={!!openDetail} onOpenChange={(o) => !o && setOpenDetail(null)}>
        <DialogContent className="max-w-2xl">
          {openDetail && (
            <>
              <DialogHeader>
                <DialogTitle>Detalle de la justificación</DialogTitle>
                <DialogDescription>
                  Creado el{" "}
                  {openDetail.createdAt
                    ? format(parseISO(openDetail.createdAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
                    : "-"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="Estado">
                  <Badge className={`${STATUS_META[openDetail.status].klass} flex items-center gap-1`}>
                    {STATUS_META[openDetail.status].label}
                  </Badge>
                </Info>
                <Info label="Horas">{openDetail.hoursRequested || 0}</Info>
                <Info label="Inicio">
                  {openDetail.startDate ? format(parseISO(openDetail.startDate), "dd/MM/yyyy HH:mm") : "-"}
                </Info>
                <Info label="Fin">
                  {openDetail.endDate ? format(parseISO(openDetail.endDate), "dd/MM/yyyy HH:mm") : "-"}
                </Info>
                <Info label="Fecha justificada">
                  {openDetail.justificationDate
                    ? format(parseISO(openDetail.justificationDate), "dd/MM/yyyy")
                    : "-"}
                </Info>
                <Info label="Comentarios">{openDetail.comments || "-"}</Info>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium mb-1">Motivo</p>
                <Card className="bg-gray-50">
                  <CardContent className="p-3 text-sm">{openDetail.reason}</CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Auxiliares UI */

function Stat({ title, value, icon: Icon, klass }: any) {
  return (
    <Card className={klass}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className="h-8 w-8 text-gray-400" />
      </CardContent>
    </Card>
  );
}

// function Info({ label, children }: { label: string; children: any }) {
//   return (
//     <div>
//       <p className="text-sm font-medium text-gray-600">{label}</p>
//       <p className="text-sm">{children}</p>
//     </div>
//   );
// }
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <div className="text-sm mt-1">{children}</div>
    </div>
  );
}

function ListView({
  items,
  onView,
  onDelete,
  isLoading,
}: {
  items: Justif[];
  onView: (j: Justif) => void;
  onDelete: (j: Justif) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">Cargando...</CardContent>
      </Card>
    );
  }
  if (!items.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay justificaciones registradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gray-50 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Lista de justificaciones</CardTitle>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {items.length} registros
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[580px]">
          <div className="divide-y">
            {items.map((j) => (
              <Row key={`j-${j.punchJustId ?? `${j.employeeId}-${j.createdAt}`}`} j={j} onView={onView} onDelete={onDelete} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Row({ j, onView, onDelete }: { j: Justif; onView: (x: Justif) => void; onDelete: (x: Justif) => void }) {
  const Meta = STATUS_META[j.status];
  const Icon = Meta.icon;

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {j.justificationTypeId ? `Tipo #${j.justificationTypeId}` : "Tipo"}
            </p>
            <Badge className={`${Meta.klass} flex items-center gap-1`}>
              <Icon className="h-3 w-3" />
              {Meta.label}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 line-clamp-1">{j.reason}</p>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(j)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
        <div>
          <span className="font-medium">Fecha:</span>{" "}
          {j.justificationDate ? format(parseISO(j.justificationDate), "dd/MM/yyyy") : "-"}
        </div>
        <div>
          <span className="font-medium">Inicio:</span>{" "}
          {j.startDate ? format(parseISO(j.startDate), "dd/MM/yyyy HH:mm") : "-"}
        </div>
        <div>
          <span className="font-medium">Fin:</span>{" "}
          {j.endDate ? format(parseISO(j.endDate), "dd/MM/yyyy HH:mm") : "-"}
        </div>
        <div>
          <span className="font-medium">Horas:</span> {j.hoursRequested || 0}
        </div>
      </div>
    </div>
  );
}

function CardView({
  items,
  onView,
  onDelete,
}: {
  items: Justif[];
  onView: (j: Justif) => void;
  onDelete: (j: Justif) => void;
}) {
  if (!items.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay justificaciones registradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((j) => (
        <Card key={`jc-${j.punchJustId ?? `${j.employeeId}-${j.createdAt}`}`} className="hover:shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <Badge className={`${STATUS_META[j.status].klass} flex items-center gap-1`}>
                {STATUS_META[j.status].label}
              </Badge>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onView(j)}>
                  <Eye className="h-4 w-4" />
                </Button>
                {j.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(j)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <CardTitle className="text-base">{`Tipo #${j.justificationTypeId}`}</CardTitle>
            <CardDescription className="line-clamp-2">{j.reason}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Fecha:</span>{" "}
              {j.justificationDate ? format(parseISO(j.justificationDate), "dd/MM/yyyy") : "-"}
            </p>
            <p>
              <span className="font-medium">Inicio:</span>{" "}
              {j.startDate ? format(parseISO(j.startDate), "dd/MM/yyyy HH:mm") : "-"}
            </p>
            <p>
              <span className="font-medium">Fin:</span>{" "}
              {j.endDate ? format(parseISO(j.endDate), "dd/MM/yyyy HH:mm") : "-"}
            </p>
            <p>
              <span className="font-medium">Horas:</span> {j.hoursRequested || 0}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
