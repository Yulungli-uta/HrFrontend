// src/components/forms/EmployeeLaborRegimeForm.tsx
import { useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Briefcase, Building2, Calendar, FileText, Loader2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CargosAPI, ContractsRHAPI, EmployeeLaborRegimesAPI } from "@/lib/api";
// Directo del servicio: el índice exporta otro PersonnelActionsAPI (plantillas) con el mismo nombre.
import { PersonnelActionsAPI } from "@/lib/api/services/contracts";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import type { EmployeeLaborRegimeCreateDto } from "@/lib/api/services/employeeLaborRegimes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import { todayEcuador } from "@/lib/clock";

interface EmployeeLaborRegimeFormProps {
  employeeId: number;
  employeeLabel: string;
  onSuccess: () => void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface FormData {
  laborRegimeId: number | null;
  departmentId: number | null;
  jobId: number | null;
  isIndefinite: boolean;
  documentType: string;
  /** Id del contrato o de la acción de personal que respalda el régimen (según documentType). */
  sourceId: number | null;
  documentNumber: string;
  effectiveFrom: string;
  /** SIIES INGRESO_POR_CONCURSO. "unset" = sin clasificar, "true"/"false" = SI/NO. */
  ingresoPorConcurso: "unset" | "true" | "false";
  /** SIIES RELACION_IES manual. "derived" = según el documento que respalda el régimen; si no, el TypeId como texto. */
  siiesRelacionIes: string;
}

// Todo régimen necesita un documento de respaldo real (el backend rechaza regímenes huérfanos); las cargas
// históricas sin documento se hacen por script, no desde esta pantalla.
const DOCUMENT_TYPE_OPTIONS = [
  { value: "PERSONNEL_ACTION", label: "Acción de personal" },
  { value: "CONTRACT", label: "Contrato" },
];

interface SourceDocument {
  id: number;
  number: string;
  label: string;
  startDate: string | null;
}

export function EmployeeLaborRegimeForm({
  employeeId,
  employeeLabel,
  onSuccess,
  onCancel,
  onDirtyChange,
}: EmployeeLaborRegimeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      laborRegimeId: null,
      departmentId: null,
      jobId: null,
      isIndefinite: false,
      documentType: "PERSONNEL_ACTION",
      sourceId: null,
      documentNumber: "",
      effectiveFrom: todayEcuador(),
      ingresoPorConcurso: "unset",
      siiesRelacionIes: "derived",
    },
  });

  useMemo(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const { data: regimeTypes, isLoading: loadingRegimes } = useRefTypesByCategory(REF_TYPE_CATEGORIES.CONTRACT_TYPE);
  const { data: relationTypes } = useRefTypesByCategory(REF_TYPE_CATEGORIES.SIIES_RELACION_IES);

  const { data: jobsResp, isLoading: loadingJobs } = useQuery({
    queryKey: ["jobs-list"],
    queryFn: () => CargosAPI.list(),
    staleTime: 10 * 60 * 1000,
  });
  const jobs: any[] = (() => {
    const raw = (jobsResp as any)?.data ?? jobsResp ?? [];
    return Array.isArray(raw) ? raw : raw?.items ?? [];
  })();

  const documentType = watch("documentType");

  const { data: sourceDocs, isLoading: loadingDocs } = useQuery<SourceDocument[]>({
    queryKey: ["labor-regime-source-docs", employeeId, documentType],
    queryFn: async () => {
      if (documentType === "CONTRACT") {
        const res = await ContractsRHAPI.listPaged({ page: 1, pageSize: 50, employeeId });
        const items: any[] = res.status === "success" ? res.data?.items ?? [] : [];
        return items.map((c) => ({
          id: Number(c.contractID ?? c.contractId),
          number: String(c.contractCode ?? ""),
          label: `${c.contractCode ?? "Sin código"} · ${String(c.startDate ?? "").slice(0, 10)}`,
          startDate: c.startDate ? String(c.startDate).slice(0, 10) : null,
        }));
      }
      const res = await PersonnelActionsAPI.getByEmployee(employeeId);
      const items = res.status === "success" ? res.data ?? [] : [];
      return items
        .filter((a) => a.status === "VIGENTE" || a.status === "FINALIZADO")
        .map((a) => ({
          id: a.actionId,
          number: a.actionNumber ?? "",
          label: `${a.actionNumber ?? "Sin número"} · ${a.actionTypeName} · ${a.status}`,
          startDate: (a.effectiveDate ?? a.actionDate ?? null)?.slice(0, 10) ?? null,
        }));
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (dto: EmployeeLaborRegimeCreateDto) => EmployeeLaborRegimesAPI.create(dto),
    onSuccess: (res) => {
      if (res.status !== "success") {
        toast({
          title: "No se pudo registrar el régimen",
          description: res.error?.message ?? "Intente nuevamente.",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["employee-labor-regimes", employeeId] });
      toast({ title: "Régimen registrado", description: "El régimen laboral fue agregado correctamente." });
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: "Error al registrar",
        description: err?.message ?? "No se pudo registrar el régimen.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = useCallback(
    (data: FormData) => {
      if (!data.laborRegimeId || !data.effectiveFrom) {
        toast({
          title: "Campos requeridos",
          description: "Régimen laboral y fecha de inicio son obligatorios.",
          variant: "destructive",
        });
        return;
      }

      if (!data.sourceId) {
        toast({
          title: "Documento de respaldo requerido",
          description: "Seleccione el contrato o la acción de personal que respalda este régimen.",
          variant: "destructive",
        });
        return;
      }

      const dto: EmployeeLaborRegimeCreateDto = {
        employeeId,
        laborRegimeId: data.laborRegimeId,
        departmentId: data.departmentId,
        jobId: data.jobId,
        isIndefinite: data.isIndefinite,
        documentType: data.documentType,
        documentNumber: data.documentNumber || null,
        sourceContractId: data.documentType === "CONTRACT" ? data.sourceId : null,
        sourcePersonnelActionId: data.documentType === "PERSONNEL_ACTION" ? data.sourceId : null,
        effectiveFrom: data.effectiveFrom,
        ingresoPorConcurso: data.ingresoPorConcurso === "unset" ? null : data.ingresoPorConcurso === "true",
        siiesRelacionIesTypeId: data.siiesRelacionIes === "derived" ? null : Number(data.siiesRelacionIes),
      };

      createMutation.mutate(dto);
    },
    [employeeId, createMutation, toast]
  );

  const isLoading = createMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <span className="text-muted-foreground">Empleado: </span>
        <span className="font-medium">{employeeLabel}</span>
      </div>

      <Controller
        name="laborRegimeId"
        control={control}
        rules={{ required: "El régimen laboral es requerido" }}
        render={({ field }) => (
          <div className="space-y-2">
            <Label>
              <ScrollText className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Régimen laboral <span className="text-destructive">*</span>
            </Label>
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={(v) => field.onChange(Number(v))}
              disabled={loadingRegimes}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un régimen…" />
              </SelectTrigger>
              <SelectContent>
                {regimeTypes.map((r: any) => (
                  <SelectItem key={r.typeId} value={String(r.typeId)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.laborRegimeId && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.laborRegimeId.message}
              </p>
            )}
          </div>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="departmentId"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label>
                <Building2 className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                Departamento (opcional)
              </Label>
              <DepartmentSelect
                value={field.value}
                onChange={(id) => field.onChange(id)}
                placeholder="Seleccionar departamento…"
              />
            </div>
          )}
        />

        <Controller
          name="jobId"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label>
                <Briefcase className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                Cargo (opcional)
              </Label>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                disabled={loadingJobs}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo…" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j: any) => (
                    <SelectItem key={j.jobID ?? j.jobId} value={String(j.jobID ?? j.jobId)}>
                      {j.description ?? j.name ?? `Cargo #${j.jobID ?? j.jobId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="documentType"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label>
                <FileText className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                Tipo de documento
              </Label>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  setValue("sourceId", null);
                  setValue("documentNumber", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="sourceId"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label>
                Documento de respaldo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => {
                  const id = Number(v);
                  field.onChange(id);
                  const doc = (sourceDocs ?? []).find((d) => d.id === id);
                  setValue("documentNumber", doc?.number ?? "");
                  if (doc?.startDate) setValue("effectiveFrom", doc.startDate, { shouldDirty: true });
                }}
                disabled={loadingDocs}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingDocs ? "Cargando…" : (sourceDocs ?? []).length ? "Seleccione el documento…" : "El empleado no tiene documentos"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(sourceDocs ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="effectiveFrom">
          <Calendar className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          Fecha de activación <span className="text-destructive">*</span>
        </Label>
        <Input
          id="effectiveFrom"
          type="date"
          {...register("effectiveFrom", { required: "La fecha de activación es requerida" })}
          className="bg-background text-foreground"
        />
        {errors.effectiveFrom && (
          <p className="text-xs text-destructive">{errors.effectiveFrom.message}</p>
        )}
      </div>

      <Controller
        name="ingresoPorConcurso"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Ingreso por concurso (SIIES)</Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sin clasificar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Sin clasificar</SelectItem>
                <SelectItem value="true">Sí</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Requerido por el reporte SIIES Funcionarios. Si queda "sin clasificar", el reporte lo exporta como "NO" hasta que se complete.
            </p>
          </div>
        )}
      />

      <Controller
        name="siiesRelacionIes"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Relación IES (SIIES)</Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Según el documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="derived">Según el documento</SelectItem>
                {(relationTypes ?? []).map((t) => (
                  <SelectItem key={t.typeID} value={String(t.typeID)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Si se fija, el reporte SIIES usa este valor. Con "Según el documento" se deriva del tipo de contrato o acción.
            </p>
          </div>
        )}
      />

      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <input
          type="checkbox"
          id="isIndefinite"
          {...register("isIndefinite")}
          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
        />
        <Label htmlFor="isIndefinite" className="cursor-pointer select-none">
          Es nombramiento (fijo o provisional, sin fecha de vencimiento)
        </Label>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando…
            </span>
          ) : (
            "Registrar régimen"
          )}
        </Button>
      </div>
    </form>
  );
}
