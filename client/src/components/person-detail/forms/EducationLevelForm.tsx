// client/src/components/person-detail/forms/EducationLevelForm.tsx
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReusableFileUpload } from "@/components/ReusableFileUpload";

import type { EducationLevel } from "@/types/person";
import { TiposReferenciaAPI, InstitucionesAPI, NivelesEducacionAPI, type RefType } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { EDUCATION_CERTIFICATE_DIRECTORY_CODE, EDUCATION_CERTIFICATE_ENTITY_TYPE } from "@/features/constants";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

const educationLevelFormSchema = z.object({
  educationLevelTypeId: z
    .number({
      required_error: "El nivel de formación es requerido",
      invalid_type_error: "El nivel de formación es requerido",
    })
    .int()
    .positive(),

  institutionId: z
    .number({
      required_error: "La institución es requerida",
      invalid_type_error: "La institución es requerida",
    })
    .int()
    .positive(),

  title: z.string().min(1, "El título obtenido es requerido"),
  specialty: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  grade: z.string().optional(),
  score: z
    .string()
    .optional()
    .refine((val) => !val || !Number.isNaN(Number(val)), {
      message: "Debe ser un número",
    }),
  senescytRegistrationNumber: z.string().optional(),
});

export type EducationLevelFormData = z.infer<typeof educationLevelFormSchema>;

function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

interface EducationLevelFormProps {
  personId: number;
  educationLevel?: EducationLevel | null;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  /** Cierra el diálogo y refresca la lista — usado en el camino de creación-con-documento,
   * que hace su propia llamada fuera del flujo genérico de mutaciones. */
  closeAndRefresh?: () => void;
}

const MAX_FILE_MB = 10;

export default function EducationLevelForm({
  personId,
  educationLevel,
  onSubmit,
  onCancel,
  isLoading = false,
  onDirtyChange,
  closeAndRefresh,
}: EducationLevelFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>("");
  const [isSavingWithDocument, setIsSavingWithDocument] = useState(false);
  const [fileUploadKey, setFileUploadKey] = useState(0);

  const {
    data: levelTypesResp,
    isLoading: loadingLevelTypes,
    error: levelTypesError,
  } = useQuery({
    queryKey: ["refTypes", "ACADEMIC_LEVEL"],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.ACADEMIC_LEVEL),
  });

  const {
    data: institutionsResp,
    isLoading: loadingInstitutions,
    error: institutionsError,
  } = useQuery({
    queryKey: ["institutions-list"],
    queryFn: () => InstitucionesAPI.list(),
  });

  const { data: docTypesResp } = useQuery({
    queryKey: ["refTypes", "CV_DOCUMENT_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.CV_DOCUMENT_TYPE),
  });

  const levelTypes: RefType[] =
    levelTypesResp?.status === "success"
      ? (levelTypesResp.data ?? []).filter((t: any) => t.isActive)
      : [];

  const institutions: any[] =
    institutionsResp?.status === "success" ? institutionsResp.data ?? [] : [];

  const docTypes: RefType[] =
    docTypesResp?.status === "success" ? (docTypesResp.data ?? []).filter((t: any) => t.isActive) : [];

  const form = useForm<EducationLevelFormData>({
    resolver: zodResolver(educationLevelFormSchema),
    defaultValues: {
      educationLevelTypeId:
        educationLevel?.educationLevelTypeId != null
          ? Number(educationLevel.educationLevelTypeId)
          : 0,
      institutionId:
        educationLevel?.institutionId != null ? Number(educationLevel.institutionId) : 0,
      title: educationLevel?.title ?? "",
      specialty: educationLevel?.specialty ?? "",
      startDate: educationLevel?.startDate ? educationLevel.startDate.split("T")[0] : "",
      endDate: educationLevel?.endDate ? educationLevel.endDate.split("T")[0] : "",
      grade: educationLevel?.grade ?? "",
      score: educationLevel?.score != null ? String(educationLevel.score) : "",
      senescytRegistrationNumber: educationLevel?.senescytRegistrationNumber ?? "",
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  const _isDirty = form.formState.isDirty;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_isDirty);
  }, [_isDirty]);

  useEffect(() => {
    if (educationLevel) {
      form.reset({
        educationLevelTypeId: Number(educationLevel.educationLevelTypeId) || 0,
        institutionId: Number(educationLevel.institutionId) || 0,
        title: educationLevel.title ?? "",
        specialty: educationLevel.specialty ?? "",
        startDate: educationLevel.startDate ? educationLevel.startDate.split("T")[0] : "",
        endDate: educationLevel.endDate ? educationLevel.endDate.split("T")[0] : "",
        grade: educationLevel.grade ?? "",
        score: educationLevel.score != null ? String(educationLevel.score) : "",
        senescytRegistrationNumber: educationLevel.senescytRegistrationNumber ?? "",
      });
    } else {
      form.reset({
        educationLevelTypeId: 0,
        institutionId: 0,
        title: "",
        specialty: "",
        startDate: "",
        endDate: "",
        grade: "",
        score: "",
        senescytRegistrationNumber: "",
      });
    }
  }, [educationLevel, form]);

  const handleSubmit = async (data: EducationLevelFormData) => {
    // Camino con documento adjunto: solo aplica al crear (aún no existe un educationId
    // al que asociar el archivo si se está editando; para editar, el adjunto se maneja
    // desde la pestaña, sobre el registro ya existente).
    if (!educationLevel && selectedFile) {
      setIsSavingWithDocument(true);
      try {
        const formData = new FormData();
        formData.append("PersonId", String(personId));
        formData.append("EducationLevelTypeId", String(data.educationLevelTypeId));
        formData.append("InstitutionId", String(data.institutionId));
        formData.append("Title", data.title);
        if (data.specialty) formData.append("Specialty", data.specialty);
        if (data.startDate) formData.append("StartDate", data.startDate);
        if (data.endDate) formData.append("EndDate", data.endDate);
        if (data.grade) formData.append("Grade", data.grade);
        if (data.score) formData.append("Score", data.score);
        if (data.senescytRegistrationNumber) {
          formData.append("SenescytRegistrationNumber", data.senescytRegistrationNumber);
        }
        formData.append("File", selectedFile);
        if (selectedDocTypeId) formData.append("DocumentTypeId", selectedDocTypeId);

        const res = await NivelesEducacionAPI.createWithDocument(formData);
        if (res.status === "error") {
          throw new Error(res.error?.message || "No se pudo crear el registro con el documento adjunto.");
        }

        await queryClient.invalidateQueries({ queryKey: ["educationLevels", String(personId)] });
        toast({ title: "✅ Éxito", description: "Formación académica y documento registrados correctamente." });
        form.reset();
        setSelectedFile(null);
        setFileUploadKey((k) => k + 1);
        closeAndRefresh?.();
      } catch (error: any) {
        logger.error("EducationLevelForm", "[EducationLevelForm] createWithDocument ERROR", error);
        toast({
          title: "❌ Error",
          description: error?.message || "No se pudo registrar la formación académica con el documento.",
          variant: "destructive",
        });
      } finally {
        setIsSavingWithDocument(false);
      }
      return;
    }

    const payload = {
      educationId: educationLevel?.educationId ?? 0,
      personId,
      educationLevelTypeId: data.educationLevelTypeId,
      institutionId: data.institutionId,
      title: data.title,
      specialty: data.specialty || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      grade: data.grade || null,
      score: data.score ? Number(data.score) : null,
      senescytRegistrationNumber: data.senescytRegistrationNumber || null,
    };

    try {
      await onSubmit(payload);
      if (!educationLevel) {
        form.reset();
      }
    } catch (error) {
      logger.error("EducationLevelForm", "[EducationLevelForm] onSubmit ERROR", error);
    }
  };

  const saving = isLoading || isSavingWithDocument;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        data-testid="education-level-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nivel de formación */}
          <FormField
            control={form.control}
            name="educationLevelTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel de formación</FormLabel>
                <Select
                  disabled={loadingLevelTypes || !!levelTypesError || saving}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-education-level-type">
                      <SelectValue
                        placeholder={loadingLevelTypes ? "Cargando niveles..." : "Seleccionar nivel"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {levelTypes.map((t) => {
                      const id = getRefTypeId(t);
                      if (id == null) return null;
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {t.name ?? `Nivel ${id}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
                {levelTypesError && (
                  <p className="text-xs text-destructive mt-1">No se pudieron cargar los niveles.</p>
                )}
              </FormItem>
            )}
          />

          {/* Institución */}
          <FormField
            control={form.control}
            name="institutionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institución</FormLabel>
                <Select
                  disabled={loadingInstitutions || !!institutionsError || saving}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-institution">
                      <SelectValue
                        placeholder={loadingInstitutions ? "Cargando instituciones..." : "Seleccionar institución"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.institutionId} value={String(inst.institutionId)}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
                {institutionsError && (
                  <p className="text-xs text-destructive mt-1">No se pudieron cargar las instituciones.</p>
                )}
              </FormItem>
            )}
          />
        </div>

        {/* Título obtenido */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título obtenido</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: Ingeniero en Sistemas / Magíster en..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Especialidad */}
          <FormField
            control={form.control}
            name="specialty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especialidad (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: Redes y Telecomunicaciones" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Registro SENESCYT */}
          <FormField
            control={form.control}
            name="senescytRegistrationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>N.° de registro SENESCYT (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: 1234-2020-1234567" />
                </FormControl>
                <FormDescription>
                  Requerido para justificar la escala salarial (RMU) en instituciones públicas.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fecha inicio */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de inicio (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha fin */}
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de finalización (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nota cualitativa */}
          <FormField
            control={form.control}
            name="grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mención / distinción (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: Magna Cum Laude" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Puntaje */}
          <FormField
            control={form.control}
            name="score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Puntaje / promedio (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="decimal" placeholder="Ej: 9.35" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!educationLevel && (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <Label>Título / certificado de respaldo (opcional)</Label>
            <ReusableFileUpload
              key={fileUploadKey}
              directoryCode={EDUCATION_CERTIFICATE_DIRECTORY_CODE}
              relativePath={EDUCATION_CERTIFICATE_ENTITY_TYPE.toLowerCase()}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={MAX_FILE_MB}
              label="Título / certificado de respaldo"
              disabled={saving}
              deferUpload
              onFileSelected={setSelectedFile}
            />

            {selectedFile && docTypes.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Tipo de documento</Label>
                <Select value={selectedDocTypeId} onValueChange={setSelectedDocTypeId} disabled={saving}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {docTypes.map((t) => {
                      const id = getRefTypeId(t);
                      if (id == null) return null;
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {t.name ?? `Tipo ${id}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Si adjuntas un archivo, el registro y el documento se guardan juntos — si algo falla, no queda ninguno de los dos a medias.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-4 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || loadingLevelTypes} data-testid="button-submit">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {saving ? "Guardando..." : educationLevel ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
