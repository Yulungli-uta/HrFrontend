// client/src/components/person-detail/forms/FamilyMemberForm.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw } from "lucide-react";
import { ReusableFileUpload } from "@/components/ReusableFileUpload";
import type { FamilyMember } from "@/types/person";
import { CargasFamiliaresAPI, TiposReferenciaAPI, type RefType } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { FAMILY_MEMBER_DOCUMENT_DIRECTORY_CODE, FAMILY_MEMBER_DOCUMENT_ENTITY_TYPE } from "@/features/constants";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

const familyMemberFormSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  identificationTypeId: z.string().min(1, "El tipo de identificación es requerido"),
  dependentId: z.string().min(1, "El número de identificación es requerido"),
  birthDate: z.string().min(1, "La fecha de nacimiento es requerida"),
  relationship: z.string().min(1, "La relación es requerida"),
  hasDisability: z.boolean().default(false),
  disabilityType: z.string().optional(),
  disabilityPercentage: z.coerce
    .number()
    .min(0, "El porcentaje no puede ser negativo")
    .max(100, "El porcentaje no puede ser mayor a 100")
    .optional()
    .default(0),
  isStudying: z.boolean().default(false),
  educationInstitution: z.string().optional(),
});

type FamilyMemberFormData = z.infer<typeof familyMemberFormSchema>;

const MAX_FILE_MB = 10;

interface FamilyMemberFormProps {
  personId: number;
  familyMember?: FamilyMember;
  onSubmit: (data: FamilyMemberFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  closeAndRefresh?: () => void;
}

export default function FamilyMemberForm({
  personId,
  familyMember,
  onSubmit,
  onCancel,
  isLoading = false,
  onDirtyChange,
  closeAndRefresh,
}: FamilyMemberFormProps) {
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
  const form = useForm<FamilyMemberFormData>({
    resolver: zodResolver(familyMemberFormSchema) as any,
    defaultValues: {
      firstName: familyMember?.firstName || "",
      lastName: familyMember?.lastName || "",
      identificationTypeId: familyMember?.identificationTypeId?.toString() || "",
      dependentId: familyMember?.dependentId || "",
      birthDate: familyMember?.birthDate
        ? new Date(familyMember.birthDate).toISOString().split("T")[0]
        : "",
      relationship: familyMember?.relationship || "",
      hasDisability: familyMember?.hasDisability || false,
      disabilityType: familyMember?.disabilityTypeId != null
        ? String(familyMember.disabilityTypeId)
        : "",
      disabilityPercentage: familyMember?.disabilityPercentage || 0,
      isStudying: familyMember?.isStudying || false,
      educationInstitution: familyMember?.educationInstitution || "",
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  const _isDirty = form.formState.isDirty;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_isDirty);
  }, [_isDirty]);

  const hasDisability = form.watch("hasDisability");
  const isStudying = form.watch("isStudying");

  useEffect(() => {
    if (!hasDisability) {
      form.setValue("disabilityType", "");
      form.setValue("disabilityPercentage", 0);
    }
  }, [hasDisability, form]);

  useEffect(() => {
    if (!isStudying) {
      form.setValue("educationInstitution", "");
    }
  }, [isStudying, form]);

  const saving = isLoading || isSavingWithDocument;

  const handleSubmit = async (data: FamilyMemberFormData) => {
    if (!familyMember && selectedFile) {
      setIsSavingWithDocument(true);
      try {
        const formData = new FormData();
        formData.append("PersonId", String(personId));
        formData.append("DependentId", data.dependentId);
        formData.append("IdentificationTypeId", data.identificationTypeId);
        formData.append("FirstName", data.firstName);
        formData.append("LastName", data.lastName);
        formData.append("BirthDate", data.birthDate);
        if (data.hasDisability && data.disabilityType) {
          const disabilityTypeId = Number(data.disabilityType);
          if (!Number.isNaN(disabilityTypeId)) {
            formData.append("DisabilityTypeId", String(disabilityTypeId));
          }
        }
        formData.append("File", selectedFile);
        if (selectedDocTypeId) {
          formData.append("DocumentTypeId", selectedDocTypeId);
        }

        await CargasFamiliaresAPI.createWithDocument(formData);
        await queryClient.invalidateQueries({ queryKey: ["familyMembers", String(personId)] });
        toast({
          title: "Carga familiar registrada",
          description: "El registro y el documento se guardaron correctamente.",
        });
        form.reset();
        setSelectedFile(null);
        setSelectedDocTypeId("");
        setFileUploadKey((k) => k + 1);
        closeAndRefresh?.();
      } catch (error) {
        logger.error("FamilyMemberForm", "Error creating family member with document:", error);
        toast({
          title: "Error",
          description: "No se pudo registrar la carga familiar con el documento adjunto.",
          variant: "destructive",
        });
      } finally {
        setIsSavingWithDocument(false);
      }
      return;
    }

    try {
      await onSubmit(data);
      if (!familyMember) {
        form.reset();
      }
    } catch (error) {
      logger.error("FamilyMemberForm", "Error submitting family member:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombres</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellidos</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="identificationTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Identificación</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-identification-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Cédula</SelectItem>
                    <SelectItem value="2">Pasaporte</SelectItem>
                    <SelectItem value="3">RUC</SelectItem>
                    <SelectItem value="4">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="dependentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Identificación</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-dependent-id" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Nacimiento</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    data-testid="input-birth-date"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relación</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-relationship">
                      <SelectValue placeholder="Seleccionar relación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Cónyuge">Cónyuge</SelectItem>
                    <SelectItem value="Hijo/a">Hijo/a</SelectItem>
                    <SelectItem value="Padre">Padre</SelectItem>
                    <SelectItem value="Madre">Madre</SelectItem>
                    <SelectItem value="Hermano/a">Hermano/a</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <FormField
            control={form.control as any}
            name="hasDisability"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-has-disability"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Tiene discapacidad</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {hasDisability && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <FormField
                control={form.control as any}
                name="disabilityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Discapacidad</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-disability-type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="disabilityPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porcentaje de Discapacidad (%)</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-disability-percentage"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control as any}
            name="isStudying"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-is-studying"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Actualmente estudiando</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {isStudying && (
            <div className="ml-6">
              <FormField
                control={form.control as any}
                name="educationInstitution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institución Educativa</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-education-institution" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {!familyMember && (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <Label>Documento de soporte (opcional)</Label>
            <ReusableFileUpload
              key={fileUploadKey}
              directoryCode={FAMILY_MEMBER_DOCUMENT_DIRECTORY_CODE}
              relativePath={FAMILY_MEMBER_DOCUMENT_ENTITY_TYPE.toLowerCase()}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={MAX_FILE_MB}
              label="Documento de soporte"
              disabled={saving}
              deferUpload
              onFileSelected={setSelectedFile}
            />
            {selectedFile && docTypes.length > 0 && (
              <div className="space-y-1">
                <Label>Tipo de documento</Label>
                <Select value={selectedDocTypeId} onValueChange={setSelectedDocTypeId} disabled={saving}>
                  <SelectTrigger data-testid="select-document-type">
                    <SelectValue placeholder="Seleccionar tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {docTypes.map((t) => {
                      const id = getRefTypeId(t);
                      if (id == null) return null;
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {t.description}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            type="submit"
            disabled={saving}
            data-testid="button-submit"
            className="relative min-w-[100px]"
          >
            {saving && (
              <RefreshCw className="h-4 w-4 animate-spin absolute left-3" />
            )}
            {saving ? "Guardando..." : familyMember ? "Actualizar" : "Crear"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}