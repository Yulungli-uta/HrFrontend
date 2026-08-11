// client/src/components/person-detail/forms/WorkExperienceForm.tsx

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { ReusableFileUpload } from "@/components/ReusableFileUpload";

import type { WorkExperience } from "@/types/person";
import { PaisesAPI, TiposReferenciaAPI, ExperienciasLaboralesAPI, type RefType } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { WORK_EXPERIENCE_CERTIFICATE_DIRECTORY_CODE, WORK_EXPERIENCE_CERTIFICATE_ENTITY_TYPE } from "@/features/constants";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

// =============================
// Zod schema
// =============================
const workExperienceFormSchema = z
  .object({
    position: z.string().min(1, "El cargo es requerido"),
    company: z.string().min(1, "La empresa es requerida"),
    startDate: z.string().min(1, "La fecha de inicio es requerida"),
    endDate: z.string().optional(),
    isCurrent: z.boolean().default(false),
    institutionAddress: z.string().optional(),
    entryReason: z.string().min(1, "La razón de entrada es requerida"),
    exitReason: z.string().optional(),

    // countryId es VARCHAR en la BD → lo manejamos como string
    countryId: z
      .string({
        required_error: "El país es requerido",
        invalid_type_error: "El país es requerido",
      })
      .min(1, "El país es requerido"),

    // Estos siguen siendo numéricos
    institutionTypeId: z
      .number({
        required_error: "El tipo de institución es requerido",
        invalid_type_error: "El tipo de institución es requerido",
      })
      .int()
      .positive(),

    experienceTypeId: z
      .number({
        required_error: "El tipo de experiencia es requerido",
        invalid_type_error: "El tipo de experiencia es requerido",
      })
      .int()
      .positive(),
  })
  .refine(
    (data) => {
      if (!data.isCurrent && !data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: "La fecha de finalización es requerida si no es el trabajo actual",
      path: ["endDate"],
    }
  );

type WorkExperienceFormData = z.infer<typeof workExperienceFormSchema>;

// =============================
// Tipos auxiliares
// =============================
interface CountryDto {
  countryId?: number | string;
  id?: number | string;
  name?: string;
  countryName?: string;
  [key: string]: unknown;
}

// Helper RefType (igual que en PublicationForm)
function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

// Helper Country: devolvemos string porque en BD es varchar
function getCountryId(c: CountryDto): string | undefined {
  const raw = c.countryId ?? c.id;
  if (raw === undefined || raw === null) return undefined;
  return String(raw);
}

function getCountryName(c: CountryDto): string {
  return (
    (c as any).countryName ??
    (c as any).name ??
    (c as any).description ??
    "País"
  );
}

interface WorkExperienceFormProps {
  personId: number;
  workExperience?: WorkExperience;
  onSubmit: (data: WorkExperienceFormData) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  closeAndRefresh?: () => void;
}

const MAX_FILE_MB = 10;

// =============================
// Componente
// =============================
export default function WorkExperienceForm({
  personId,
  workExperience,
  onSubmit,
  onCancel,
  isLoading = false,
  onDirtyChange,
  closeAndRefresh,
}: WorkExperienceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>("");
  const [isSavingWithDocument, setIsSavingWithDocument] = useState(false);
  const [fileUploadKey, setFileUploadKey] = useState(0);

  const { data: docTypesResp } = useQuery({
    queryKey: ["refTypes", "CV_DOCUMENT_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.CV_DOCUMENT_TYPE),
  });
  const docTypes: RefType[] =
    docTypesResp?.status === "success" ? (docTypesResp.data ?? []).filter((t: any) => t.isActive) : [];
  // =============================
  // QUERIES: Países
  // =============================
  const {
    data: countriesResp,
    isLoading: loadingCountries,
    error: countriesError,
  } = useQuery({
    queryKey: ["countries"],
    queryFn: () => PaisesAPI.list(),
  });

  const countries: CountryDto[] =
    countriesResp?.status === "success" && Array.isArray(countriesResp.data)
      ? (countriesResp.data as CountryDto[])
      : [];

  // =============================
  // QUERIES: Tipos de institución
  // =============================
  const {
    data: instTypesResp,
    isLoading: loadingInstTypes,
    error: instTypesError,
  } = useQuery({
    queryKey: ["refTypes", "CV_INSTITUTION_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.CV_INSTITUTION_TYPE),
  });

  const institutionTypes: RefType[] =
    instTypesResp?.status === "success"
      ? (instTypesResp.data ?? []).filter((t: any) => t.isActive)
      : [];

  // =============================
  // QUERIES: Tipos de experiencia
  // =============================
  const {
    data: expTypesResp,
    isLoading: loadingExpTypes,
    error: expTypesError,
  } = useQuery({
    queryKey: ["refTypes", "EXPERIENCE_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.EXPERIENCE_TYPE),
  });

  const experienceTypes: RefType[] =
    expTypesResp?.status === "success"
      ? (expTypesResp.data ?? []).filter((t: any) => t.isActive)
      : [];

  const loadingOptions =
    loadingCountries || loadingInstTypes || loadingExpTypes;

  // =============================
  // useForm
  // =============================
  const form = useForm<WorkExperienceFormData>({
    resolver: zodResolver(workExperienceFormSchema) as any,
    defaultValues: {
      position: workExperience?.position ?? "",
      company: workExperience?.company ?? "",
      startDate: workExperience?.startDate
        ? workExperience.startDate.split("T")[0]
        : "",
      endDate: workExperience?.endDate
        ? workExperience.endDate.split("T")[0]
        : "",
      isCurrent: workExperience?.isCurrent ?? false,
      institutionAddress: workExperience?.institutionAddress ?? "",
      entryReason: workExperience?.entryReason ?? "",
      exitReason: workExperience?.exitReason ?? "",

      // countryId es string (varchar en BD)
      countryId: workExperience?.countryId
        ? String((workExperience as any).countryId)
        : "",

      institutionTypeId: workExperience?.institutionTypeId
        ? Number(workExperience.institutionTypeId)
        : 0,
      experienceTypeId: workExperience?.experienceTypeId
        ? Number(workExperience.experienceTypeId)
        : 0,
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  const _isDirty = form.formState.isDirty;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_isDirty);
  }, [_isDirty]);

  const isCurrent = form.watch("isCurrent");

  // =============================
  // SUBMIT
  // =============================
  const handleSubmit = async (data: WorkExperienceFormData) => {
    // Normalizar endDate para no mandar ""
    const normalizedEndDate =
      data.isCurrent || !data.endDate || data.endDate.trim() === ""
        ? undefined
        : data.endDate;

    // Camino con documento adjunto: solo al crear (aún no existe un workExpId al que
    // asociar el archivo si se está editando).
    if (!workExperience && selectedFile) {
      setIsSavingWithDocument(true);
      try {
        const formData = new FormData();
        formData.append("PersonId", String(personId));
        formData.append("CountryId", data.countryId);
        formData.append("Company", data.company);
        formData.append("InstitutionTypeId", String(data.institutionTypeId));
        formData.append("EntryReason", data.entryReason);
        if (data.exitReason) formData.append("ExitReason", data.exitReason);
        formData.append("Position", data.position);
        if (data.institutionAddress) formData.append("InstitutionAddress", data.institutionAddress);
        formData.append("StartDate", data.startDate);
        if (normalizedEndDate) formData.append("EndDate", normalizedEndDate);
        formData.append("ExperienceTypeId", String(data.experienceTypeId));
        formData.append("IsCurrent", String(data.isCurrent));
        formData.append("File", selectedFile);
        if (selectedDocTypeId) formData.append("DocumentTypeId", selectedDocTypeId);

        const res = await ExperienciasLaboralesAPI.createWithDocument(formData);
        if (res.status === "error") {
          throw new Error(res.error?.message || "No se pudo crear la experiencia laboral con el documento adjunto.");
        }

        await queryClient.invalidateQueries({ queryKey: ["workExperiences", String(personId)] });
        toast({ title: "✅ Éxito", description: "Experiencia laboral y documento registrados correctamente." });
        form.reset();
        setSelectedFile(null);
        setFileUploadKey((k) => k + 1);
        closeAndRefresh?.();
      } catch (error: any) {
        logger.error("WorkExperienceForm", "[WorkExperienceForm] createWithDocument ERROR", error);
        toast({
          title: "❌ Error",
          description: error?.message || "No se pudo registrar la experiencia laboral con el documento.",
          variant: "destructive",
        });
      } finally {
        setIsSavingWithDocument(false);
      }
      return;
    }

    const payload: WorkExperienceFormData = {
      ...data,
      endDate: normalizedEndDate,
      // countryId ya es string, lo dejamos tal cual
      countryId: data.countryId,
      // estos sí como número
      institutionTypeId: Number(data.institutionTypeId),
      experienceTypeId: Number(data.experienceTypeId),
    };

    try {
      await onSubmit(payload);
      if (!workExperience) {
        form.reset();
      }
    } catch (error) {
      logger.error("WorkExperienceForm", "[WorkExperienceForm] onSubmit ERROR", error);
    }
  };

  const saving = isLoading || isSavingWithDocument;

  // =============================
  // UI
  // =============================
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit as any)}
        className="space-y-4"
        data-testid="work-experience-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cargo */}
          <FormField
            control={form.control as any}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo/Posición</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-position" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Empresa */}
          <FormField
            control={form.control as any}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa/Organización</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-company" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Trabajo actual */}
          <FormField
            control={form.control as any}
            name="isCurrent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 md:col-span-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      const boolVal = !!checked;
                      field.onChange(boolVal);
                      if (boolVal) {
                        // limpiamos fecha fin en el form (lo normalizamos a undefined en handleSubmit)
                        form.setValue("endDate", "");
                      }
                    }}
                    data-testid="checkbox-is-current"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Trabajo actual</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {/* Fecha inicio */}
          <FormField
            control={form.control as any}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de inicio</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    data-testid="input-start-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha fin */}
          {!isCurrent && (
            <FormField
              control={form.control as any}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de finalización</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      data-testid="input-end-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* País (countryId = varchar) */}
          <FormField
            control={form.control as any}
            name="countryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>País</FormLabel>
                <Select
                  disabled={loadingCountries || !!countriesError || saving}
                  value={field.value || ""}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingCountries
                            ? "Cargando países..."
                            : countriesError
                            ? "Error cargando países"
                            : "Seleccione un país"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countries.map((c) => {
                      const id = getCountryId(c);
                      if (!id) return null;
                      return (
                        <SelectItem key={id} value={id}>
                          {getCountryName(c)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
                {countriesError && (
                  <p className="text-xs text-destructive mt-1">
                    No se pudieron cargar los países.
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Tipo de institución */}
          <FormField
            control={form.control as any}
            name="institutionTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de institución</FormLabel>
                <Select
                  disabled={loadingInstTypes || !!instTypesError || saving}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingInstTypes
                            ? "Cargando tipos..."
                            : instTypesError
                            ? "Error cargando tipos"
                            : "Seleccione un tipo de institución"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {institutionTypes.map((t) => {
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
                {instTypesError && (
                  <p className="text-xs text-destructive mt-1">
                    No se pudieron cargar los tipos de institución.
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Tipo de experiencia */}
          <FormField
            control={form.control as any}
            name="experienceTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de experiencia</FormLabel>
                <Select
                  disabled={loadingExpTypes || !!expTypesError || saving}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingExpTypes
                            ? "Cargando tipos..."
                            : expTypesError
                            ? "Error cargando tipos"
                            : "Seleccione un tipo de experiencia"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {experienceTypes.map((t) => {
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
                {expTypesError && (
                  <p className="text-xs text-destructive mt-1">
                    No se pudieron cargar los tipos de experiencia.
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Dirección institución */}
          <FormField
            control={form.control as any}
            name="institutionAddress"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Dirección de la Institución</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-institution-address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Razón de salida */}
          <FormField
            control={form.control as any}
            name="exitReason"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Razón de salida (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-exit-reason" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Razón de entrada */}
        <FormField
          control={form.control as any}
          name="entryReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razón de entrada (requerido)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  data-testid="textarea-entry-reason"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!workExperience && (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <Label>Certificado de experiencia laboral (opcional)</Label>
            <ReusableFileUpload
              key={fileUploadKey}
              directoryCode={WORK_EXPERIENCE_CERTIFICATE_DIRECTORY_CODE}
              relativePath={WORK_EXPERIENCE_CERTIFICATE_ENTITY_TYPE.toLowerCase()}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={MAX_FILE_MB}
              label="Certificado de experiencia laboral"
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

        {/* Botones */}
        <div className="flex gap-2 pt-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            data-testid="button-submit"
            className="relative"
          >
            {saving && (
              <RefreshCw className="h-4 w-4 animate-spin absolute left-3" />
            )}
            {saving
              ? "Guardando..."
              : workExperience
              ? "Actualizar"
              : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
