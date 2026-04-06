// src/pages/JobActivities.tsx

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Plus,
  Briefcase,
  ListChecks,
  Building2,
  GraduationCap,
  Wrench,
  CheckCircle2,
  XCircle,
  Search,
  Link2,
  Link2Off,
  RefreshCw,
  LinkIcon,
} from "lucide-react";

import {
  CargosAPI,
  DegreeAPI,
  OccupationalGroupAPI,
  ActivityAPI,
  AdditionalActivityAPI,
  JobActivityAPI,
  type ApiResponse,
} from "@/lib/api";

import { useToast } from "@/hooks/use-toast";

import {
  Activity,
  Degree,
  Job,
  JobActivity,
  OccupationalGroup,
  normalizeActivity,
  normalizeDegree,
  normalizeJob,
  normalizeJobActivity,
  normalizeOccupationalGroup,
} from "@/types/Job-activities";
import { JobDetailForm } from "@/components/job-activities/JobDetailForm";
import { DegreeForm } from "@/components/job-activities/DegreeForm";
import { OccupationalGroupForm } from "@/components/job-activities/OccupationalGroupForm";
import { ActivityForm } from "@/components/job-activities/ActivityForm";
import { parseApiError } from '@/lib/error-handling';

// -------- Helpers para manejo de ApiResponse --------

function ensureSuccess<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (res.status === "error") {
    throw new Error(res.error.message || defaultMessage);
  }
  return res.data;
}

// =======================
// COMPONENTE PRINCIPAL
// =======================

export default function JobActivitiesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Estado de selección
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [searchJob, setSearchJob] = useState("");
  const [searchActivity, setSearchActivity] = useState("");

  // Dialogs
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isDegreeDialogOpen, setIsDegreeDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);

  // Modo formulario (create / edit)
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editingDegree, setEditingDegree] = useState<Degree | null>(null);
  const [editingGroup, setEditingGroup] = useState<OccupationalGroup | null>(
    null
  );
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // ========================
  // QUERIES
  // ========================

  const {
    data: jobsRes,
    isLoading: loadingJobs,
    error: jobsError,
  } = useQuery<ApiResponse<any[]>>({
    queryKey: ["/api/v1/rh/jobs"],
    queryFn: () => CargosAPI.list() as Promise<ApiResponse<any[]>>,
  });

  const {
    data: degreesRes,
    isLoading: loadingDegrees,
    error: degreesError,
  } = useQuery<ApiResponse<any[]>>({
    queryKey: ["/api/v1/rh/degrees"],
    queryFn: () => DegreeAPI.list() as Promise<ApiResponse<any[]>>,
  });

  const {
    data: groupsRes,
    isLoading: loadingGroups,
    error: groupsError,
  } = useQuery<ApiResponse<any[]>>({
    queryKey: ["/api/v1/rh/occupational-group"],
    queryFn: () =>
      OccupationalGroupAPI.list() as Promise<ApiResponse<any[]>>,
  });

  const {
    data: laboralActivitiesRes,
    isLoading: loadingLaboralActivities,
    error: laboralActivitiesError,
  } = useQuery<ApiResponse<any[]>>({
    queryKey: ["/api/v1/rh/activity"],
    queryFn: () => ActivityAPI.list() as Promise<ApiResponse<any[]>>,
  });

  const {
    data: additionalActivitiesRes,
    isLoading: loadingAdditionalActivities,
    error: additionalActivitiesError,
  } = useQuery<ApiResponse<any[]>>({
    queryKey: ["/api/v1/rh/additional-activity"],
    queryFn: () =>
      AdditionalActivityAPI.list() as Promise<ApiResponse<any[]>>,
  });

  const {
    data: jobActivitiesRes,
    isLoading: loadingJobActivities,
    error: jobActivitiesError,
  } = useQuery<ApiResponse<any[]>>({
    queryKey: ["/api/v1/rh/job-activities"],
    queryFn: () =>
      JobActivityAPI.list() as Promise<ApiResponse<any[]>>,
  });

  // Normalización de datos desde API (robusto a camelCase/PascalCase)
  const jobs: Job[] =
    jobsRes?.status === "success"
      ? jobsRes.data.map((j) => normalizeJob(j))
      : [];

  const degrees: Degree[] =
    degreesRes?.status === "success"
      ? degreesRes.data.map((d) => normalizeDegree(d))
      : [];

  const groups: OccupationalGroup[] =
    groupsRes?.status === "success"
      ? groupsRes.data.map((g) => normalizeOccupationalGroup(g))
      : [];

  const laboralActivities: Activity[] =
    laboralActivitiesRes?.status === "success"
      ? laboralActivitiesRes.data.map((a) => normalizeActivity(a))
      : [];

  const additionalActivities: Activity[] =
    additionalActivitiesRes?.status === "success"
      ? additionalActivitiesRes.data.map((a) => normalizeActivity(a))
      : [];

  const jobActivities: JobActivity[] =
    jobActivitiesRes?.status === "success"
      ? jobActivitiesRes.data.map((ja) => normalizeJobActivity(ja))
      : [];

  // ========================
  // DERIVADOS / MEMO
  // ========================

  const filteredJobs = useMemo(() => {
    const term = searchJob.trim().toLowerCase();
    if (!term) return jobs;

    return jobs.filter((job) => {
      const desc = job.description?.toLowerCase() ?? "";
      return desc.includes(term);
    });
  }, [jobs, searchJob]);

  const mapDegreeById = useMemo(
    () =>
      new Map<number, Degree>(
        degrees.map((d) => [d.degreeId, d] as [number, Degree])
      ),
    [degrees]
  );

  const mapGroupById = useMemo(
    () =>
      new Map<number, OccupationalGroup>(
        groups.map((g) => [g.groupId, g] as [number, OccupationalGroup])
      ),
    [groups]
  );

  const selectedJob = useMemo(
    () =>
      selectedJobId != null
        ? jobs.find((j) => j.jobID === selectedJobId) ?? null
        : null,
    [jobs, selectedJobId]
  );

  const allActivities: Activity[] = useMemo(
    () => [
      ...laboralActivities.map((a) => ({
        ...a,
        activitiesType: "LABORAL" as const,
      })),
      ...additionalActivities.map((a) => ({
        ...a,
        activitiesType: "ADICIONAL" as const,
      })),
    ],
    [laboralActivities, additionalActivities]
  );

  const filteredActivities = useMemo(() => {
    const term = searchActivity.trim().toLowerCase();
    if (!term) return allActivities;

    return allActivities.filter((a) =>
      (a.description ?? "").toLowerCase().includes(term)
    );
  }, [allActivities, searchActivity]);

  const assignedActivityIds = useMemo(() => {
    if (!selectedJob) return new Set<number>();
    return new Set(
      jobActivities
        .filter((ja) => ja.jobID === selectedJob.jobID && ja.isActive)
        .map((ja) => ja.activitiesID)
    );
  }, [jobActivities, selectedJob]);

  // ========================
  // MUTATIONS
  // ========================

  // Degrees
  const degreeMutation = useMutation({
    mutationFn: async (data: {
      degreeId?: number;
      description: string;
      isActive: boolean;
    }) => {
      if (data.degreeId && data.degreeId > 0) {
        const res = await DegreeAPI.update(data.degreeId, {
          description: data.description,
          isActive: data.isActive,
        });
        return ensureSuccess(res, "Error al actualizar grado");
      } else {
        const res = await DegreeAPI.create({
          description: data.description,
          isActive: data.isActive,
        });
        return ensureSuccess(res, "Error al crear grado");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/degrees"] });
      toast({
        title: "✅ Grado guardado",
        description: "La información del grado se ha guardado correctamente.",
      });
      setEditingDegree(null);
      setIsDegreeDialogOpen(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "❌ Error al guardar grado",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    },
  });

  // Occupational Group
  const groupMutation = useMutation({
    mutationFn: async (data: {
      groupId?: number;
      description: string;
      degreeId: number;
      rmu: number;
      isActive: boolean;
    }) => {
      const payload = {
        description: data.description,
        degreeId: data.degreeId,
        rmu: data.rmu,
        isActive: data.isActive,
      };

      if (data.groupId && data.groupId > 0) {
        const res = await OccupationalGroupAPI.update(data.groupId, payload);
        return ensureSuccess(res, "Error al actualizar grupo ocupacional");
      } else {
        const res = await OccupationalGroupAPI.create(payload);
        return ensureSuccess(res, "Error al crear grupo ocupacional");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/rh/occupational-group"],
      });
      toast({
        title: "✅ Grupo ocupacional guardado",
        description: "El grupo ocupacional se ha guardado correctamente.",
      });
      setEditingGroup(null);
      setIsGroupDialogOpen(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "❌ Error al guardar grupo ocupacional",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    },
  });

  // Jobs
  const jobMutation = useMutation({
    mutationFn: async (data: {
      jobID?: number;
      description: string;
      jobTypeId: number | null;
      groupId: number | null;
      isActive: boolean;
    }) => {
      const payload = {
        description: data.description,
        jobTypeId: data.jobTypeId,
        groupId: data.groupId,
        isActive: data.isActive,
      };

      if (data.jobID && data.jobID > 0) {
        const res = await CargosAPI.update(data.jobID, payload);
        return ensureSuccess(res, "Error al actualizar cargo");
      } else {
        const res = await CargosAPI.create(payload);
        return ensureSuccess(res, "Error al crear cargo");
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/jobs"] });
      toast({
        title: "✅ Cargo guardado",
        description: "Los datos del cargo se han guardado correctamente.",
      });
      setEditingJob(null);
      setIsJobDialogOpen(false);
      const savedJob = normalizeJob(saved as any);
      if (savedJob.jobID) {
        setSelectedJobId(savedJob.jobID);
      }
    },
    onError: (error: unknown) => {
      toast({
        title: "❌ Error al guardar cargo",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    },
  });

  // Activities (Laboral + Adicional)
  const activityMutation = useMutation({
    mutationFn: async (data: {
      activitiesID?: number;
      description: string;
      activitiesType: "LABORAL" | "ADICIONAL";
      isActive: boolean;
    }) => {
      const payload = {
        description: data.description,
        activitiesType: data.activitiesType,
        isActive: data.isActive,
      };

      if (data.activitiesType === "LABORAL") {
        if (data.activitiesID && data.activitiesID > 0) {
          const res = await ActivityAPI.update(data.activitiesID, payload);
          return ensureSuccess(res, "Error al actualizar actividad laboral");
        } else {
          const res = await ActivityAPI.create(payload);
          return ensureSuccess(res, "Error al crear actividad laboral");
        }
      } else {
        if (data.activitiesID && data.activitiesID > 0) {
          const res = await AdditionalActivityAPI.update(
            data.activitiesID,
            payload
          );
          return ensureSuccess(
            res,
            "Error al actualizar actividad adicional"
          );
        } else {
          const res = await AdditionalActivityAPI.create(payload);
          return ensureSuccess(res, "Error al crear actividad adicional");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/activity"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/rh/additional-activity"],
      });
      toast({
        title: "✅ Actividad guardada",
        description: "La actividad se ha guardado correctamente.",
      });
      setEditingActivity(null);
      setIsActivityDialogOpen(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "❌ Error al guardar actividad",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    },
  });

  // JobActivities (asignación)
  const assignMutation = useMutation({
    mutationFn: async (data: { jobID: number; activitiesID: number }) => {
      const res = await JobActivityAPI.create({
        jobID: data.jobID,
        activitiesID: data.activitiesID,
        isActive: true,
      } as any);
      return ensureSuccess(res, "Error al asignar actividad al cargo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/job-activities"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "❌ Error al asignar actividad",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (jobActivity: JobActivity) => {
      // Intento estándar: si backend soporta /job-activity/{id}
      const res = await JobActivityAPI.remove(jobActivity.id);
      return ensureSuccess(res, "Error al desasignar actividad");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/job-activities"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "❌ Error al desasignar actividad",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    },
  });

  // ========================
  // HANDLERS
  // ========================

  const handleSelectJob = (job: Job) => {
    if (!job.jobID) return;
    setSelectedJobId(job.jobID);
  };

  const handleOpenNewJob = () => {
    setEditingJob({
      jobID: 0,
      description: "",
      jobTypeId: null,
      groupId: null,
      isActive: true,
      createdAt: undefined,
      updatedAt: undefined,
    });
    setIsJobDialogOpen(true);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setIsJobDialogOpen(true);
  };

  const handleSaveJob = (form: {
    jobID?: number;
    description: string;
    jobTypeId: number | null;
    groupId: number | null;
    isActive: boolean;
  }) => {
    if (!form.description.trim()) {
      toast({
        title: "Validación",
        description: "La descripción del cargo es obligatoria.",
        variant: "destructive",
      });
      return;
    }
    jobMutation.mutate(form);
  };

  const handleOpenNewDegree = () => {
    setEditingDegree({
      degreeId: 0,
      description: "",
      isActive: true,
      createdAt: "",
      updatedAt: null,
    });
    setIsDegreeDialogOpen(true);
  };

  const handleOpenEditDegree = (degree: Degree) => {
    setEditingDegree(degree);
    setIsDegreeDialogOpen(true);
  };

  const handleSaveDegree = (form: {
    degreeId?: number;
    description: string;
    isActive: boolean;
  }) => {
    if (!form.description.trim()) {
      toast({
        title: "Validación",
        description: "La descripción del grado es obligatoria.",
        variant: "destructive",
      });
      return;
    }
    degreeMutation.mutate(form);
  };

  const handleOpenNewGroup = () => {
    const defaultDegreeId = degrees[0]?.degreeId ?? 0;
    setEditingGroup({
      groupId: 0,
      description: "",
      degreeId: defaultDegreeId,
      rmu: 0,
      isActive: true,
      createdAt: "",
      updatedAt: null,
    });
    setIsGroupDialogOpen(true);
  };

  const handleOpenEditGroup = (group: OccupationalGroup) => {
    setEditingGroup(group);
    setIsGroupDialogOpen(true);
  };

  const handleSaveGroup = (form: {
    groupId?: number;
    description: string;
    degreeId: number;
    rmu: number;
    isActive: boolean;
  }) => {
    if (!form.description.trim()) {
      toast({
        title: "Validación",
        description: "La descripción del grupo ocupacional es obligatoria.",
        variant: "destructive",
      });
      return;
    }
    groupMutation.mutate({ ...form, rmu: Number(form.rmu) || 0 });
  };

  const handleOpenNewActivity = (type: "LABORAL" | "ADICIONAL") => {
    setEditingActivity({
      activitiesID: 0,
      description: "",
      activitiesType: type,
      isActive: true,
      createdAt: "",
      updatedAt: null,
    });
    setIsActivityDialogOpen(true);
  };

  const handleOpenEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setIsActivityDialogOpen(true);
  };

  const handleSaveActivity = (form: {
    activitiesID?: number;
    description: string;
    activitiesType: "LABORAL" | "ADICIONAL";
    isActive: boolean;
  }) => {
    if (!form.description.trim()) {
      toast({
        title: "Validación",
        description: "La descripción de la actividad es obligatoria.",
        variant: "destructive",
      });
      return;
    }
    activityMutation.mutate(form);
  };

  const handleToggleAssign = (activity: Activity) => {
    if (!selectedJob) {
      toast({
        title: "Seleccione un cargo",
        description:
          "Debe seleccionar un cargo para asignar o quitar actividades.",
        variant: "destructive",
      });
      return;
    }

    // Validación adicional: verificar que el jobID sea válido
    if (!selectedJob.jobID || selectedJob.jobID <= 0) {
      toast({
        title: "Error de validación",
        description: `El cargo seleccionado no tiene un ID válido (${selectedJob.jobID})`,
        variant: "destructive",
      });
      console.error("JobID inválido:", selectedJob);
      return;
    }

    // Validación: verificar que el activitiesID sea válido
    if (!activity.activitiesID || activity.activitiesID <= 0) {
      toast({
        title: "Error de validación",
        description: `La actividad seleccionada no tiene un ID válido (${activity.activitiesID})`,
        variant: "destructive",
      });
      console.error("ActivitiesID inválido:", activity);
      return;
    }

    const alreadyAssigned = jobActivities.find(
      (ja) =>
        ja.jobID === selectedJob.jobID &&
        ja.activitiesID === activity.activitiesID &&
        ja.isActive
    );

    if (alreadyAssigned) {
      // Desasignar
      unassignMutation.mutate(alreadyAssigned);
    } else {
      // Asignar
      console.log("Asignando actividad:", {
        jobID: selectedJob.jobID,
        activitiesID: activity.activitiesID,
        selectedJob,
        activity
      });
      assignMutation.mutate({
        jobID: selectedJob.jobID,
        activitiesID: activity.activitiesID,
      });
    }
  };

  // ========================
  // LOADING / ERROR SIMPLE
  // ========================

  const someLoading =
    loadingJobs ||
    loadingDegrees ||
    loadingGroups ||
    loadingLaboralActivities ||
    loadingAdditionalActivities ||
    loadingJobActivities;

  if (someLoading && !jobs.length) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-2/3 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const globalError =
    jobsError ||
    degreesError ||
    groupsError ||
    laboralActivitiesError ||
    additionalActivitiesError ||
    jobActivitiesError;

  if (globalError) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error al cargar información de cargos/actividades. Revise la
              conexión o intente nuevamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========================
  // RENDER
  // ========================

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" />
            Gestión de Cargos y Actividades
          </h1>
          <p className="text-muted-foreground mt-2 text-sm lg:text-base max-w-2xl">
            Administre los grados, grupos ocupacionales, cargos y actividades
            laborales en una sola pantalla, asegurando consistencia e integridad
            de la información.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: ["/api/v1/rh/jobs"],
              });
              queryClient.invalidateQueries({
                queryKey: ["/api/v1/rh/degrees"],
              });
              queryClient.invalidateQueries({
                queryKey: ["/api/v1/rh/occupational-group"],
              });
              queryClient.invalidateQueries({
                queryKey: ["/api/v1/rh/activity"],
              });
              queryClient.invalidateQueries({
                queryKey: ["/api/v1/rh/additional-activity"],
              });
              queryClient.invalidateQueries({
                queryKey: ["/api/v1/rh/job-activities"],
              });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar datos
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/10 dark:bg-primary/15 border-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary p-2 rounded-full">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary">Cargos</p>
              <p className="text-2xl font-bold text-primary">
                {jobs.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 dark:bg-primary/15 border-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-full">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-900">Grados</p>
              <p className="text-2xl font-bold text-primary">
                {degrees.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/10 dark:bg-success/15 border-success/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-full">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-900">
                Grupos Ocupacionales
              </p>
              <p className="text-2xl font-bold text-success">
                {groups.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/10 dark:bg-warning/15 border-warning/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-full">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-orange-900">
                Actividades totales
              </p>
              <p className="text-2xl font-bold text-secondary-foreground">
                {allActivities.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABS PRINCIPALES */}
      <Tabs defaultValue="cargos" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="cargos">Cargos y actividades</TabsTrigger>
          <TabsTrigger value="clasificaciones">
            Grados y grupos ocupacionales
          </TabsTrigger>
          <TabsTrigger value="actividades">Catálogo de actividades</TabsTrigger>
        </TabsList>

        {/* TAB CARGOS */}
        <TabsContent value="cargos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Columna izquierda: listado de cargos */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Cargos
                  </span>
                  <Button
                    size="sm"
                    onClick={handleOpenNewJob}
                    data-testid="button-add-job"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo
                  </Button>
                </CardTitle>
                <CardDescription>
                  Seleccione un cargo para ver y editar su detalle y actividades.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchJob}
                    onChange={(e) => setSearchJob(e.target.value)}
                    placeholder="Buscar cargo por descripción..."
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-[420px] border rounded-md">
                  <Table>
                    <TableBody>
                      {filteredJobs.map((job) => {
                        const group = job.groupId
                          ? mapGroupById.get(job.groupId)
                          : undefined;
                        const isSelected = selectedJobId === job.jobID;
                        return (
                          <TableRow
                            key={job.jobID || `job-${job.description}`}
                            className={`cursor-pointer hover:bg-primary/10 ${
                              isSelected ? "bg-primary/10/60" : ""
                            }`}
                            onClick={() => handleSelectJob(job)}
                          >
                            <TableCell className="align-top">
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">
                                  {job.description || "(Sin descripción)"}
                                </span>
                                {group && (
                                  <span className="text-xs text-muted-foreground">
                                    Grupo: {group.description}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-[90px] text-right align-top">
                              <Badge
                                variant={
                                  job.isActive ? "default" : "secondary"
                                }
                                className={
                                  job.isActive
                                    ? "bg-success/15 text-success"
                                    : "bg-muted text-foreground"
                                }
                              >
                                {job.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditJob(job);
                                }}
                              >
                                <Wrench className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredJobs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="py-6 text-center">
                            <p className="text-sm text-muted-foreground">
                              No hay cargos que coincidan con la búsqueda.
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Columna derecha: detalle del cargo + actividades */}
            <div className="lg:col-span-2 space-y-4">
              {/* Detalle del cargo */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    Detalle del cargo
                  </CardTitle>
                  <CardDescription>
                    Edite la información básica del cargo. Los cambios afectan
                    todos los procesos que usan este cargo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedJob ? (
                    <JobDetailForm
                      key={selectedJob.jobID} // clave para forzar reinit al cambiar cargo
                      job={selectedJob}
                      groups={groups}
                      onSave={handleSaveJob}
                      saving={jobMutation.isPending}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Seleccione un cargo en el panel izquierdo para ver su
                      detalle.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Asignación de actividades */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-secondary-foreground" />
                    Actividades asociadas al cargo
                  </CardTitle>
                  <CardDescription>
                    Asigne o quite actividades laborales y adicionales para el
                    cargo seleccionado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedJob ? (
                    <>
                      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                        <div className="text-sm">
                          <span className="font-semibold">
                            Cargo seleccionado:
                          </span>{" "}
                          {selectedJob.description || "(Sin descripción)"}
                        </div>
                        <div className="relative md:w-64">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchActivity}
                            onChange={(e) =>
                              setSearchActivity(e.target.value)
                            }
                            placeholder="Filtrar actividades..."
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <ScrollArea className="h-[280px] border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Actividad</TableHead>
                              <TableHead className="w-[110px]">Tipo</TableHead>
                              <TableHead className="w-[130px] text-center">
                                Estado
                              </TableHead>
                              <TableHead className="w-[120px] text-center">
                                Acción
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredActivities.map((act) => {
                              const isAssigned = assignedActivityIds.has(
                                act.activitiesID
                              );
                              const isWorking =
                                assignMutation.isPending ||
                                unassignMutation.isPending;

                              return (
                                <TableRow key={act.activitiesID}>
                                  <TableCell>
                                    <div className="text-sm">
                                      {act.description || "(Sin descripción)"}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={
                                        act.activitiesType === "LABORAL"
                                          ? "bg-primary/10 text-primary border-primary/30"
                                          : "bg-secondary/10 text-secondary-foreground border-warning/30"
                                      }
                                    >
                                      {act.activitiesType === "LABORAL"
                                        ? "Laboral"
                                        : "Adicional"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {isAssigned ? (
                                      <Badge className="bg-success/15 text-success">
                                        Asignada
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-muted-foreground"
                                      >
                                        No asignada
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      size="sm"
                                      variant={
                                        isAssigned ? "outline" : "default"
                                      }
                                      disabled={isWorking}
                                      onClick={() => handleToggleAssign(act)}
                                    >
                                      {isAssigned ? (
                                        <>
                                          <Link2Off className="h-4 w-4 mr-1" />
                                          Quitar
                                        </>
                                      ) : (
                                        <>
                                          <Link2 className="h-4 w-4 mr-1" />
                                          Asignar
                                        </>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {filteredActivities.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-center py-6 text-sm text-muted-foreground"
                                >
                                  No hay actividades que coincidan con el filtro.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Seleccione primero un cargo para gestionar sus actividades
                      asociadas.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB CLASIFICACIONES */}
        <TabsContent value="clasificaciones" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* GRADOS */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Grados
                  </span>
                  <Button size="sm" onClick={handleOpenNewDegree}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo
                  </Button>
                </CardTitle>
                <CardDescription>
                  Grados académicos / jerárquicos utilizados para agrupar puestos
                  y grupos ocupacionales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[360px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[120px] text-right">
                          Estado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {degrees.map((deg) => (
                        <TableRow
                          key={deg.degreeId}
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => handleOpenEditDegree(deg)}
                        >
                          <TableCell>
                            <span className="text-sm font-medium">
                              {deg.description}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                deg.isActive ? "default" : "secondary"
                              }
                              className={
                                deg.isActive
                                  ? "bg-success/15 text-success"
                                  : "bg-muted text-foreground"
                              }
                            >
                              {deg.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {degrees.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center py-6 text-sm text-muted-foreground"
                          >
                            No hay grados registrados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* GRUPOS OCUPACIONALES */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-success" />
                    Grupos Ocupacionales
                  </span>
                  <Button size="sm" onClick={handleOpenNewGroup}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo
                  </Button>
                </CardTitle>
                <CardDescription>
                  Grupos que agrupan puestos según nivel, RMU y grado asociado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[360px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Grado</TableHead>
                        <TableHead className="w-[110px] text-right">
                          RMU
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.map((g) => {
                        const degree = mapDegreeById.get(g.degreeId);
                        return (
                          <TableRow
                            key={g.groupId}
                            className="cursor-pointer hover:bg-emerald-50"
                            onClick={() => handleOpenEditGroup(g)}
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {g.description}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ID: {g.groupId}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs">
                                {degree?.description ?? "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-sm">
                                ${g.rmu.toFixed(2)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {groups.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center py-6 text-sm text-muted-foreground"
                          >
                            No hay grupos ocupacionales registrados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB ACTIVIDADES */}
        <TabsContent value="actividades" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
            {/* ACTIVIDADES LABORALES */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    Actividades laborales
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleOpenNewActivity("LABORAL")}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nueva
                  </Button>
                </CardTitle>
                <CardDescription>
                  Actividades propias del perfil del cargo, consideradas en la
                  descripción de puesto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[360px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[100px] text-right">
                          Estado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {laboralActivities.map((act) => (
                        <TableRow
                          key={act.activitiesID}
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => handleOpenEditActivity(act)}
                        >
                          <TableCell>
                            <span className="text-sm">
                              {act.description || "(Sin descripción)"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                act.isActive ? "default" : "secondary"
                              }
                              className={
                                act.isActive
                                  ? "bg-success/15 text-success"
                                  : "bg-muted text-foreground"
                              }
                            >
                              {act.isActive ? "Activa" : "Inactiva"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {laboralActivities.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center py-6 text-sm text-muted-foreground"
                          >
                            No hay actividades laborales registradas.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* ACTIVIDADES ADICIONALES */}
            {/* <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-secondary-foreground" />
                    Actividades adicionales
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleOpenNewActivity("ADICIONAL")}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nueva
                  </Button>
                </CardTitle>
                <CardDescription>
                  Actividades complementarias o adicionales que puede ejecutar
                  el servidor público.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[360px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[100px] text-right">
                          Estado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {additionalActivities.map((act) => (
                        <TableRow
                          key={act.activitiesID}
                          className="cursor-pointer hover:bg-secondary/10"
                          onClick={() => handleOpenEditActivity(act)}
                        >
                          <TableCell>
                            <span className="text-sm">
                              {act.description || "(Sin descripción)"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                act.isActive ? "default" : "secondary"
                              }
                              className={
                                act.isActive
                                  ? "bg-success/15 text-success"
                                  : "bg-muted text-foreground"
                              }
                            >
                              {act.isActive ? "Activa" : "Inactiva"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {additionalActivities.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center py-6 text-sm text-muted-foreground"
                          >
                            No hay actividades adicionales registradas.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card> */}
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOGS (CRUD FORMS) */}

      {/* Dialog Cargo */}
      <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {editingJob && editingJob.jobID
                ? "Editar cargo"
                : "Nuevo cargo"}
            </DialogTitle>
            <DialogDescription>
              Complete la información básica del cargo.
            </DialogDescription>
          </DialogHeader>

          {editingJob && (
            <JobDetailForm
              key={editingJob.jobID || "nuevo"}
              job={editingJob}
              groups={groups}
              inlineMode={false}
              onSave={handleSaveJob}
              saving={jobMutation.isPending}
              onCancel={() => {
                setEditingJob(null);
                setIsJobDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Grado */}
      <Dialog open={isDegreeDialogOpen} onOpenChange={setIsDegreeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              {editingDegree && editingDegree.degreeId
                ? "Editar grado"
                : "Nuevo grado"}
            </DialogTitle>
            <DialogDescription>
              Gestión de grados usados en la estructura ocupacional.
            </DialogDescription>
          </DialogHeader>

          {editingDegree && (
            <DegreeForm
              key={editingDegree.degreeId || "nuevo"}
              degree={editingDegree}
              saving={degreeMutation.isPending}
              onSave={handleSaveDegree}
              onCancel={() => {
                setEditingDegree(null);
                setIsDegreeDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Grupo Ocupacional */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-success" />
              {editingGroup && editingGroup.groupId
                ? "Editar grupo ocupacional"
                : "Nuevo grupo ocupacional"}
            </DialogTitle>
            <DialogDescription>
              Defina la relación entre grado y RMU para agrupar cargos.
            </DialogDescription>
          </DialogHeader>

          {editingGroup && (
            <OccupationalGroupForm
              key={editingGroup.groupId || "nuevo"}
              group={editingGroup}
              degrees={degrees}
              saving={groupMutation.isPending}
              onSave={handleSaveGroup}
              onCancel={() => {
                setEditingGroup(null);
                setIsGroupDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Actividad */}
      <Dialog
        open={isActivityDialogOpen}
        onOpenChange={setIsActivityDialogOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-secondary-foreground" />
              {editingActivity && editingActivity.activitiesID
                ? "Editar actividad"
                : "Nueva actividad"}
            </DialogTitle>
            <DialogDescription>
              Defina o actualice una actividad de cargo.
            </DialogDescription>
          </DialogHeader>

          {editingActivity && (
            <ActivityForm
              key={editingActivity.activitiesID || "nuevo"}
              activity={editingActivity}
              saving={activityMutation.isPending}
              onSave={handleSaveActivity}
              onCancel={() => {
                setEditingActivity(null);
                setIsActivityDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
