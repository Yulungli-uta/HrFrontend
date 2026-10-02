// client/src/components/person-detail/EmergencyContactForm.tsx
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

import type { EmergencyContact } from "@/types/person";
import { type RefType } from "@/lib/api";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { logger } from "@/lib/logger";

// =============================
// Regex de validación
// =============================

// Letras (may/minus), con tildes y espacios
const nameRegex = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]+$/;

// Solo números
const phoneRegex = /^[0-9]+$/;

// Solo letras y numeros (sin espacios/simbolos) — para pasaporte u otro tipo distinto de
// cedula, que puede combinar ambos.
const alphanumericRegex = /^[A-Za-z0-9]+$/;

// =============================
// Schema Zod
// =============================
// Fábrica (no constante estática): la regla "cédula = solo números, otro tipo = alfanumérico"
// depende de qué TypeId real de ref_Types corresponde a "Cédula" en este ambiente (varía por
// ambiente, ver [[reftypes-resolve-by-name-not-id]]) — se arma en el componente vía useMemo,
// mismo patrón que buildFamilyMemberFormSchema en FamilyMemberForm.tsx.
function buildEmergencyContactFormSchema(cedulaTypeId: number | undefined) {
  return z.object({
  identification: z
    .string()
    .min(1, "La identificación es requerida")
    .max(20, "No puede exceder 20 caracteres"),

  identificationTypeId: z
    .number({
      required_error: "El tipo de identificación es requerido",
      invalid_type_error: "El tipo de identificación es requerido",
    })
    .int()
    .positive(),

  firstName: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "No puede exceder 100 caracteres")
    .regex(nameRegex, "Solo se permiten letras"),

  lastName: z
    .string()
    .min(1, "El apellido es requerido")
    .max(100, "No puede exceder 100 caracteres")
    .regex(nameRegex, "Solo se permiten letras"),

  relationshipTypeId: z
    .number({
      required_error: "La relación es requerida",
      invalid_type_error: "La relación es requerida",
    })
    .int()
    .positive(),

  phone: z
    .string()
    .min(1, "El teléfono es requerido")
    .max(10, "El teléfono no puede exceder 10 dígitos")
    .regex(phoneRegex, "Solo se permiten números"),

  mobile: z
    .string()
    .max(10, "El celular no puede exceder 10 dígitos")
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val),
      { message: "Solo se permiten números" }
    ),

  address: z.string().max(255, "No puede exceder 255 caracteres").optional(),
  }).superRefine((data, ctx) => {
    const isCedula = cedulaTypeId != null && data.identificationTypeId === cedulaTypeId;
    if (isCedula) {
      if (!phoneRegex.test(data.identification)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["identification"],
          message: "La identificación debe ser solo numérica cuando el tipo es Cédula",
        });
      }
    } else if (!alphanumericRegex.test(data.identification)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identification"],
        message: "La identificación solo puede contener letras y números",
      });
    }
  });
}

export type EmergencyContactFormData = z.infer<
  ReturnType<typeof buildEmergencyContactFormSchema>
>;

// =============================
// Helper RefType
// =============================
function getRefTypeId(t: any): number | undefined {
  return t?.typeID ?? t?.typeId ?? t?.id;
}

interface EmergencyContactFormProps {
  personId: number;
  emergencyContact?: EmergencyContact | null;
  /** Contactos ya registrados de esta persona, para validar que la identificación no se repita. */
  existingContacts?: EmergencyContact[];
  // Enviamos el payload final compatible con el servicio
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

// =============================
// Componente
// =============================
export default function EmergencyContactForm({
  personId,
  emergencyContact,
  existingContacts = [],
  onSubmit,
  onCancel,
  isLoading = false,
  onDirtyChange,
}: EmergencyContactFormProps) {
  // =============================
  // Catálogo RELATIONSHIP
  // =============================
  const {
    data: relationshipTypesRaw,
    isLoading: loadingRelationshipTypes,
    error: relationshipTypesError,
  } = useRefTypesByCategory(REF_TYPE_CATEGORIES.RELATIONSHIP);

  const relationshipTypes: RefType[] = relationshipTypesRaw.filter((t: any) => t.isActive);

  // =============================
  // Catálogo IDENTITY_TYPE
  // =============================
  const {
    data: identityTypesRaw,
    isLoading: loadingIdentityTypes,
    error: identityTypesError,
  } = useRefTypesByCategory(REF_TYPE_CATEGORIES.IDENTITY_TYPE);

  const identityTypes: RefType[] = identityTypesRaw.filter((t: any) => t.isActive);

  // Hallazgo informe UTA-DITIC-PS-027-2026, observación 36 — mismo patrón que PersonForm.tsx.
  const cedulaType = useMemo(
    () =>
      identityTypes.find(
        (t: any) =>
          t.name?.toUpperCase().includes("CÉDULA") || t.name?.toUpperCase().includes("CEDULA")
      ),
    [identityTypes]
  );

  // =============================
  // Schema dinámico (depende del TypeId real de Cédula en este ambiente)
  // =============================
  const cedulaTypeId = getRefTypeId(cedulaType);
  const emergencyContactFormSchema = useMemo(
    () => buildEmergencyContactFormSchema(cedulaTypeId),
    [cedulaTypeId]
  );

  // =============================
  // useForm
  // =============================
  const form = useForm<EmergencyContactFormData>({
    resolver: zodResolver(emergencyContactFormSchema),
    mode: "onTouched",
    defaultValues: {
      identification: (emergencyContact as any)?.identification ?? "",
      identificationTypeId:
        emergencyContact?.identificationTypeId != null
          ? Number(emergencyContact.identificationTypeId)
          : 0,
      firstName: emergencyContact?.firstName ?? "",
      lastName: emergencyContact?.lastName ?? "",
      relationshipTypeId:
        (emergencyContact as any)?.relationshipTypeId != null &&
          !Number.isNaN(
            Number((emergencyContact as any).relationshipTypeId)
          )
          ? Number((emergencyContact as any).relationshipTypeId)
          : 0,
      phone: emergencyContact?.phone ?? "",
      mobile: emergencyContact?.mobile ?? "",
      address: emergencyContact?.address ?? "",
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  const _isDirty = form.formState.isDirty;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_isDirty);
  }, [_isDirty]);

  // ⭐ Muy importante: recargar valores cuando cambia emergencyContact
  useEffect(() => {
    if (emergencyContact) {
      form.reset({
        identification: (emergencyContact as any)?.identification ?? "",
        identificationTypeId:
          emergencyContact.identificationTypeId != null
            ? Number(emergencyContact.identificationTypeId)
            : 0,
        firstName: emergencyContact.firstName ?? "",
        lastName: emergencyContact.lastName ?? "",
        relationshipTypeId:
          (emergencyContact as any)?.relationshipTypeId != null &&
            !Number.isNaN(
              Number((emergencyContact as any).relationshipTypeId)
            )
            ? Number((emergencyContact as any).relationshipTypeId)
            : 0,
        phone: emergencyContact.phone ?? "",
        mobile: emergencyContact.mobile ?? "",
        address: emergencyContact.address ?? "",
      });
    } else {
      form.reset({
        identification: "",
        identificationTypeId: 0,
        firstName: "",
        lastName: "",
        relationshipTypeId: 0,
        phone: "",
        mobile: "",
        address: "",
      });
    }
  }, [emergencyContact, form]);

  // =============================
  // SUBMIT
  // =============================
  const handleSubmit = async (data: EmergencyContactFormData) => {
    const currentContactId =
      (emergencyContact as any)?.contactId ??
      (emergencyContact as any)?.emergencyContactId ??
      null;

    const duplicate = existingContacts.find(
      (c) =>
        c.contactId !== currentContactId &&
        c.identification.trim().toLowerCase() === data.identification.trim().toLowerCase()
    );
    if (duplicate) {
      form.setError("identification", {
        type: "manual",
        message: `Ya existe un contacto con esta identificación (${duplicate.firstName} ${duplicate.lastName}).`,
      });
      return;
    }

    const now = new Date();

    const payload = {
      contactId:
        (emergencyContact as any)?.contactId ??
        (emergencyContact as any)?.emergencyContactId ??
        0,
      personId,
      identification: data.identification,
      identificationTypeId: data.identificationTypeId,
      firstName: data.firstName,
      lastName: data.lastName,
      relationshipTypeId: data.relationshipTypeId,
      address: data.address || null,
      phone: data.phone,
      mobile: data.mobile || null,
      createdAt:
        (emergencyContact as any)?.createdAt ?? now.toISOString(),
    };

    try {
      await onSubmit(payload);
      if (!emergencyContact) {
        form.reset();
      }
    } catch (error) {
      logger.error("EmergencyContactForm", "[EmergencyContactForm] onSubmit ERROR", error);
    }
  };

  const saving = isLoading;

  // =============================
  // UI RESPONSIVE
  // =============================
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        data-testid="emergency-contact-form"
      >
        {/* Datos principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo de identificación */}
          <FormField
            control={form.control}
            name="identificationTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Tipo de Identificación</FormLabel>
                <Select
                  disabled={loadingIdentityTypes || !!identityTypesError || saving}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-identification-type">
                      <SelectValue
                        placeholder={loadingIdentityTypes ? "Cargando tipos..." : "Seleccionar tipo"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {identityTypes.map((t) => {
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
                {identityTypesError && (
                  <p className="text-xs text-destructive mt-1">No se pudieron cargar los tipos.</p>
                )}
              </FormItem>
            )}
          />

          {/* Identificación */}
          <FormField
            control={form.control}
            name="identification"
            render={({ field }) => {
              const isCedula = cedulaTypeId != null && form.watch("identificationTypeId") === cedulaTypeId;
              return (
                <FormItem>
                  <FormLabel required>Identificación</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={20}
                      placeholder="Cédula / DNI / Pasaporte"
                      onChange={(e) => {
                        const value = isCedula
                          ? e.target.value.replace(/\D/g, "").slice(0, 10)
                          : e.target.value.replace(/[^A-Za-z0-9]/g, "");
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Nombres */}
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Nombres</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={100} placeholder="Ej: María José" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Apellidos */}
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Apellidos</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={100} placeholder="Ej: Gómez Pérez" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Relación (RELATIONSHIP) */}
          <FormField
            control={form.control}
            name="relationshipTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Relación</FormLabel>
                <Select
                  disabled={
                    loadingRelationshipTypes ||
                    !!relationshipTypesError ||
                    saving
                  }
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-relationship">
                      <SelectValue
                        placeholder={
                          loadingRelationshipTypes
                            ? "Cargando relaciones..."
                            : "Seleccionar relación"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {relationshipTypes.map((t) => {
                      const id = getRefTypeId(t);
                      if (id == null) return null;
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {t.name ?? t.code ?? `Relación ${id}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
                {relationshipTypesError && (
                  <p className="text-xs text-destructive mt-1">
                    No se pudieron cargar las relaciones.
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Teléfono */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="Solo números"
                    // Hallazgo informe UTA-DITIC-PS-027-2026, observación 37: antes solo
                    // validaba al enviar (regex en Zod); esto filtra mientras se escribe.
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Móvil */}
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Móvil</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="Celular (opcional)"
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dirección */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={255}
                  placeholder="Dirección de residencia"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botones */}
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
            disabled={saving || loadingRelationshipTypes}
            data-testid="button-submit"
          >
            {saving
              ? "Guardando..."
              : emergencyContact
                ? "Actualizar"
                : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
