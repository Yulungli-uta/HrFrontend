// client/src/components/person-detail/forms/CatastrophicIllnessForm.tsx
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

import type { CatastrophicIllness } from "@/types/person";
import { TiposReferenciaAPI, EnfermedadesCatastroficasAPI, type RefType } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import {
  CATASTROPHIC_ILLNESS_CERTIFICATE_DIRECTORY_CODE,
  CATASTROPHIC_ILLNESS_CERTIFICATE_ENTITY_TYPE,
} from "@/features/constants";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

// Solo números (números de certificado/IESS en Ecuador son numéricos)
const numericRegex = /^[0-9]+$/;

const catastrophicIllnessFormSchema = z.object({
  illnessTypeId: z
    .number({
      required_error: "El tipo de enfermedad es requerido",
      invalid_type_error: "El tipo de enfermedad es requerido",
    })
    .int()
    .positive(),

  illness: z
    .string()
    .min(1, "El diagnóstico/descripción es requerido"),

  // La BD permite nulo, pero sin certificado el registro no tiene sustento legal real
  // (mismo criterio ya usado en Contacto de Emergencia con el teléfono).
  certificateNumber: z
    .string()
    .min(1, "El número de certificado médico es requerido"),

  iessNumber: z
    .string()
    .optional()
    .refine((val) => !val || numericRegex.test(val), {
      message: "Solo se permiten números",
    }),

  substituteName: z.string().optional(),
});

export type CatastrophicIllnessFormData = z.infer<
  typeof catastrophicIllnessFormSchema
>;

function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

const MAX_FILE_MB = 10;

interface CatastrophicIllnessFormProps {
  personId: number;
  catastrophicIllness?: CatastrophicIllness | null;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  /** Cierra el diálogo y refresca la lista — usado en el camino de creación-con-documento,
   * que hace su propia llamada fuera del flujo genérico de mutaciones. */
  closeAndRefresh?: () => void;
}

export default function CatastrophicIllnessForm({
  personId,
  catastrophicIllness,
  onSubmit,
  onCancel,
  isLoading = false,
  onDirtyChange,
  closeAndRefresh,
}: CatastrophicIllnessFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>("");
  const [isSavingWithDocument, setIsSavingWithDocument] = useState(false);
  const [fileUploadKey, setFileUploadKey] = useState(0);

  const {
    data: illnessTypesResp,
    isLoading: loadingIllnessTypes,
    error: illnessTypesError,
  } = useQuery({
    queryKey: ["refTypes", "CATASTROPHIC_ILLNESS_TYPE"],
    queryFn: () =>
      TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.CATASTROPHIC_ILLNESS_TYPE),
  });

  const { data: docTypesResp } = useQuery({
    queryKey: ["refTypes", "CV_DOCUMENT_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.CV_DOCUMENT_TYPE),
  });

  const illnessTypes: RefType[] =
    illnessTypesResp?.status === "success"
      ? (illnessTypesResp.data ?? []).filter((t: any) => t.isActive)
      : [];

  const docTypes: RefType[] =
    docTypesResp?.status === "success" ? (docTypesResp.data ?? []).filter((t: any) => t.isActive) : [];

  const form = useForm<CatastrophicIllnessFormData>({
    resolver: zodResolver(catastrophicIllnessFormSchema),
    defaultValues: {
      illnessTypeId:
        catastrophicIllness?.illnessTypeId != null &&
        !Number.isNaN(Number(catastrophicIllness.illnessTypeId))
          ? Number(catastrophicIllness.illnessTypeId)
          : 0,
      illness: catastrophicIllness?.illness ?? "",
      certificateNumber: catastrophicIllness?.certificateNumber ?? "",
      iessNumber: catastrophicIllness?.iessNumber ?? "",
      substituteName: catastrophicIllness?.substituteName ?? "",
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  const _isDirty = form.formState.isDirty;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_isDirty);
  }, [_isDirty]);

  useEffect(() => {
    if (catastrophicIllness) {
      form.reset({
        illnessTypeId:
          catastrophicIllness.illnessTypeId != null &&
          !Number.isNaN(Number(catastrophicIllness.illnessTypeId))
            ? Number(catastrophicIllness.illnessTypeId)
            : 0,
        illness: catastrophicIllness.illness ?? "",
        certificateNumber: catastrophicIllness.certificateNumber ?? "",
        iessNumber: catastrophicIllness.iessNumber ?? "",
        substituteName: catastrophicIllness.substituteName ?? "",
      });
    } else {
      form.reset({
        illnessTypeId: 0,
        illness: "",
        certificateNumber: "",
        iessNumber: "",
        substituteName: "",
      });
    }
  }, [catastrophicIllness, form]);

  const handleSubmit = async (data: CatastrophicIllnessFormData) => {
    // Camino con documento adjunto: solo aplica al crear (aún no existe un illnessId
    // al que asociar el archivo si se está editando).
    if (!catastrophicIllness && selectedFile) {
      setIsSavingWithDocument(true);
      try {
        const formData = new FormData();
        formData.append("PersonId", String(personId));
        formData.append("Illness", data.illness);
        formData.append("IllnessTypeId", String(data.illnessTypeId));
        formData.append("CertificateNumber", data.certificateNumber);
        if (data.iessNumber) formData.append("IESSNumber", data.iessNumber);
        if (data.substituteName) formData.append("SubstituteName", data.substituteName);
        formData.append("File", selectedFile);
        if (selectedDocTypeId) formData.append("DocumentTypeId", selectedDocTypeId);

        const res = await EnfermedadesCatastroficasAPI.createWithDocument(formData);
        if (res.status === "error") {
          throw new Error(res.error?.message || "No se pudo crear el registro con el documento adjunto.");
        }

        await queryClient.invalidateQueries({ queryKey: ["catastrophicIllnesses", String(personId)] });
        toast({ title: "✅ Éxito", description: "Enfermedad catastrófica y certificado registrados correctamente." });
        form.reset();
        setSelectedFile(null);
        setFileUploadKey((k) => k + 1);
        closeAndRefresh?.();
      } catch (error: any) {
        logger.error("CatastrophicIllnessForm", "[CatastrophicIllnessForm] createWithDocument ERROR", error);
        toast({
          title: "❌ Error",
          description: error?.message || "No se pudo registrar la enfermedad catastrófica con el certificado.",
          variant: "destructive",
        });
      } finally {
        setIsSavingWithDocument(false);
      }
      return;
    }

    const payload = {
      illnessId: catastrophicIllness?.illnessId ?? 0,
      personId,
      illnessTypeId: data.illnessTypeId,
      illness: data.illness,
      certificateNumber: data.certificateNumber,
      iessNumber: data.iessNumber || null,
      substituteName: data.substituteName || null,
    };

    try {
      await onSubmit(payload);
      if (!catastrophicIllness) {
        form.reset();
      }
    } catch (error) {
      logger.error(
        "CatastrophicIllnessForm",
        "[CatastrophicIllnessForm] onSubmit ERROR",
        error
      );
    }
  };

  const saving = isLoading || isSavingWithDocument;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        data-testid="catastrophic-illness-form"
      >
        <p className="text-xs text-muted-foreground rounded-md bg-muted/40 px-3 py-2">
          Información médica confidencial — solo tú y RRHH pueden ver estos datos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo de enfermedad */}
          <FormField
            control={form.control}
            name="illnessTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de enfermedad</FormLabel>
                <Select
                  disabled={loadingIllnessTypes || !!illnessTypesError || saving}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-illness-type">
                      <SelectValue
                        placeholder={
                          loadingIllnessTypes
                            ? "Cargando tipos..."
                            : "Seleccionar tipo"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {illnessTypes.map((t) => {
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
                <FormMessage />
                {illnessTypesError && (
                  <p className="text-xs text-destructive mt-1">
                    No se pudieron cargar los tipos de enfermedad.
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* N° certificado médico */}
          <FormField
            control={form.control}
            name="certificateNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>N.° de certificado médico</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="N.° de certificado" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Diagnóstico / descripción */}
        <FormField
          control={form.control}
          name="illness"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diagnóstico / descripción</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: Insuficiencia renal crónica estadio 4" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* N° IESS */}
          <FormField
            control={form.control}
            name="iessNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>N.° IESS (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Solo números" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nombre del sustituto */}
          <FormField
            control={form.control}
            name="substituteName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del sustituto (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Persona designada para el relevo laboral" />
                </FormControl>
                <FormDescription>
                  Persona que la ley permite designar para cubrir sus funciones durante
                  el permiso laboral por enfermedad catastrófica.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!catastrophicIllness && (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <Label>Certificado médico de respaldo (opcional)</Label>
            <ReusableFileUpload
              key={fileUploadKey}
              directoryCode={CATASTROPHIC_ILLNESS_CERTIFICATE_DIRECTORY_CODE}
              relativePath={CATASTROPHIC_ILLNESS_CERTIFICATE_ENTITY_TYPE.toLowerCase()}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={MAX_FILE_MB}
              label="Certificado médico de respaldo"
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
              Si adjuntas un archivo, el registro y el certificado se guardan juntos — si algo falla, no queda ninguno de los dos a medias.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-4 justify-end">
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
            disabled={saving || loadingIllnessTypes}
            data-testid="button-submit"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />}
            {saving ? "Guardando..." : catastrophicIllness ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
