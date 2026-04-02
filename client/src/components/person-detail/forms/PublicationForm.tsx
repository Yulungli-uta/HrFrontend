import { useEffect } from "react";
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

import type { Publication } from "@/types/person";
import {
  TiposReferenciaAPI,
  type RefType,
  AreaConocimientoAPI,
} from "@/lib/api";

// =============================
// Zod schema
// =============================
const publicationFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),

  journalName: z.string().optional(),
  journalNumber: z.string().optional(),
  volume: z.string().optional(),
  pages: z.string().optional(),
  issn_Isbn: z.string().optional(),
  location: z.string().optional(),

  publicationTypeId: z
    .number({
      required_error: "El tipo de publicación es requerido",
      invalid_type_error: "El tipo de publicación es requerido",
    })
    .int()
    .positive(),

  isIndexed: z.boolean().optional().default(false),
  journalTypeId: z.number().int().nonnegative().optional(),

  knowledgeAreaTypeId: z.number().int().nonnegative().optional(),
  subAreaTypeId: z.number().int().nonnegative().optional(),
  areaTypeId: z.number().int().nonnegative().optional(),

  organizedBy: z.string().optional(),
  eventName: z.string().optional(),
  eventEdition: z.string().optional(),

  publicationDate: z.string().optional(),

  utAffiliation: z.boolean().optional().default(true),

  notes: z.string().optional(),
});

export type PublicationFormData = z.infer<typeof publicationFormSchema>;

interface PublicationFormProps {
  personId: number;
  publication?: Publication | null;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Helper RefType
function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

// Tipo KnowledgeArea
type KnowledgeArea = {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  levels: number;
  isActive: boolean;
};

// Helper genérico para sacar IDs que pueden venir como:
// - campo simple: obj[fieldName] = 154
// - objeto ref:   obj[refField] = { typeId / typeID / id }
function getNumericId(
  source: any,
  fieldName: string,
  refFieldName?: string
): number | undefined {
  if (!source) return undefined;

  const direct = (source as any)[fieldName];
  if (direct !== null && direct !== undefined) {
    const n = Number(direct);
    return Number.isNaN(n) ? undefined : n;
  }

  if (refFieldName) {
    const ref = (source as any)[refFieldName];
    if (ref) {
      const candidate =
        (ref as any).typeID ??
        (ref as any).typeId ??
        (ref as any).id ??
        (ref as any).areaTypeId ??
        (ref as any).knowledgeAreaTypeId ??
        (ref as any).subAreaTypeId;
      if (candidate !== null && candidate !== undefined) {
        const n = Number(candidate);
        return Number.isNaN(n) ? undefined : n;
      }
    }
  }

  return undefined;
}

// =============================
// Componente
// =============================
export default function PublicationForm({
  personId,
  publication,
  onSubmit,
  onCancel,
  isLoading = false,
}: PublicationFormProps) {
  // =============================
  // QUERIES
  // =============================
  const {
    data: publicationTypesResponse,
    isLoading: loadingPublicationTypes,
    error: publicationTypesError,
  } = useQuery({
    queryKey: ["refTypes", "PUBLICATION_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory("PUBLICATION_TYPE"),
  });

  const selectedPublicationTypeId = publication
    ? getNumericId(publication, "publicationTypeId", "publicationType")
    : undefined;

  const publicationTypesData: RefType[] =
    publicationTypesResponse?.status === "success"
      ? (publicationTypesResponse.data ?? [])
      : [];

  // Mantener el seleccionado aunque esté inactivo
  const publicationTypes: RefType[] = publicationTypesData.filter((t: any) => {
    const id = getRefTypeId(t);
    if (id == null) return false;
    if (selectedPublicationTypeId && id === selectedPublicationTypeId) {
      return true;
    }
    return t.isActive;
  });

  const {
    data: journalTypesResponse,
    isLoading: loadingJournalTypes,
    error: journalTypesError,
  } = useQuery({
    queryKey: ["refTypes", "JOURNAL_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory("JOURNAL_TYPE"),
  });

  const selectedJournalTypeId = publication
    ? getNumericId(publication, "journalTypeId", "journalType")
    : undefined;

  const journalTypesData: RefType[] =
    journalTypesResponse?.status === "success"
      ? (journalTypesResponse.data ?? [])
      : [];

  const journalTypes: RefType[] = journalTypesData.filter((t: any) => {
    const id = getRefTypeId(t);
    if (id == null) return false;
    if (selectedJournalTypeId && id === selectedJournalTypeId) {
      return true;
    }
    return t.isActive;
  });

  const { data: level1Response, error: errorLevel1 } = useQuery({
    queryKey: ["knowledgeArea", "level1"],
    queryFn: () => AreaConocimientoAPI.list(),
  });

  const level1Areas: KnowledgeArea[] =
    level1Response?.status === "success"
      ? (level1Response.data as KnowledgeArea[]).filter(
        (a) => a.isActive && (a.parentId === null || a.parentId === undefined)
      )
      : [];

  // =============================
  // useForm
  // =============================
  const form = useForm<PublicationFormData>({
    resolver: zodResolver(publicationFormSchema) as any,
    defaultValues: {
      title: "",
      journalName: "",
      journalNumber: "",
      volume: "",
      pages: "",
      issn_Isbn: "",
      location: "",
      publicationTypeId: undefined,
      isIndexed: false,
      journalTypeId: undefined,
      knowledgeAreaTypeId: undefined,
      subAreaTypeId: undefined,
      areaTypeId: undefined,
      organizedBy: "",
      eventName: "",
      eventEdition: "",
      publicationDate: "",
      utAffiliation: true,
      notes: "",
    },
  });

  const knowledgeAreaTypeId = form.watch("knowledgeAreaTypeId");
  const subAreaTypeId = form.watch("subAreaTypeId");

  const { data: level2Response, error: errorLevel2 } = useQuery({
    queryKey: ["knowledgeArea", "level2", knowledgeAreaTypeId],
    queryFn: () =>
      AreaConocimientoAPI.byParentId(knowledgeAreaTypeId as number),
    enabled: !!knowledgeAreaTypeId,
  });

  const level2Areas: KnowledgeArea[] =
    level2Response?.status === "success"
      ? (level2Response.data as KnowledgeArea[]).filter((a) => a.isActive)
      : [];

  const { data: level3Response, error: errorLevel3 } = useQuery({
    queryKey: ["knowledgeArea", "level3", subAreaTypeId],
    queryFn: () => AreaConocimientoAPI.byParentId(subAreaTypeId as number),
    enabled: !!subAreaTypeId,
  });

  const level3Areas: KnowledgeArea[] =
    level3Response?.status === "success"
      ? (level3Response.data as KnowledgeArea[]).filter((a) => a.isActive)
      : [];

  // =============================
  // Cargar datos al EDITAR
  // =============================
  useEffect(() => {
    if (!publication) return;

    form.reset({
      title: publication.title ?? "",

      journalName: publication.journalName ?? "",
      journalNumber: (publication as any)?.journalNumber ?? "",
      volume: (publication as any)?.volume ?? "",
      pages: (publication as any)?.pages ?? "",
      issn_Isbn: publication.issn_Isbn ?? "",
      location: publication.location ?? "",

      publicationTypeId: getNumericId(
        publication,
        "publicationTypeId",
        "publicationType"
      ),

      isIndexed: (publication as any)?.isIndexed ?? false,

      journalTypeId: getNumericId(
        publication,
        "journalTypeId",
        "journalType"
      ),

      knowledgeAreaTypeId: getNumericId(
        publication,
        "knowledgeAreaTypeId",
        "knowledgeAreaType"
      ),
      subAreaTypeId: getNumericId(
        publication,
        "subAreaTypeId",
        "subAreaType"
      ),
      areaTypeId: getNumericId(publication, "areaTypeId", "areaType"),

      organizedBy: (publication as any)?.organizedBy ?? "",
      eventName: (publication as any)?.eventName ?? "",
      eventEdition: (publication as any)?.eventEdition ?? "",

      publicationDate: publication.publicationDate ?? "",

      utAffiliation: (publication as any)?.utAffiliation ?? true,

      notes: (publication as any)?.notes ?? "",
    });
  }, [publication, form]);

  // =============================
  // SUBMIT (crear + actualizar)
  // =============================
  const handleSubmit = async (data: PublicationFormData) => {
    const now = new Date();

    const toIntOrZero = (x: any) =>
      x !== null && x !== undefined && !Number.isNaN(Number(x))
        ? Number(x)
        : 0;

    const payload = {
      publicationId: (publication as any)?.publicationId ?? 0,
      personId,

      title: data.title,
      location: data.location ?? "",
      publicationTypeId: data.publicationTypeId,
      isIndexed: data.isIndexed ?? false,

      journalTypeId: toIntOrZero(data.journalTypeId),
      issn_Isbn: data.issn_Isbn ?? "",
      journalName: data.journalName ?? "",
      journalNumber: data.journalNumber ?? "",
      volume: data.volume ?? "",
      pages: data.pages ?? "",

      knowledgeAreaTypeId: toIntOrZero(data.knowledgeAreaTypeId),
      subAreaTypeId: toIntOrZero(data.subAreaTypeId),
      areaTypeId: toIntOrZero(data.areaTypeId),

      organizedBy: data.organizedBy ?? "",
      eventName: data.eventName ?? "",
      eventEdition: data.eventEdition ?? "",

      publicationDate:
        data.publicationDate && data.publicationDate !== ""
          ? data.publicationDate
          : now.toISOString().slice(0, 10),

      utAffiliation: data.utAffiliation ?? true,
      createdAt: (publication as any)?.createdAt ?? now.toISOString(),
      notes: data.notes ?? "",
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      console.error("[PublicationForm] submit error", err);
    }
  };

  const saving = isLoading;

  // =============================
  // UI
  // =============================
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit as any)}
        className="space-y-6"
        data-testid="publication-form"
      >
        {/* DATOS GENERALES */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Datos generales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título */}
            <FormField
              control={form.control as any}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Título de la publicación</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ingrese título" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo publicación */}
            <FormField
              control={form.control as any}
              name="publicationTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de publicación</FormLabel>
                  <Select
                    disabled={loadingPublicationTypes || saving}
                    value={
                      field.value !== null && field.value !== undefined
                        ? String(field.value)
                        : ""
                    }
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {publicationTypes.map((t) => {
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
                  {publicationTypesError && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar los tipos de publicación.
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* isIndexed */}
            <FormField
              control={form.control as any}
              name="isIndexed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publicación indexada</FormLabel>
                  <Select
                    disabled={saving}
                    value={field.value ? "true" : "false"}
                    onValueChange={(v) => field.onChange(v === "true")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* utAffiliation */}
            <FormField
              control={form.control as any}
              name="utAffiliation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Con afiliación UTA</FormLabel>
                  <Select
                    disabled={saving}
                    value={field.value ? "true" : "false"}
                    onValueChange={(v) => field.onChange(v === "true")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* REVISTA / MEDIO */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Revista / Medio
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="journalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre revista / medio</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre de la revista" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* journalTypeId */}
            <FormField
              control={form.control as any}
              name="journalTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de revista / medio</FormLabel>
                  <Select
                    disabled={loadingJournalTypes || saving}
                    value={
                      field.value !== null && field.value !== undefined
                        ? String(field.value)
                        : ""
                    }
                    onValueChange={(v) =>
                      field.onChange(v === "" ? undefined : Number(v))
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingJournalTypes
                              ? "Cargando tipos de revista..."
                              : "Seleccionar tipo de revista"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {journalTypes.map((t) => {
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
                  {journalTypesError && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar los tipos de revista.
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="journalNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Número" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="volume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volumen</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Volumen" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="pages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Páginas</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej. 12-25" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="issn_Isbn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISSN / ISBN</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ISSN o ISBN" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* EVENTO */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Evento y ubicación
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="organizedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organizado por</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Entidad organizadora" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="eventName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del evento</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre del evento" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="eventEdition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Edición del evento</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="1ra, 2da, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
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

            <FormField
              control={form.control as any}
              name="publicationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha publicación</FormLabel>
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

        {/* ÁREAS DE CONOCIMIENTO */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Áreas de conocimiento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Nivel 1 */}
            <FormField
              control={form.control as any}
              name="knowledgeAreaTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área Conocimiento</FormLabel>
                  <Select
                    disabled={saving}
                    value={
                      field.value !== null && field.value !== undefined
                        ? String(field.value)
                        : ""
                    }
                    onValueChange={(v) => {
                      field.onChange(Number(v));
                      form.setValue("subAreaTypeId", undefined);
                      form.setValue("areaTypeId", undefined);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {level1Areas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {errorLevel1 && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar las áreas de conocimiento.
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Nivel 2 */}
            <FormField
              control={form.control as any}
              name="subAreaTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SubÁrea</FormLabel>
                  <Select
                    disabled={!knowledgeAreaTypeId || saving}
                    value={
                      field.value !== null && field.value !== undefined
                        ? String(field.value)
                        : ""
                    }
                    onValueChange={(v) => {
                      field.onChange(Number(v));
                      form.setValue("areaTypeId", undefined);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {level2Areas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {errorLevel2 && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar las subáreas.
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Nivel 3 */}
            <FormField
              control={form.control as any}
              name="areaTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área específica</FormLabel>
                  <Select
                    disabled={!subAreaTypeId || saving}
                    value={
                      field.value !== null && field.value !== undefined
                        ? String(field.value)
                        : ""
                    }
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {level3Areas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {errorLevel3 && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar las áreas específicas.
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
            control={form.control as any}
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
          <Button type="submit" disabled={saving || loadingPublicationTypes}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : publication ? (
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
