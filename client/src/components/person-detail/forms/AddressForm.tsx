// client/src/components/person-detail/forms/AddressForm.tsx
import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Address } from "@/types/person";
import { ProvinciasAPI, CantonesAPI, type RefType } from "@/lib/api";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { logger } from "@/lib/logger";

const addressFormSchema = z.object({
  addressTypeId: z
    .number({
      required_error: "El tipo de dirección es requerido",
      invalid_type_error: "El tipo de dirección es requerido",
    })
    .int()
    .positive(),
  countryId: z.string().min(1, "El país es requerido"),
  // Provincia/cantón solo son obligatorios para países que sí tienen ese catálogo cargado
  // (hoy, únicamente Ecuador) — la regla efectiva se aplica en el superRefine dinámico del
  // componente, no aquí, para no hardcodear el país (hallazgo informe UTA-DITIC-PS-027-2026,
  // observación 41).
  provinceId: z.string().optional(),
  cantonId: z.string().optional(),
  parish: z.string().max(100, "No puede exceder 100 caracteres").optional(),
  neighborhood: z.string().max(100, "No puede exceder 100 caracteres").optional(),
  mainStreet: z.string().min(1, "La calle principal es requerida").max(100, "No puede exceder 100 caracteres"),
  secondaryStreet: z.string().max(100, "No puede exceder 100 caracteres").optional(),
  houseNumber: z.string().max(20, "No puede exceder 20 caracteres").optional(),
  reference: z.string().max(255, "No puede exceder 255 caracteres").optional(),
});

export type AddressFormData = z.infer<typeof addressFormSchema>;

function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

interface AddressFormProps {
  personId: number;
  address?: Address | null;
  /** Direcciones ya registradas de esta persona, para validar que no se repita una idéntica. */
  existingAddresses?: Address[];
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function AddressForm({
  personId,
  address,
  existingAddresses = [],
  onSubmit,
  onCancel,
  isLoading = false,
  onDirtyChange,
}: AddressFormProps) {
  const {
    data: addressTypesRaw,
    isLoading: loadingAddressTypes,
    error: addressTypesError,
  } = useRefTypesByCategory(REF_TYPE_CATEGORIES.ADDRESS_TYPE);

  const { data: provincesResp } = useQuery({
    queryKey: ["provinces"],
    queryFn: () => ProvinciasAPI.list(),
  });
  const { data: cantonsResp } = useQuery({
    queryKey: ["cantons"],
    queryFn: () => CantonesAPI.list(),
  });

  const addressTypes: RefType[] = addressTypesRaw.filter((t: any) => t.isActive);

  const allProvinces: any[] = provincesResp?.status === "success" ? provincesResp.data ?? [] : [];
  const allCantons: any[] = cantonsResp?.status === "success" ? cantonsResp.data ?? [] : [];

  // Países que sí tienen provincias cargadas en el catálogo — hoy, solo Ecuador.
  const countriesWithProvinces = useMemo(
    () => new Set(allProvinces.map((p) => p.countryId)),
    [allProvinces]
  );

  const resolvedSchema = useMemo(
    () =>
      addressFormSchema.superRefine((data, ctx) => {
        if (!countriesWithProvinces.has(data.countryId)) return;
        if (!data.provinceId) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["provinceId"], message: "La provincia es requerida" });
        }
        if (!data.cantonId) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cantonId"], message: "El cantón es requerido" });
        }
      }),
    [countriesWithProvinces]
  );

  const form = useForm<AddressFormData>({
    resolver: zodResolver(resolvedSchema),
    mode: "onTouched",
    defaultValues: {
      addressTypeId: address?.addressTypeId != null ? Number(address.addressTypeId) : 0,
      countryId: address?.countryId ?? "",
      provinceId: address?.provinceId ?? "",
      cantonId: address?.cantonId ?? "",
      parish: address?.parish ?? "",
      neighborhood: address?.neighborhood ?? "",
      mainStreet: address?.mainStreet ?? "",
      secondaryStreet: address?.secondaryStreet ?? "",
      houseNumber: address?.houseNumber ?? "",
      reference: address?.reference ?? "",
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  const _isDirty = form.formState.isDirty;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_isDirty);
  }, [_isDirty]);

  useEffect(() => {
    form.reset({
      addressTypeId: address?.addressTypeId != null ? Number(address.addressTypeId) : 0,
      countryId: address?.countryId ?? "",
      provinceId: address?.provinceId ?? "",
      cantonId: address?.cantonId ?? "",
      parish: address?.parish ?? "",
      neighborhood: address?.neighborhood ?? "",
      mainStreet: address?.mainStreet ?? "",
      secondaryStreet: address?.secondaryStreet ?? "",
      houseNumber: address?.houseNumber ?? "",
      reference: address?.reference ?? "",
    });
  }, [address, form]);

  const watchCountryId = useWatch({ control: form.control, name: "countryId" });
  const watchProvinceId = useWatch({ control: form.control, name: "provinceId" });

  const filteredProvinces = useMemo(
    () => allProvinces.filter((p) => !watchCountryId || p.countryId === watchCountryId),
    [allProvinces, watchCountryId]
  );
  const filteredCantons = useMemo(
    () => allCantons.filter((c) => !watchProvinceId || c.provinceId === watchProvinceId),
    [allCantons, watchProvinceId]
  );

  // Al cambiar país/provincia, invalidar las selecciones hijas que ya no correspondan —
  // salvo en el reset inicial al editar (donde countryId/provinceId ya vienen del registro).
  const countryInitialized = useRef(false);
  useEffect(() => {
    if (!countryInitialized.current) {
      countryInitialized.current = true;
      return;
    }
    form.setValue("provinceId", "", { shouldValidate: true });
    form.setValue("cantonId", "", { shouldValidate: true });
  }, [watchCountryId, form]);

  const provinceInitialized = useRef(false);
  useEffect(() => {
    if (!provinceInitialized.current) {
      provinceInitialized.current = true;
      return;
    }
    form.setValue("cantonId", "", { shouldValidate: true });
  }, [watchProvinceId, form]);

  const handleSubmit = async (data: AddressFormData) => {
    // Hallazgo informe UTA-DITIC-PS-027-2026, observación 40.
    const duplicate = existingAddresses.find(
      (a) =>
        a.addressId !== (address?.addressId ?? -1) &&
        a.addressTypeId === data.addressTypeId &&
        (a.countryId ?? "") === data.countryId &&
        (a.provinceId ?? "") === (data.provinceId ?? "") &&
        (a.cantonId ?? "") === (data.cantonId ?? "") &&
        (a.mainStreet ?? "").trim().toLowerCase() === data.mainStreet.trim().toLowerCase()
    );
    if (duplicate) {
      form.setError("mainStreet", {
        type: "manual",
        message: "Ya existe una dirección igual (mismo tipo, ubicación y calle principal).",
      });
      return;
    }

    const payload = {
      addressId: address?.addressId ?? 0,
      personId,
      addressTypeId: data.addressTypeId,
      countryId: data.countryId,
      provinceId: data.provinceId,
      cantonId: data.cantonId,
      parish: data.parish || null,
      neighborhood: data.neighborhood || null,
      mainStreet: data.mainStreet,
      secondaryStreet: data.secondaryStreet || null,
      houseNumber: data.houseNumber || null,
      reference: data.reference || null,
    };

    try {
      await onSubmit(payload);
      if (!address) form.reset();
    } catch (error) {
      logger.error("AddressForm", "[AddressForm] onSubmit ERROR", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" data-testid="address-form">
        <FormField
          control={form.control}
          name="addressTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Tipo de dirección</FormLabel>
              <Select
                disabled={loadingAddressTypes || !!addressTypesError || isLoading}
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-address-type">
                    <SelectValue placeholder={loadingAddressTypes ? "Cargando tipos..." : "Seleccionar tipo"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {addressTypes.map((t) => {
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
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="countryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>País</FormLabel>
                <CountrySelect
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  disabled={isLoading}
                  placeholder="Seleccionar país"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="provinceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required={countriesWithProvinces.has(watchCountryId)}>Provincia</FormLabel>
                <Select
                  disabled={isLoading || !watchCountryId}
                  value={field.value || ""}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={watchCountryId ? "Seleccionar provincia" : "Seleccione un país primero"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredProvinces.map((p) => (
                      <SelectItem key={p.provinceId} value={p.provinceId}>
                        {p.provinceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cantonId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required={countriesWithProvinces.has(watchCountryId)}>Cantón</FormLabel>
                <Select
                  disabled={isLoading || !watchProvinceId}
                  value={field.value || ""}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={watchProvinceId ? "Seleccionar cantón" : "Seleccione una provincia primero"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredCantons.map((c) => (
                      <SelectItem key={c.cantonId} value={c.cantonId}>
                        {c.cantonName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="parish"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parroquia (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={100} placeholder="Ej: Huachi Loreto" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barrio / Sector (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={100} placeholder="Ej: La Merced" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="mainStreet"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Calle principal</FormLabel>
              <FormControl>
                <Input {...field} maxLength={100} placeholder="Ej: Av. Cevallos" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="secondaryStreet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calle secundaria (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={100} placeholder="Ej: Sucre" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="houseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de casa (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={20} placeholder="Ej: 12-34" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referencia (opcional)</FormLabel>
              <FormControl>
                <Input {...field} maxLength={255} placeholder="Ej: Junto al parque central" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-2 pt-4 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || loadingAddressTypes} data-testid="button-submit">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? "Guardando..." : address ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
