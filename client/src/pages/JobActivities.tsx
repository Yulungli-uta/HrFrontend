// src/pages/JobActivities.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  CargosAPI,
  CargosEspecializadosAPI,
  ActivityAPI,
  JobActivityAPI,
  DegreeAPI,
  OccupationalGroupAPI,
  ApiResponse,
  handleApiError,
} from "@/lib/api";
import {
  BriefcaseBusiness, Plus, Search, Layers, Workflow, GraduationCap, Users2, Settings2, Save, Check, X, Loader2,
} from "lucide-react";

// ============================================================================
// Tipos (flexibles para calzar con tu backend actual)
// ============================================================================
type Job = {
  jobID: number;
  description: string;
  jobTypeID?: number;
  groupID?: number | null;
  degreeID?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type Activity = {
  activitiesID: number;
  description: string;
  activitiesType?: string | null;
  isActive?: boolean;
};

type JobActivity = {
  jobActivityID: number;
  jobID: number;
  activitiesID: number;
  isActive?: boolean;
};

type Degree = {
  degreeID: number;
  description: string;
  isActive?: boolean;
};

type OccupationalGroup = {
  groupID: number;
  description: string;
  rmu?: number;
  degreeID?: number | null; // en tu diagrama group puede estar ligado a degree
  isActive?: boolean;
};

// ============================================================================
// Página principal
// ============================================================================
export default function JobActivitiesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // ------------------------------
  // Queries base
  // ------------------------------
  const { data: jobsResp, isLoading: loadingJobs, isError: errorJobs } = useQuery<ApiResponse<Job[]>>({
    queryKey: ["jobs"],
    queryFn: () => CargosAPI.list(),
  });

  const { data: activeJobsResp } = useQuery<ApiResponse<any>>({
    queryKey: ["jobs-active"],
    queryFn: () => CargosEspecializadosAPI.getActiveJobs(),
  });

  const jobs: Job[] = useMemo(() => jobsResp?.status === "success" ? (jobsResp.data || []) : [], [jobsResp]);
  const totalActive = useMemo(() => {
    if (activeJobsResp?.status === "success") return Array.isArray(activeJobsResp.data) ? activeJobsResp.data.length : 0;
    return jobs.filter(j => j.isActive).length;
  }, [activeJobsResp, jobs]);

  const { data: activitiesResp, isLoading: loadingActivities } = useQuery<ApiResponse<Activity[]>>({
    queryKey: ["activities"],
    queryFn: () => ActivityAPI.list(),
  });
  const activities = useMemo(() => activitiesResp?.status === "success" ? (activitiesResp.data || []) : [], [activitiesResp]);

  const { data: degreesResp } = useQuery<ApiResponse<Degree[]>>({
    queryKey: ["degrees"],
    queryFn: () => DegreeAPI.list(),
  });
  const degrees: Degree[] = useMemo(() => degreesResp?.status === "success" ? (degreesResp.data || []) : [], [degreesResp]);

  const { data: groupsResp } = useQuery<ApiResponse<OccupationalGroup[]>>({
    queryKey: ["groups"],
    queryFn: () => OccupationalGroupAPI.list(),
  });
  const groups: OccupationalGroup[] = useMemo(() => groupsResp?.status === "success" ? (groupsResp.data || []) : [], [groupsResp]);

  // Para contar actividades por cargo: traemos todas las relaciones (si tu backend tiene un endpoint mejor por job, cámbialo)
  const { data: jobActResp, isLoading: loadingJobActs } = useQuery<ApiResponse<JobActivity[]>>({
    queryKey: ["job-activities"],
    queryFn: () => JobActivityAPI.list(),
  });
  const allJobActivities: JobActivity[] = useMemo(
    () => jobActResp?.status === "success" ? (jobActResp.data || []) : [],
    [jobActResp]
  );

  // ------------------------------
  // Filtros y estadísticas
  // ------------------------------
  const filteredJobs = useMemo(() => {
    if (!searchTerm) return jobs;
    const t = searchTerm.toLowerCase();
    return jobs.filter(j =>
      `${j.description}`.toLowerCase().includes(t) ||
      String(j.jobID).includes(t)
    );
  }, [jobs, searchTerm]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const active = totalActive;
    const withDegree = jobs.filter(j => j.degreeID).length;
    const withGroup = jobs.filter(j => j.groupID).length;
    return { total, active, withDegree, withGroup };
  }, [jobs, totalActive]);

  // ========================================================================
  // Mutations: actualizar Degree/Group del cargo
  // ========================================================================
  const updateJobMutation = useMutation({
    mutationFn: async (payload: Partial<Job> & { jobID: number }) => {
      const { jobID, ...data } = payload;
      const resp = await CargosAPI.update(jobID, data as any);
      if (resp.status === "error") throw new Error(handleApiError(resp.error, "No se pudo actualizar el cargo"));
      return resp.data as Job;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Cargo actualizado", description: `${updated.description} actualizado correctamente.` });
      setOpenEdit(false);
      setSelectedJob(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "No se pudo actualizar el cargo", variant: "destructive" });
    },
  });

  // ========================================================================
  // Mutations: asignar / quitar actividades al cargo
  // ========================================================================
  const addJobActivity = useMutation({
    mutationFn: async ({ jobID, activitiesID }: { jobID: number; activitiesID: number }) => {
      const resp = await JobActivityAPI.create({ jobID, activitiesID } as any);
      if (resp.status === "error") throw new Error(handleApiError(resp.error, "No se pudo asignar la actividad"));
      return resp.data as JobActivity;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-activities"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "No se pudo asignar la actividad", variant: "destructive" });
    },
  });

  const removeJobActivity = useMutation({
    mutationFn: async ({ jobActivityID }: { jobActivityID: number }) => {
      const resp = await JobActivityAPI.remove(jobActivityID);
      if (resp.status === "error") throw new Error(handleApiError(resp.error, "No se pudo quitar la actividad"));
      return resp.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-activities"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "No se pudo quitar la actividad", variant: "destructive" });
    },
  });

  // ========================================================================
  // Estado local para formularios
  // ========================================================================
  const [tmpDegree, setTmpDegree] = useState<string>("");
  const [tmpGroup, setTmpGroup] = useState<string>("");

  useEffect(() => {
    if (selectedJob) {
      setTmpDegree(selectedJob.degreeID ? String(selectedJob.degreeID) : "");
      setTmpGroup(selectedJob.groupID ? String(selectedJob.groupID) : "");
    } else {
      setTmpDegree("");
      setTmpGroup("");
    }
  }, [selectedJob]);

  // Para la asignación de actividades
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (!selectedJob) return;
    const assigned = new Set(
      allJobActivities.filter(j => j.jobID === selectedJob.jobID).map(j => j.activitiesID)
    );
    const map: Record<number, boolean> = {};
    activities.forEach(a => { map[a.activitiesID] = assigned.has(a.activitiesID); });
    setCheckedMap(map);
  }, [selectedJob, allJobActivities, activities]);

  const assignedCountByJob = useMemo(() => {
    const map: Record<number, number> = {};
    allJobActivities.forEach(j => {
      map[j.jobID] = (map[j.jobID] || 0) + 1;
    });
    return map;
  }, [allJobActivities]);

  // Acciones
  const openEditJob = (job: Job) => {
    setSelectedJob(job);
    setOpenEdit(true);
  };

  const openAssignActivities = (job: Job) => {
    setSelectedJob(job);
    setOpenAssign(true);
  };

  const saveJobMeta = () => {
    if (!selectedJob) return;
    updateJobMutation.mutate({
      jobID: selectedJob.jobID,
      degreeID: tmpDegree ? Number(tmpDegree) : null,
      groupID: tmpGroup ? Number(tmpGroup) : null,
    });
  };

  const toggleActivity = async (activity: Activity, value: boolean) => {
    if (!selectedJob) return;

    // ¿ya existe la relación?
    const current = allJobActivities.find(
      ja => ja.jobID === selectedJob.jobID && ja.activitiesID === activity.activitiesID
    );

    if (value && !current) {
      // asignar
      addJobActivity.mutate({ jobID: selectedJob.jobID, activitiesID: activity.activitiesID });
      setCheckedMap(prev => ({ ...prev, [activity.activitiesID]: true }));
      toast({ title: "Actividad asignada", description: `"${activity.description}" asignada al cargo.` });
    } else if (!value && current) {
      // quitar
      removeJobActivity.mutate({ jobActivityID: current.jobActivityID });
      setCheckedMap(prev => ({ ...prev, [activity.activitiesID]: false }));
      toast({ title: "Actividad removida", description: `"${activity.description}" removida del cargo.` });
    }
  };

  // ------------------------------
  // Estados de error/carga
  // ------------------------------
  if (errorJobs) {
    const msg =
      jobsResp?.status === "error"
        ? handleApiError(jobsResp.error, "Error al cargar cargos")
        : "Error al cargar cargos";
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Gestión de Cargos & Actividades</h1>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">No se pudieron cargar los datos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{msg}</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["jobs"] });
                qc.invalidateQueries({ queryKey: ["activities"] });
                qc.invalidateQueries({ queryKey: ["job-activities"] });
              }}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingJobs || loadingActivities || loadingJobActs) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Cargos & Actividades</h1>
            <p className="text-gray-600 mt-2">Asigna actividades, grados y grupos ocupacionales</p>
          </div>
          <Button className="bg-uta-blue opacity-60" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cargo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Listado de Cargos</span>
              <div className="relative w-72">
                <div className="absolute left-2 top-2.5 h-4 w-4 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded w-full" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[...Array(6)].map((_, i) => (
                      <TableHead key={i}>
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========================================================================
  // Render
  // ========================================================================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Cargos & Actividades</h1>
          <p className="text-gray-600 mt-2">
            Asigna <b>actividades</b> a cada cargo y define su <b>grado</b> y <b>grupo ocupacional</b>.
          </p>
        </div>
        {/* (Opcional) Botón para crear cargos si lo necesitas más adelante */}
        <Button className="bg-uta-blue hover:bg-uta-blue/90" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cargo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cargos</CardTitle>
            <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-uta-blue">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Cargos disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Con Grado</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withDegree}</div>
            <p className="text-xs text-muted-foreground">Cargos con Degree asignado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Con Grupo Ocupacional</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.withGroup}</div>
            <p className="text-xs text-muted-foreground">Cargos con grupo asignado</p>
          </CardContent>
        </Card>
      </div>

      {/* Buscador + Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Listado de Cargos</span>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Degree</TableHead>
                  <TableHead>Grupo Ocupacional</TableHead>
                  <TableHead className="text-center"># Actividades</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {searchTerm ? "Sin resultados con ese criterio" : "No hay cargos registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => {
                    const degreeName = degrees.find(d => d.degreeID === job.degreeID)?.description || "—";
                    const groupName = groups.find(g => g.groupID === job.groupID)?.description || "—";
                    const count = assignedCountByJob[job.jobID] || 0;

                    return (
                      <TableRow key={job.jobID}>
                        <TableCell className="font-medium">{job.description}</TableCell>
                        <TableCell>{degreeName}</TableCell>
                        <TableCell>{groupName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={job.isActive ? "default" : "secondary"}>
                            {job.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditJob(job)}
                          >
                            <Settings2 className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignActivities(job)}
                          >
                            <Workflow className="h-4 w-4 mr-2" />
                            Actividades
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredJobs.length > 0 && (
            <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
              <span>Mostrando {filteredJobs.length} de {jobs.length} cargos</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Editar grado/grupo */}
      <Dialog open={openEdit} onOpenChange={(o) => { setOpenEdit(o); if (!o) setSelectedJob(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Cargo</DialogTitle>
            <DialogDescription>Definir Degree y Grupo Ocupacional</DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Cargo</div>
                <div className="font-semibold">{selectedJob.description}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm mb-2">Degree</div>
                  <Select value={tmpDegree} onValueChange={setTmpDegree}>
                    <SelectTrigger><SelectValue placeholder="Seleccione degree" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Ninguno —</SelectItem>
                      {degrees.map(d => (
                        <SelectItem key={d.degreeID} value={String(d.degreeID)}>
                          {d.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="text-sm mb-2">Grupo Ocupacional</div>
                  <Select value={tmpGroup} onValueChange={setTmpGroup}>
                    <SelectTrigger><SelectValue placeholder="Seleccione grupo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Ninguno —</SelectItem>
                      {groups.map(g => (
                        <SelectItem key={g.groupID} value={String(g.groupID)}>
                          {g.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenEdit(false)}>
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button className="bg-uta-blue hover:bg-uta-blue/90" onClick={saveJobMeta} disabled={updateJobMutation.isPending}>
                  {updateJobMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Asignar actividades */}
      <Dialog open={openAssign} onOpenChange={(o) => { setOpenAssign(o); if (!o) setSelectedJob(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Actividades por Cargo</DialogTitle>
            <DialogDescription>Activa o desactiva las actividades que corresponden al cargo.</DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">Cargo</div>
              <div className="font-semibold">{selectedJob.description}</div>

              <Separator />

              <div className="h-[420px] rounded border">
                <ScrollArea className="h-full p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activities.map((a) => {
                      const checked = !!checkedMap[a.activitiesID];
                      return (
                        <label
                          key={a.activitiesID}
                          className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v: boolean) => toggleActivity(a, v)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{a.description}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {a.activitiesID}{a.activitiesType ? ` • ${a.activitiesType}` : ""}
                            </div>
                          </div>
                          {checked ? (
                            <Badge className="ml-2" variant="default"><Check className="h-3 w-3 mr-1" /> Asignada</Badge>
                          ) : (
                            <Badge className="ml-2" variant="secondary">Disponible</Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setOpenAssign(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
