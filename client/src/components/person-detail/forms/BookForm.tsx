// client/src/components/person-detail/BookForm.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

import type { Book } from "@/types/person";
import {
  PaisesAPI,
  TiposReferenciaAPI,
  AreaConocimientoAPI,
  type RefType,
} from "@/lib/api";

// =============================
// Tipos auxiliares
// =============================
interface CountryDto {
  countryId?: string;
  id?: number | string;
  name?: string;
  countryName?: string;
  [key: string]: unknown;
}

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

function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

type KnowledgeArea = {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  levels: number;
  isActive: boolean;
};

// =============================
// Schema Zod
// =============================
const bookFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  publisher: z.string().optional(),
  isbn: z.string().optional(),
  publicationDate: z.string().optional(),

  peerReviewed: z.boolean().optional().default(false),

  // país como string en el form, luego lo convertimos a number para el payload
  countryId: z
    .string({
      required_error: "El país es requerido",
      invalid_type_error: "El país es requerido",
    })
    .min(1, "El país es requerido"),

  city: z.string().optional(),

  knowledgeAreaTypeId: z.number().int().nonnegative().optional(),
  subAreaTypeId: z.number().int().nonnegative().optional(),
  areaTypeId: z.number().int().nonnegative().optional(),

  // lo manejamos como string en el form y luego lo convertimos a number
  volumeCount: z.string().optional(),

  participationTypeId: z
    .number({
      required_error: "El tipo de participación es requerido",
      invalid_type_error: "El tipo de participación es requerido",
    })
    .int()
    .positive(),

  bookTypeId: z
    .number({
      required_error: "El tipo de libro es requerido",
      invalid_type_error: "El tipo de libro es requerido",
    })
    .int()
    .positive(),

  utAffiliation: z.boolean().optional().default(true),
  utaSponsorship: z.boolean().optional().default(false),
});

export type BookFormData = z.infer<typeof bookFormSchema>;

interface BookFormProps {
  personId: number;
  book?: Book | null;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
}

// =============================
// Componente
// =============================
export default function BookForm({
  personId,
  book,
  onSubmit,
  onCancel,
  isLoading = false,
}: BookFormProps) {
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
  // QUERIES: Tipos referencia
  // =============================
  const {
    data: participationTypesResp,
    isLoading: loadingParticipationTypes,
    error: participationTypesError,
  } = useQuery({
    queryKey: ["refTypes", "BOOK_PARTIC_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory("BOOK_PARTIC_TYPE"),
  });

  const participationTypes: RefType[] =
    participationTypesResp?.status === "success"
      ? (participationTypesResp.data ?? []).filter((t: any) => t.isActive)
      : [];

  const {
    data: bookTypesResp,
    isLoading: loadingBookTypes,
    error: bookTypesError,
  } = useQuery({
    queryKey: ["refTypes", "BOOK_TYPE"],
    queryFn: () => TiposReferenciaAPI.byCategory("BOOK_TYPE"),
  });

  const bookTypes: RefType[] =
    bookTypesResp?.status === "success"
      ? (bookTypesResp.data ?? []).filter((t: any) => t.isActive)
      : [];

  // =============================
  // QUERIES: Áreas de conocimiento
  // =============================
  const {
    data: level1Response,
    error: errorLevel1,
  } = useQuery({
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
  const form = useForm<BookFormData>({
    resolver: zodResolver(bookFormSchema) as any,
    defaultValues: {
      title: book?.title ?? "",
      publisher: book?.publisher ?? "",
      isbn: book?.isbn ?? "",
      publicationDate: (book as any)?.publicationDate ?? "",
      peerReviewed: (book as any)?.peerReviewed ?? false,

      countryId: (book as any)?.countryId
        ? String((book as any).countryId)
        : "",
      city: (book as any)?.city ?? "",

      knowledgeAreaTypeId: (book as any)?.knowledgeAreaTypeId
        ? Number((book as any).knowledgeAreaTypeId)
        : undefined,
      subAreaTypeId: (book as any)?.subAreaTypeId
        ? Number((book as any).subAreaTypeId)
        : undefined,
      areaTypeId: (book as any)?.areaTypeId
        ? Number((book as any).areaTypeId)
        : undefined,

      volumeCount:
        (book as any)?.volumeCount !== undefined &&
        (book as any)?.volumeCount !== null
          ? String((book as any).volumeCount)
          : "",

      participationTypeId: (book as any)?.participationTypeId
        ? Number((book as any).participationTypeId)
        : 0,
      bookTypeId: (book as any)?.bookTypeId
        ? Number((book as any).bookTypeId)
        : 0,

      utAffiliation: (book as any)?.utAffiliation ?? true,
      utaSponsorship: (book as any)?.utaSponsorship ?? false,
    },
  });

  const knowledgeAreaTypeId = form.watch("knowledgeAreaTypeId");
  const subAreaTypeId = form.watch("subAreaTypeId");

  const {
    data: level2Response,
    error: errorLevel2,
  } = useQuery({
    queryKey: ["knowledgeArea", "level2", knowledgeAreaTypeId],
    queryFn: () =>
      AreaConocimientoAPI.byParentId(knowledgeAreaTypeId as number),
    enabled: !!knowledgeAreaTypeId,
  });

  const level2Areas: KnowledgeArea[] =
    level2Response?.status === "success"
      ? (level2Response.data as KnowledgeArea[]).filter((a) => a.isActive)
      : [];

  const {
    data: level3Response,
    error: errorLevel3,
  } = useQuery({
    queryKey: ["knowledgeArea", "level3", subAreaTypeId],
    queryFn: () => AreaConocimientoAPI.byParentId(subAreaTypeId as number),
    enabled: !!subAreaTypeId,
  });

  const level3Areas: KnowledgeArea[] =
    level3Response?.status === "success"
      ? (level3Response.data as KnowledgeArea[]).filter((a) => a.isActive)
      : [];

  const loadingOptions =
    loadingCountries || loadingParticipationTypes || loadingBookTypes;

  // =============================
  // SUBMIT
  // =============================
  const handleSubmit = async (data: BookFormData) => {
    const now = new Date();

    const normalizeId = (value: number | null | undefined) =>
      value !== null && value !== undefined && value !== 0 ? value : undefined;

    const volumeCountNumber =
      data.volumeCount && data.volumeCount.trim() !== ""
        ? Number(data.volumeCount)
        : undefined;

    const payload: any = {
      bookId: (book as any)?.bookId ?? 0,
      personId,
      title: data.title,
      publisher: data.publisher || null,
      isbn: data.isbn || null,
      peerReviewed: data.peerReviewed ?? false,

      // countryId: data.countryId ? Number(data.countryId) : undefined,
      countryId: data.countryId || undefined,
      city: data.city || null,
      volumeCount: volumeCountNumber,

      participationTypeId: data.participationTypeId,
      bookTypeId: data.bookTypeId,

      publicationDate:
        data.publicationDate && data.publicationDate !== ""
          ? data.publicationDate
          : now.toISOString().slice(0, 10),

      utAffiliation: data.utAffiliation ?? true,
      utaSponsorship: data.utaSponsorship ?? false,

      createdAt: (book as any)?.createdAt ?? now.toISOString(),
    };

    // Áreas de conocimiento
    const knowledgeAreaTypeIdNorm = normalizeId(
      data.knowledgeAreaTypeId as number | undefined
    );
    if (knowledgeAreaTypeIdNorm !== undefined) {
      payload.knowledgeAreaTypeId = knowledgeAreaTypeIdNorm;
    }

    const subAreaTypeIdNorm = normalizeId(
      data.subAreaTypeId as number | undefined
    );
    if (subAreaTypeIdNorm !== undefined) {
      payload.subAreaTypeId = subAreaTypeIdNorm;
    }

    const areaTypeIdNorm = normalizeId(
      data.areaTypeId as number | undefined
    );
    if (areaTypeIdNorm !== undefined) {
      payload.areaTypeId = areaTypeIdNorm;
    }

    try {
      await onSubmit(payload);
      if (!book) {
        form.reset();
      }
    } catch (error) {
      console.error("[BookForm] onSubmit ERROR", error);
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
        data-testid="book-form"
      >
        {/* ==================== */}
        {/* DATOS GENERALES */}
        {/* ==================== */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Datos del libro
          </h3>

          <FormField
            control={form.control as any}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título del libro</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="publisher"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Editorial</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-publisher" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="isbn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISBN</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-isbn" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="volumeCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de volúmenes</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Ej. 1"
                    />
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
                  <FormLabel>Fecha de publicación</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      data-testid="input-publication-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ==================== */}
        {/* UBICACIÓN */}
        {/* ==================== */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Ubicación de publicación
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="countryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <Select
                      disabled={loadingCountries || !!countriesError || saving}
                      value={field.value || ""}
                      onValueChange={(v) => field.onChange(v)}
                    >
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
                  </FormControl>
                  <FormMessage />
                  {countriesError && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar los países.
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ciudad de publicación" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ==================== */}
        {/* ÁREAS DE CONOCIMIENTO */}
        {/* ==================== */}
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
                  <FormLabel>Área conocimiento</FormLabel>
                  <Select
                    disabled={saving}
                    value={field.value ? String(field.value) : ""}
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
                  <FormLabel>Subárea</FormLabel>
                  <Select
                    disabled={!knowledgeAreaTypeId || saving}
                    value={field.value ? String(field.value) : ""}
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
                    value={field.value ? String(field.value) : ""}
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

        {/* ==================== */}
        {/* TIPOS / BOOLEANS */}
        {/* ==================== */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold">
            Clasificación y datos adicionales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo participación */}
            <FormField
              control={form.control as any}
              name="participationTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de participación</FormLabel>
                  <Select
                    disabled={
                      loadingParticipationTypes ||
                      !!participationTypesError ||
                      saving
                    }
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingParticipationTypes
                              ? "Cargando tipos..."
                              : participationTypesError
                              ? "Error cargando tipos"
                              : "Seleccione un tipo"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {participationTypes.map((t) => {
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
                  {participationTypesError && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar los tipos de participación.
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Tipo libro */}
            <FormField
              control={form.control as any}
              name="bookTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de libro</FormLabel>
                  <Select
                    disabled={loadingBookTypes || !!bookTypesError || saving}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingBookTypes
                              ? "Cargando tipos..."
                              : bookTypesError
                              ? "Error cargando tipos"
                              : "Seleccione un tipo de libro"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bookTypes.map((t) => {
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
                  {bookTypesError && (
                    <p className="text-xs text-red-500 mt-1">
                      No se pudieron cargar los tipos de libro.
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* peerReviewed → Sí / No */}
            <FormField
              control={form.control as any}
              name="peerReviewed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revisado por pares</FormLabel>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* utaSponsorship */}
            <FormField
              control={form.control as any}
              name="utaSponsorship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Financiado por UTA</FormLabel>
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

        {/* ==================== */}
        {/* BOTONES */}
        {/* ==================== */}
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
            disabled={saving || loadingOptions}
            data-testid="button-submit"
            className="relative"
          >
            {saving && (
              <RefreshCw className="h-4 w-4 animate-spin absolute left-3" />
            )}
            {saving ? "Guardando..." : book ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
