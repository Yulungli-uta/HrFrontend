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
import { TiposReferenciaAPI, CargosAPI, EmployeeLaborRegimesAPI } from "@/lib/api";
import type { EmployeeLaborRegimeCreateDto } from "@/lib/api/services/employeeLaborRegimes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";

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
  documentNumber: string;
  effectiveFrom: string;
  /** SIIES INGRESO_POR_CONCURSO. "unset" = sin clasificar, "true"/"false" = SI/NO. */
  ingresoPorConcurso: "unset" | "true" | "false";
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: "CONTRACT", label: "Contrato" },
  { value: "PERSONNEL_ACTION", label: "Acción de personal" },
  { value: "MIGRATION", label: "Otro / sin documento" },
];

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
    formState: { errors, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      laborRegimeId: null,
      departmentId: null,
      jobId: null,
      isIndefinite: false,
      documentType: "MIGRATION",
      documentNumber: "",
      effectiveFrom: new Date().toISOString().split("T")[0],
      ingresoPorConcurso: "unset",
    },
  });

  useMemo(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const { data: regimeTypesResp, isLoading: loadingRegimes } = useQuery({
    queryKey: ["reftypes", REF_TYPE_CATEGORIES.CONTRACT_TYPE],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.CONTRACT_TYPE),
    staleTime: 10 * 60 * 1000,
  });
  const regimeTypes = regimeTypesResp?.status === "success" ? (regimeTypesResp.data ?? []) : [];

  const { data: jobsResp, isLoading: loadingJobs } = useQuery({
    queryKey: ["jobs-list"],
    queryFn: () => CargosAPI.list(),
    staleTime: 10 * 60 * 1000,
  });
  const jobs: any[] = (() => {
    const raw = (jobsResp as any)?.data ?? jobsResp ?? [];
    return Array.isArray(raw) ? raw : raw?.items ?? [];
  })();

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

      const dto: EmployeeLaborRegimeCreateDto = {
        employeeId,
        laborRegimeId: data.laborRegimeId,
        departmentId: data.departmentId,
        jobId: data.jobId,
        isIndefinite: data.isIndefinite,
        documentType: data.documentType,
        documentNumber: data.documentNumber || null,
        effectiveFrom: data.effectiveFrom,
        ingresoPorConcurso: data.ingresoPorConcurso === "unset" ? null : data.ingresoPorConcurso === "true",
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
              <Select value={field.value} onValueChange={field.onChange}>
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

        <div className="space-y-2">
          <Label htmlFor="documentNumber">Número de documento (opcional)</Label>
          <Input
            id="documentNumber"
            {...register("documentNumber", { maxLength: { value: 50, message: "Máximo 50 caracteres" } })}
            placeholder="Ej: CONT-OCAS-2026-001"
          />
          {errors.documentNumber && (
            <p className="text-xs text-destructive">{errors.documentNumber.message}</p>
          )}
        </div>
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
