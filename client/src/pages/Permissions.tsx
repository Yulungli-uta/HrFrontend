import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sun, Search } from "lucide-react";
import PermissionForm from "@/components/forms/PermissionForm";
import VacationForm from "@/components/forms/VacationForm";
import { PermisosAPI, VacacionesAPI, type ApiResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

const permStatusLabels: Record<string, string> = {
  Pending: "Pendiente",
  Approved: "Aprobado",
  Rejected: "Rechazado",
};
const permStatusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

const vacStatusLabels: Record<string, string> = {
  Planned: "Planificado",
  InProgress: "En progreso",
  Completed: "Completado",
  Canceled: "Cancelado",
};
const vacStatusColors: Record<string, string> = {
  Planned: "bg-indigo-100 text-indigo-800",
  InProgress: "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
  Canceled: "bg-gray-100 text-gray-800",
};

const fmt = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });

export default function PermissionsPage() {
  const { employeeDetails } = useAuth();
  const { toast } = useToast();

  // 🔒 Normaliza SIEMPRE a number (evita "0" string o undefined)
  const employeeId = Number(employeeDetails?.employeeID ?? 0) || 0;

  const [activeTab, setActiveTab] = useState<"permissions" | "vacations">("permissions");
  const [isPermissionFormOpen, setIsPermissionFormOpen] = useState(false);
  const [isVacationFormOpen, setIsVacationFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  // ---- DEBUG: ver qué llega del contexto y cuándo habilitamos queries
  useEffect(() => {
    if (!DEBUG) return;
    console.group("🔍 PAGE DEBUG → PermissionsPage init");
    console.log("employeeDetails:", employeeDetails);
    console.log("employeeId (normalized):", employeeId, "enabled:", employeeId > 0);
    console.groupEnd();
  }, [employeeDetails, employeeId]);

  const {
    data: permissionsResp,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/permissions", "by-employee", employeeId],
    queryFn: async () => {
      if (DEBUG) console.log("▶️ Fetch PermisosAPI.getByEmployee(", employeeId, ")");
      const r = await PermisosAPI.getByEmployee(employeeId);
      if (DEBUG) console.log("✅ PermisosAPI response:", r);
      return r;
    },
    enabled: employeeId > 0,
    refetchOnWindowFocus: false,
  });

  const {
    data: vacationsResp,
    isLoading: vacationsLoading,
    error: vacationsError,
  } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/vacations", "by-employee", employeeId],
    queryFn: async () => {
      if (DEBUG) console.log("▶️ Fetch VacacionesAPI.getByEmployee(", employeeId, ")");
      const r = await VacacionesAPI.getByEmployee(employeeId);
      if (DEBUG) console.log("✅ VacacionesAPI response:", r);
      return r;
    },
    enabled: employeeId > 0,
    refetchOnWindowFocus: false,
  });

  const permissionsRaw = useMemo(() => {
    if (permissionsResp?.status !== "success") return [];
    const arr = permissionsResp.data || [];
    return Array.isArray(arr) ? arr : [];
  }, [permissionsResp]);

  const vacationsRaw = useMemo(() => {
    if (vacationsResp?.status !== "success") return [];
    const arr = vacationsResp.data || [];
    return Array.isArray(arr) ? arr : [];
  }, [vacationsResp]);

  // Orden descendente por startDate y luego endDate
  const permissions = useMemo(() => {
    const copy = [...permissionsRaw];
    copy.sort((a: any, b: any) => {
      const as = new Date(a.startDate).getTime();
      const bs = new Date(b.startDate).getTime();
      if (bs !== as) return bs - as;
      const ae = new Date(a.endDate ?? a.startDate).getTime();
      const be = new Date(b.endDate ?? b.startDate).getTime();
      return be - ae;
    });
    return copy;
  }, [permissionsRaw]);

  const vacations = useMemo(() => {
    const copy = [...vacationsRaw];
    copy.sort((a: any, b: any) => {
      const as = new Date(a.startDate).getTime();
      const bs = new Date(b.startDate).getTime();
      if (bs !== as) return bs - as;
      const ae = new Date(a.endDate ?? a.startDate).getTime();
      const be = new Date(b.endDate ?? b.startDate).getTime();
      return be - ae;
    });
    return copy;
  }, [vacationsRaw]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredPerms = useMemo(() => {
    if (!normalizedSearch) return permissions;
    return permissions.filter((p: any) => {
      const haystack = [
        `permiso #${p.id ?? p.permissionId}`,
        String(p.permissionTypeName ?? p.permissionTypeId ?? ""),
        String(p.employeeId ?? ""),
        String(p.status ?? ""),
        String(p.justification ?? ""),
        p.startDate ? new Date(p.startDate).toLocaleDateString() : "",
        p.endDate ? new Date(p.endDate).toLocaleDateString() : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [permissions, normalizedSearch]);

  const filteredVacs = useMemo(() => {
    if (!normalizedSearch) return vacations;
    return vacations.filter((v: any) => {
      const haystack = [
        `vacación #${v.id ?? v.vacationId}`,
        String(v.employeeId ?? ""),
        String(v.status ?? ""),
        v.startDate ? new Date(v.startDate).toLocaleDateString() : "",
        v.endDate ? new Date(v.endDate).toLocaleDateString() : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [vacations, normalizedSearch]);

  const anyLoading = permissionsLoading || vacationsLoading;

  const ErrorMessage = ({ error, apiResponse }: { error?: any; apiResponse?: ApiResponse<any> }) => {
    if (error) {
      if (DEBUG) console.error("❌ React Query error:", error);
      return <p className="text-red-600">Error al cargar los datos. Intente nuevamente.</p>;
    }
    if (apiResponse?.status === "error") {
      const details =
        (apiResponse.error?.details &&
          (apiResponse.error.details.message || apiResponse.error.details)) ||
        apiResponse.error?.message ||
        "Error desconocido";
      if (DEBUG) console.error("❌ API error:", apiResponse);
      return <p className="text-red-600">Error: {String(details)}</p>;
    }
    return null;
  };

  if (!employeeId) {
    // Aún no hay employeeId -> no dispares queries, muestra loader corto
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-2">Gestión de Permisos y Vacaciones</h1>
        <p className="text-gray-600">Cargando información del empleado…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Permisos y Vacaciones</h1>
          <p className="text-gray-600 mt-1">Solicitudes del empleado #{employeeId}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              className="pl-8 w-full sm:w-64"
              placeholder="Buscar en la tabla…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar"
            />
          </div>

          {activeTab === "permissions" ? (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsPermissionFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Solicitar Permiso
            </Button>
          ) : (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsVacationFormOpen(true)}>
              <Sun className="mr-2 h-4 w-4" />
              Solicitar Vacaciones
            </Button>
          )}
        </div>
      </div>

      {anyLoading ? (
        <div className="text-sm text-gray-600">Cargando…</div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
            <TabsTrigger value="vacations">Vacaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions">
            {permissionsError || permissionsResp?.status === "error" ? (
              <ErrorMessage error={permissionsError} apiResponse={permissionsResp} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border rounded-md text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="p-2">#</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Desde</th>
                      <th className="p-2">Hasta</th>
                      <th className="p-2">Horas</th>
                      <th className="p-2">Estado</th>
                      <th className="p-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPerms.map((p: any) => (
                      <tr key={p.id ?? p.permissionId} className="border-t">
                        <td className="p-2">#{p.id ?? p.permissionId}</td>
                        <td className="p-2">{p.permissionTypeName ?? p.permissionTypeId}</td>
                        <td className="p-2">{p.startDate ? fmt(p.startDate) : "-"}</td>
                        <td className="p-2">{p.endDate ? fmt(p.endDate) : "-"}</td>
                        <td className="p-2">{p.hourTaken ?? "-"}</td>
                        <td className="p-2">
                          <Badge className={permStatusColors[p.status] || "bg-gray-100 text-gray-800"}>
                            {permStatusLabels[p.status] || p.status}
                          </Badge>
                        </td>
                        <td className="p-2 truncate max-w-[320px]" title={p.justification ?? ""}>
                          {p.justification ?? "-"}
                        </td>
                      </tr>
                    ))}
                    {filteredPerms.length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-gray-600" colSpan={7}>
                          Sin resultados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="vacations">
            {vacationsError || vacationsResp?.status === "error" ? (
              <ErrorMessage error={vacationsError} apiResponse={vacationsResp} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border rounded-md text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="p-2">#</th>
                      <th className="p-2">Desde</th>
                      <th className="p-2">Hasta</th>
                      <th className="p-2">Días Concedidos</th>
                      <th className="p-2">Días Tomados</th>
                      <th className="p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVacs.map((v: any) => (
                      <tr key={v.id ?? v.vacationId} className="border-t">
                        <td className="p-2">#{v.id ?? v.vacationId}</td>
                        <td className="p-2">{v.startDate ? fmt(v.startDate) : "-"}</td>
                        <td className="p-2">{v.endDate ? fmt(v.endDate) : "-"}</td>
                        <td className="p-2">{v.daysGranted}</td>
                        <td className="p-2">{v.daysTaken}</td>
                        <td className="p-2">
                          <Badge className={vacStatusColors[v.status] || "bg-gray-100 text-gray-800"}>
                            {vacStatusLabels[v.status] || v.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {filteredVacs.length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-gray-600" colSpan={6}>
                          Sin resultados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={isPermissionFormOpen} onOpenChange={setIsPermissionFormOpen}>
        <DialogContent className="max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Solicitar Permiso</DialogTitle>
            <DialogDescription>Complete los datos para registrar una nueva solicitud de permiso.</DialogDescription>
          </DialogHeader>
          <PermissionForm
            onSuccess={() => {
              setIsPermissionFormOpen(false);
              toast({ title: "Permiso creado", description: "La solicitud fue registrada correctamente." });
            }}
            onCancel={() => setIsPermissionFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isVacationFormOpen} onOpenChange={setIsVacationFormOpen}>
        <DialogContent className="max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Solicitar Vacaciones</DialogTitle>
            <DialogDescription>Complete los datos para registrar su período de vacaciones.</DialogDescription>
          </DialogHeader>
          <VacationForm
            onSuccess={() => {
              setIsVacationFormOpen(false);
              toast({ title: "Vacaciones creadas", description: "La solicitud fue registrada correctamente." });
            }}
            onCancel={() => setIsVacationFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
