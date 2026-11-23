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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Briefcase,
  ListChecks,
  Building2,
  GraduationCap,
  Wrench,
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
  type PagedRequest,
  type PagedResult,
} from "@/lib/api";

import { useToast } from "@/hooks/use-toast";

import {
  Activity,
  Degree,
  Job,
  JobActivity,
  OccupationalGroup,
  normalizeJob,
  normalizeJobActivity,
} from "@/types/Job-activities";
import { JobDetailForm } from "@/components/job-activities/JobDetailForm";
import { JobsListPanel } from "@/components/job-activities/JobsListPanel";
import { JobActivitiesAssignPanel } from "@/components/job-activities/JobActivitiesAssignPanel";
import { DegreesPanel } from "@/components/job-activities/DegreesPanel";
import { OccupationalGroupsPanel } from "@/components/job-activities/OccupationalGroupsPanel";
import { ActivitiesPanel } from "@/components/job-activities/ActivitiesPanel";
import { JOB_ACTIVITIES_KEYS, JOB_ACTIVITIES_QUERY_KEY } from "@/components/job-activities/queryKeys";
import { DegreeForm } from "@/components/job-activities/DegreeForm";
import { OccupationalGroupForm } from "@/components/job-activities/OccupationalGroupForm";
import { ActivityForm } from "@/components/job-activities/ActivityForm";
import { parseApiError } from '@/lib/error-handling';
import { logger } from "@/lib/logger";

// -------- Helpers para manejo de ApiResponse --------

function ensureSuccess<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (res.status === "error") {
    throw new Error(res.error.message || defaultMessage);
  }
  return res.data;
}

/** Total de registros de un catálogo (sin filtros) para las tarjetas: pide una página de 1 y lee `totalCount`. */
function useCatalogTotal(key: string, fetcher: (params: PagedRequest) => Promise<ApiResponse<PagedResult<unknown>>>) {
  const { data } = useQuery({
    queryKey: [...JOB_ACTIVITIES_KEYS.counts, key],
    queryFn: () => fetcher({ page: 1, pageSize: 1 }),
    staleTime: 30_000,
  });
  return data?.status === "success" ? data.data.totalCount : null;
}

// =======================
// COMPONENTE PRINCIPAL
// =======================

export default function JobActivitiesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Estado de selección
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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
  // CONSULTAS
  // ========================
  // Cada listado (cargos, grados, grupos, actividades) es un panel con su propia consulta paginada y filtrada
  // en el servidor. Aquí solo quedan los totales de las tarjetas y las actividades del cargo seleccionado.

  const jobsTotal = useCatalogTotal("jobs", CargosAPI.listPaged);
  const degreesTotal = useCatalogTotal("degrees", DegreeAPI.listPaged);
  const groupsTotal = useCatalogTotal("groups", OccupationalGroupAPI.listPaged);
  const activitiesTotal = useCatalogTotal("activities", ActivityAPI.listPaged);

  const { data: assignedRes } = useQuery<ApiResponse<any[]>>({
    queryKey: [...JOB_ACTIVITIES_KEYS.assigned, selectedJob?.jobID ?? 0],
    queryFn: () => JobActivityAPI.listByJob(selectedJob!.jobID),
    enabled: !!selectedJob && selectedJob.jobID > 0,
  });

  const jobActivities: JobActivity[] =
    assignedRes?.status === "success" ? assignedRes.data.map((ja) => normalizeJobActivity(ja)) : [];

  const assignedActivityIds = useMemo(
    () => new Set(jobActivities.filter((ja) => ja.isActive).map((ja) => ja.activitiesID)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignedRes]
  );

  /** Refresca todos los listados de la pantalla (y las cachés antiguas que usan otras pantallas). */
  const invalidateCatalogs = () => {
    [
      JOB_ACTIVITIES_QUERY_KEY,
      ["/api/v1/rh/jobs"],
      ["/api/v1/rh/degrees"],
      ["/api/v1/rh/occupational-group"],
      ["/api/v1/rh/activity"],
      ["/api/v1/rh/additional-activity"],
      ["/api/v1/rh/job-activities"],
      // Cachés que alimentan Acciones de Personal, Contratos y el dashboard: sin esto mostraban el grupo/grado/UEP viejo
      // hasta recargar la página (el cliente usa staleTime infinito por defecto).
      ["vw-jobs-all"],
      ["vw-jobs-select"],
      ["th-jobs"],
      ["degree-combobox"],
      ["occupational-group-combobox"],
    ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  };

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
      invalidateCatalogs();
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
      uepScaleTypeId: number | null;
      familyTypeId: number | null;
      isActive: boolean;
    }) => {
      const payload = {
        description: data.description,
        degreeId: data.degreeId,
        rmu: data.rmu,
        uepScaleTypeId: data.uepScaleTypeId,
        familyTypeId: data.familyTypeId,
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
      invalidateCatalogs();
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
      siiesTipoFuncionarioTypeId: number | null;
      puestoJerarquicoSuperior: boolean;
      referenceSalary: number | null;
      academicLadderId: number | null;
    }) => {
      const payload = {
        description: data.description,
        jobTypeId: data.jobTypeId,
        groupId: data.groupId,
        isActive: data.isActive,
        siiesTipoFuncionarioTypeId: data.siiesTipoFuncionarioTypeId,
        puestoJerarquicoSuperior: data.puestoJerarquicoSuperior,
        referenceSalary: data.referenceSalary,
        academicLadderId: data.academicLadderId,
      };

      if (data.jobID && data.jobID > 0) {
        const res = await CargosAPI.update(data.jobID, payload);
        return ensureSuccess(res, "Error al actualizar cargo");
      } else {
        const res = await CargosAPI.create(payload);
        return ensureSuccess(res, "Error al crear cargo");
      }
    },
    onSuccess: async (saved, variables) => {
      invalidateCatalogs();
      toast({
        title: "✅ Cargo guardado",
        description: "Los datos del cargo se han guardado correctamente.",
      });
      setEditingJob(null);
      setIsJobDialogOpen(false);
      const savedId = normalizeJob(saved as any).jobID || variables.jobID || 0;
      if (savedId > 0) {
        const res = await CargosAPI.get(savedId);
        if (res.status === "success") setSelectedJob(normalizeJob(res.data));
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
      invalidateCatalogs();
      invalidateCatalogs();
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
      invalidateCatalogs();
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
      // tbl_JobActivities tiene llave compuesta (JobID+ActivitiesID) — sin Id simple.
      const res = await JobActivityAPI.removeByKeys(
        jobActivity.jobID,
        jobActivity.activitiesID
      );
      return ensureSuccess(res, "Error al desasignar actividad");
    },
    onSuccess: () => {
      invalidateCatalogs();
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
    setSelectedJob(job);
  };

  const handleOpenNewJob = () => {
    setEditingJob({
      jobID: 0,
      description: "",
      jobTypeId: null,
      groupId: null,
      isActive: true,
      siiesTipoFuncionarioTypeId: null,
      puestoJerarquicoSuperior: false,
      referenceSalary: null,
      academicLadderId: null,
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
    siiesTipoFuncionarioTypeId: number | null;
    puestoJerarquicoSuperior: boolean;
    referenceSalary: number | null;
    academicLadderId: number | null;
  }) => {
    if (!form.description.trim()) {
      toast({
        title: "Validación",
        description: "La descripción del cargo es obligatoria.",
        variant: "destructive",
      });
      return;
    }
    // Los cargos se guardan en mayúsculas (convención institucional, ver tbl_jobs.Description).
    jobMutation.mutate({ ...form, description: form.description.trim().toUpperCase() });
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
    setEditingGroup({
      groupId: 0,
      description: "",
      degreeId: 0,
      rmu: 0,
      uepScaleTypeId: null,
      familyTypeId: null,
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
    uepScaleTypeId: number | null;
    familyTypeId: number | null;
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
    if (!form.degreeId || form.degreeId <= 0) {
      toast({
        title: "Validación",
        description: "Seleccione el grado asociado al grupo ocupacional.",
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
      logger.error("JobActivities", "JobID inválido:", selectedJob);
      return;
    }

    // Validación: verificar que el activitiesID sea válido
    if (!activity.activitiesID || activity.activitiesID <= 0) {
      toast({
        title: "Error de validación",
        description: `La actividad seleccionada no tiene un ID válido (${activity.activitiesID})`,
        variant: "destructive",
      });
      logger.error("JobActivities", "ActivitiesID inválido:", activity);
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
      logger.debug("JobActivities", "Asignando actividad:", {
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
          <Button variant="outline" size="sm" onClick={invalidateCatalogs}>
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
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary">Cargos</p>
              <p className="text-2xl font-bold text-primary">
                {jobsTotal ?? "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 dark:bg-primary/15 border-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary p-2 rounded-full">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary">Grados</p>
              <p className="text-2xl font-bold text-primary">
                {degreesTotal ?? "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/10 dark:bg-success/15 border-success/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-success p-2 rounded-full">
              <Building2 className="h-5 w-5 text-success-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-success">
                Grupos Ocupacionales
              </p>
              <p className="text-2xl font-bold text-success">
                {groupsTotal ?? "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/10 dark:bg-warning/15 border-warning/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-warning p-2 rounded-full">
              <ListChecks className="h-5 w-5 text-warning-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-warning">
                Actividades totales
              </p>
              <p className="text-2xl font-bold text-secondary-foreground">
                {activitiesTotal ?? "-"}
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
            {/* Columna izquierda: listado de cargos (búsqueda y filtros en el servidor, paginado) */}
            <JobsListPanel
              selectedJobId={selectedJob?.jobID ?? null}
              onSelect={handleSelectJob}
              onNew={handleOpenNewJob}
              onEdit={handleEditJob}
            />

            {/* Columna derecha: detalle del cargo + actividades */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    Detalle del cargo
                  </CardTitle>
                  <CardDescription>
                    Edite la información básica del cargo. Los cambios afectan todos los procesos que usan este cargo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedJob ? (
                    <JobDetailForm
                      key={selectedJob.jobID} // clave para forzar reinit al cambiar cargo
                      job={selectedJob}
                      onSave={handleSaveJob}
                      saving={jobMutation.isPending}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Seleccione un cargo en el panel izquierdo para ver su detalle.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-secondary-foreground" />
                    Actividades asociadas al cargo
                  </CardTitle>
                  <CardDescription>
                    Asigne o quite actividades laborales y adicionales para el cargo seleccionado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedJob ? (
                    <>
                      <div className="text-sm">
                        <span className="font-semibold">Cargo seleccionado:</span>{" "}
                        {selectedJob.description || "(Sin descripción)"}
                      </div>
                      <JobActivitiesAssignPanel
                        assignedIds={assignedActivityIds}
                        isWorking={assignMutation.isPending || unassignMutation.isPending}
                        onToggle={handleToggleAssign}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Seleccione primero un cargo para gestionar sus actividades asociadas.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB CLASIFICACIONES */}
        <TabsContent value="clasificaciones" className="space-y-4">
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <DegreesPanel onNew={handleOpenNewDegree} onEdit={handleOpenEditDegree} />
            <OccupationalGroupsPanel onNew={handleOpenNewGroup} onEdit={handleOpenEditGroup} />
          </div>
        </TabsContent>

        {/* TAB ACTIVIDADES */}
        <TabsContent value="actividades" className="space-y-4">
          <ActivitiesPanel onNew={() => handleOpenNewActivity("LABORAL")} onEdit={handleOpenEditActivity} />
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
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col sm:max-w-md">
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
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col sm:max-w-xl">
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
