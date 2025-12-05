import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

import type { Training } from "@/types/person";
import {
  TiposReferenciaAPI,
  type RefType,
  AreaConocimientoAPI,
} from "@/lib/api";

// =============================
// Zod schema
// =============================
const trainingFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  institution: z.string().min(1, "La institución es requerida"),

  location: z.string().optional(),

  eventTypeId: z
    .number({
      required_error: "El tipo de evento es requerido",
      invalid_type_error: "El tipo de evento es requerido",
    })
    .int()
    .positive(),

  certificateTypeId: z
    .number({
      required_error: "El tipo de certificación es requerido",
      invalid_type_error: "El tipo de certificación es requerido",
    })
    .int()
    .positive()
    .optional(),

  approvalTypeId: z
    .number({
      required_error: "El tipo de aprobación es requerido",
      invalid_type_error: "El tipo de aprobación es requerido",
    })
    .int()
    .positive()
    .optional(),

  knowledgeAreaTypeId: z.number().int().nonnegative().optional(),

  certifiedBy: z.string().optional(),

  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().optional(),

  hours: z
    .number({
      invalid_type_error: "Las horas deben ser un número",
    })
    .int()
    .nonnegative()
    .optional(),

  notes: z.string().optional(),
});

export type TrainingFormData = z.infer<typeof trainingFormSchema>;

interface TrainingFormProps {
  personId: number;
  training?: Training | null;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Helper RefType
function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

// Tipo KnowledgeArea (igual que en PublicationForm)
type KnowledgeArea = {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  levels: number;
  isActive: boolean;
};

export default function TrainingForm({
  personId,
  training,
  onSubmit,
  onCancel,
  isLoading = false,
}: TrainingFormProps) {
  // =============================
  // TIPOS DE REFERENCIA
  // =============================

  // EVENT_TYPE
  const {
    data: eventTypesResponse,
    isLoading: loadingEventTypes,
    error: eventTypesError,
  } = useQuery({
    queryKey: ["refTypes", "EVENT_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory("EVENT_TYPE"),
  });

  const eventTypes: RefType[] =
    eventTypesResponse?.status === "success"
      ? (eventTypesResponse.data ?? []).filter((t: any) => t.isActive)
      : [];

  // CERTIFICATION_TYPE
  const {
    data: certTypesResponse,
    isLoading: loadingCertTypes,
    error: certTypesError,
  } = useQuery({
    queryKey: ["refTypes", "CERTIFICATION_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory("CERTIFICATION_TYPE"),
  });

  const certTypes: RefType[] =
    certTypesResponse?.status === "success"
      ? (certTypesResponse.data ?? []).filter((t: any) => t.isActive)
      : [];

  // CERT_APPROVAL_TYPE
  const {
    data: approvalTypesResponse,
    isLoading: loadingApprovalTypes,
    error: approvalTypesError,
  } = useQuery({
    queryKey: ["refTypes", "CERT_APPROVAL_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory("CERT_APPROVAL_TYPE"),
  });

  const approvalTypes: RefType[] =
    approvalTypesResponse?.status === "success"
      ? (approvalTypesResponse.data ?? []).filter((t: any) => t.isActive)
      : [];

  // =============================
  // ÁREAS DE CONOCIMIENTO (simple)
  // =============================
  const {
    data: knowledgeAreasResponse,
    error: knowledgeAreasError,
  } = useQuery({
    queryKey: ["knowledgeArea", "all"],
    queryFn: () => AreaConocimientoAPI.list(),
  });

  const knowledgeAreas: KnowledgeArea[] =
    knowledgeAreasResponse?.status === "success"
      ? (knowledgeAreasResponse.data as KnowledgeArea[]).filter(
          (a) => a.isActive
        )
      : [];

  // =============================
  // useForm
  // =============================
  const form = useForm<TrainingFormData>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      title: training?.title ?? "",
      institution: training?.institution ?? "",
      location: training?.location ?? "",

      eventTypeId: training?.eventTypeId
        ? Number(training.eventTypeId)
        : 0,

      certificateTypeId: training?.certificateTypeId
        ? Number(training.certificateTypeId)
        : undefined,

      approvalTypeId: training?.approvalTypeId
        ? Number(training.approvalTypeId)
        : undefined,

      knowledgeAreaTypeId: training?.knowledgeAreaTypeId
        ? Number(training.knowledgeAreaTypeId)
        : undefined,

      certifiedBy: training?.certifiedBy ?? "",

      startDate: training?.startDate ?? "",
      endDate: training?.endDate ?? "",

      hours: training?.hours ? Number(training.hours) : undefined,

      notes: "",
    },
  });

  // =============================
  // SUBMIT
  // =============================
  const handleSubmit = async (data: TrainingFormData) => {
    const now = new Date();

    const normalizeId = (value: number | null | undefined) =>
      value !== null && value !== undefined && value !== 0 ? value : undefined;

    const payload: any = {
      trainingId: training?.trainingId ?? 0,
      personId,
      title: data.title,
      institution: data.institution,
      location: data.location || null,

      eventTypeId: data.eventTypeId,

      certifiedBy: data.certifiedBy || null,

      startDate: data.startDate,
      endDate: data.endDate && data.endDate !== "" ? data.endDate : null,

      hours: data.hours ?? 0,

      createdAt: training?.createdAt ?? now.toISOString(),
    };

    const knowledgeAreaTypeId = normalizeId(
      data.knowledgeAreaTypeId as number | undefined
    );
    if (knowledgeAreaTypeId !== undefined) {
      payload.knowledgeAreaTypeId = knowledgeAreaTypeId;
    }

    const certificateTypeId = normalizeId(
      data.certificateTypeId as number | undefined
    );
    if (certificateTypeId !== undefined) {
      payload.certificateTypeId = certificateTypeId;
    }

    const approvalTypeId = normalizeId(
      data.approvalTypeId as number | undefined
    );
    if (approvalTypeId !== undefined) {
      payload.approvalTypeId = approvalTypeId;
    }

    // Aquí podrías incluir notes si el backend lo soporta
    // payload.notes = data.notes || null;

    try {
      await onSubmit(payload);
    } catch (error) {
      console.error("[TrainingForm] onSubmit ERROR", error);
    }
  };

  const saving = isLoading;

  // =============================
  // UI
  // =============================
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        data-testid="training-form"
      >
        {/* DATOS GENERALES */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Datos de la capacitación
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre de la capacitación" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Institución */}
            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institución</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Institución que dicta" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ubicación */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ciudad, país" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Certificado emitido por */}
            <FormField
              control={form.control}
              name="certifiedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificado por</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Entidad que emite el certificado"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* TIPOS / REFERENCIAS */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Clasificación y certificación
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo de evento */}
            <FormField
              control={form.control}
              name="eventTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de evento</FormLabel>
                  <Select
                    disabled={loadingEventTypes || saving}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo de evento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eventTypes.map((t) => {
                        const id = getRefTypeId(t);
                        if (id == null) return null;
                        return (
                          <SelectItem key={id} value={String(id)}>
                            {t.description ?? t.code ?? `Tipo ${id}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {eventTypesError && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar los tipos de evento.
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Tipo de certificación */}
            <FormField
              control={form.control}
              name="certificateTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de certificación</FormLabel>
                  <Select
                    disabled={loadingCertTypes || saving}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) =>
                      field.onChange(v === "" ? undefined : Number(v))
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo de certificación" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {certTypes.map((t) => {
                        const id = getRefTypeId(t);
                        if (id == null) return null;
                        return (
                          <SelectItem key={id} value={String(id)}>
                            {t.description ?? t.code ?? `Tipo ${id}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {certTypesError && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar los tipos de certificación.
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Tipo de aprobación */}
            <FormField
              control={form.control}
              name="approvalTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de aprobación</FormLabel>
                  <Select
                    disabled={loadingApprovalTypes || saving}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) =>
                      field.onChange(v === "" ? undefined : Number(v))
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo de aprobación" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {approvalTypes.map((t) => {
                        const id = getRefTypeId(t);
                        if (id == null) return null;
                        return (
                          <SelectItem key={id} value={String(id)}>
                            {t.description ?? t.code ?? `Tipo ${id}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {approvalTypesError && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar los tipos de aprobación.
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* FECHAS Y HORAS */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Fechas y duración
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de inicio</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de finalización</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ÁREA DE CONOCIMIENTO */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Área de conocimiento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="knowledgeAreaTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área de conocimiento</FormLabel>
                  <Select
                    disabled={saving}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione área" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {knowledgeAreas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {knowledgeAreasError && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar las áreas de conocimiento.
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* NOTAS */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">Notas</h3>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} placeholder="Notas" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* BOTONES */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="submit"
            disabled={
              saving ||
              loadingEventTypes ||
              loadingCertTypes ||
              loadingApprovalTypes
            }
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : training ? (
              "Actualizar"
            ) : (
              "Crear"
            )}
          </Button>

          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
