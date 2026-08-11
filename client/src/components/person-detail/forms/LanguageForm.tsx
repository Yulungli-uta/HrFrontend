import { useEffect, useRef, useState } from "react";
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

import type { Language } from "@/types/person";
import { TiposReferenciaAPI, IdiomasAPI, type RefType } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { LANGUAGE_CERTIFICATION_DIRECTORY_CODE, LANGUAGE_CERTIFICATION_ENTITY_TYPE } from "@/features/constants";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

// =============================
// Zod schema
// =============================
const languageFormSchema = z.object({
  languageTypeId: z
    .number({
      required_error: "El idioma es requerido",
      invalid_type_error: "El idioma es requerido",
    })
    .int()
    .positive(),

  levelTypeId: z
    .number({
      required_error: "El nivel es requerido",
      invalid_type_error: "El nivel es requerido",
    })
    .int()
    .positive(),

  referenceFramework: z.string().optional(),
  certifyingInstitution: z.string().optional(),
  countryId: z.string().optional(),

  issueDate: z.string().min(1, "La fecha de emisión es requerida"),
  expirationDate: z.string().optional(),
});

export type LanguageFormData = z.infer<typeof languageFormSchema>;

interface LanguageFormProps {
  personId: number;
  language?: Language | null;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  closeAndRefresh?: () => void;
}

const MAX_FILE_MB = 10;

function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

export default function LanguageForm({
  personId,
  language,
  onSubmit,
  onCancel,
  isLoading = false,
  onDirtyChange,
  closeAndRefresh,
}: LanguageFormProps) {
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

  // LANGUAGE
  const {
    data: languagesResponse,
    isLoading: loadingLanguages,
    error: languagesError,
  } = useQuery({
    queryKey: ["refTypes", "LANGUAGE"],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.LANGUAGE),
  });

  const languageOptions: RefType[] =
    languagesResponse?.status === "success"
      ? (languagesResponse.data ?? []).filter((t: any) => t.isActive)
      : [];

  // LANGUAGE_LEVEL
  const {
    data: levelsResponse,
    isLoading: loadingLevels,
    error: levelsError,
  } = useQuery({
    queryKey: ["refTypes", "LANGUAGE_LEVEL"],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.LANGUAGE_LEVEL),
  });

  const levelOptions: RefType[] =
    levelsResponse?.status === "success"
      ? (levelsResponse.data ?? []).filter((t: any) => t.isActive)
      : [];

  const form = useForm<LanguageFormData>({
    resolver: zodResolver(languageFormSchema) as any,
    defaultValues: {
      languageTypeId: language?.languageTypeId ? Number(language.languageTypeId) : 0,
      levelTypeId: language?.levelTypeId ? Number(language.levelTypeId) : 0,
      referenceFramework: language?.referenceFramework ?? "CEFR",
      certifyingInstitution: language?.certifyingInstitution ?? "",
      countryId: language?.countryId ?? "",
      issueDate: language?.issueDate ?? "",
      expirationDate: language?.expirationDate ?? "",
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  const _isDirty = form.formState.isDirty;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_isDirty);
  }, [_isDirty]);

  const handleSubmit = async (data: LanguageFormData) => {
    // Camino con documento adjunto: solo al crear.
    if (!language && selectedFile) {
      setIsSavingWithDocument(true);
      try {
        const formData = new FormData();
        formData.append("PersonId", String(personId));
        formData.append("LanguageTypeId", String(data.languageTypeId));
        formData.append("LevelTypeId", String(data.levelTypeId));
        formData.append("ReferenceFramework", data.referenceFramework || "CEFR");
        if (data.certifyingInstitution) formData.append("CertifyingInstitution", data.certifyingInstitution);
        if (data.countryId) formData.append("CountryId", data.countryId);
        formData.append("IssueDate", data.issueDate);
        if (data.expirationDate) formData.append("ExpirationDate", data.expirationDate);
        formData.append("File", selectedFile);
        if (selectedDocTypeId) formData.append("DocumentTypeId", selectedDocTypeId);

        const res = await IdiomasAPI.createWithDocument(formData);
        if (res.status === "error") {
          throw new Error(res.error?.message || "No se pudo crear la certificación de idioma con el documento adjunto.");
        }

        await queryClient.invalidateQueries({ queryKey: ["languages", String(personId)] });
        toast({ title: "✅ Éxito", description: "Certificación de idioma y documento registrados correctamente." });
        form.reset();
        setSelectedFile(null);
        setFileUploadKey((k) => k + 1);
        closeAndRefresh?.();
      } catch (error: any) {
        logger.error("LanguageForm", "[LanguageForm] createWithDocument ERROR", error);
        toast({
          title: "❌ Error",
          description: error?.message || "No se pudo registrar la certificación de idioma con el documento.",
          variant: "destructive",
        });
      } finally {
        setIsSavingWithDocument(false);
      }
      return;
    }

    const payload: any = {
      languageId: language?.languageId ?? 0,
      personId,
      languageTypeId: data.languageTypeId,
      levelTypeId: data.levelTypeId,
      referenceFramework: data.referenceFramework || "CEFR",
      certifyingInstitution: data.certifyingInstitution || null,
      countryId: data.countryId || null,
      issueDate: data.issueDate,
      expirationDate: data.expirationDate && data.expirationDate !== "" ? data.expirationDate : null,
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      logger.error("LanguageForm", "[LanguageForm] onSubmit ERROR", error);
    }
  };

  const saving = isLoading || isSavingWithDocument;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit as any)}
        className="space-y-6"
        data-testid="language-form"
      >
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">Certificación de idioma</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="languageTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Idioma</FormLabel>
                  <Select
                    disabled={loadingLanguages || saving}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar idioma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languageOptions.map((t) => {
                        const id = getRefTypeId(t);
                        if (id == null) return null;
                        return (
                          <SelectItem key={id} value={String(id)}>
                            {t.description ?? t.code ?? `Idioma ${id}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {languagesError && (
                    <p className="text-xs text-destructive mt-1">No se pudieron cargar los idiomas.</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="levelTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel (CEFR)</FormLabel>
                  <Select
                    disabled={loadingLevels || saving}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar nivel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {levelOptions.map((t) => {
                        const id = getRefTypeId(t);
                        if (id == null) return null;
                        return (
                          <SelectItem key={id} value={String(id)}>
                            {t.description ?? t.code ?? `Nivel ${id}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {levelsError && (
                    <p className="text-xs text-destructive mt-1">No se pudieron cargar los niveles.</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="certifyingInstitution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institución certificadora</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Cambridge Assessment English" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="countryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Código de país (ej. GB, EC)" maxLength={10} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">Vigencia</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="issueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de emisión</FormLabel>
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
              control={form.control as any}
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de expiración (opcional)</FormLabel>
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
          </div>
        </div>

        {!language && (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <Label>Certificado de idioma (opcional)</Label>
            <ReusableFileUpload
              key={fileUploadKey}
              directoryCode={LANGUAGE_CERTIFICATION_DIRECTORY_CODE}
              relativePath={LANGUAGE_CERTIFICATION_ENTITY_TYPE.toLowerCase()}
              accept=".pdf"
              maxSizeMB={MAX_FILE_MB}
              label="Certificado de idioma"
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={saving || loadingLanguages || loadingLevels}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : language ? (
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
