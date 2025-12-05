// src/components/forms/PersonaForm.tsx

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonasAPI, ProvinciasAPI, CantonesAPI } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Persona, InsertPersona } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const personaSchema = z.object({
  identificacion: z.string().min(1, "La identificación es requerida"),
  nombres: z.string().min(1, "Los nombres son requeridos"),
  apellidos: z.string().min(1, "Los apellidos son requeridos"),
  emailInstitucional: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().optional(),

  // Ubicación (solo front / opcional; no rompemos el backend)
  countryId: z.string().optional(),
  provinceId: z.string().optional(),
  cantonId: z.string().optional(),

  // Discapacidad (control solo front)
  hasDisability: z.boolean().default(false),
  disabilityType: z.string().optional(),
  disabilityPercentage: z.string().optional(),
  conadisCard: z.string().optional(),
});

type PersonaFormData = z.infer<typeof personaSchema>;

interface PersonaFormProps {
  persona?: Persona;
  onSuccess?: () => void;
}

export default function PersonaForm({ persona, onSuccess }: PersonaFormProps) {
  const { toast } = useToast();
  const isEditing = !!persona;

  const createMutation = useMutation({
    mutationFn: PersonasAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      toast({
        title: "Persona creada",
        description: "La persona ha sido creada exitosamente.",
      });
      reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la persona.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertPersona> }) =>
      PersonasAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personas"] });
      if (persona) {
        queryClient.invalidateQueries({
          queryKey: ["/api/personas", persona.id],
        });
      }
      toast({
        title: "Persona actualizada",
        description: "La persona ha sido actualizada exitosamente.",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la persona.",
        variant: "destructive",
      });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PersonaFormData>({
    resolver: zodResolver(personaSchema),
    defaultValues: persona
      ? {
          identificacion: persona.identificacion,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          emailInstitucional: persona.emailInstitucional || "",
          telefono: persona.telefono || "",
          fechaNacimiento: persona.fechaNacimiento || "",
          countryId: (persona as any).countryId?.toString() || "",
          provinceId: (persona as any).provinceId?.toString() || "",
          cantonId: (persona as any).cantonId?.toString() || "",
          hasDisability: false, // control solo front
          disabilityType: "",
          disabilityPercentage: "",
          conadisCard: "",
        }
      : {
          identificacion: "",
          nombres: "",
          apellidos: "",
          emailInstitucional: "",
          telefono: "",
          fechaNacimiento: "",
          countryId: "",
          provinceId: "",
          cantonId: "",
          hasDisability: false,
          disabilityType: "",
          disabilityPercentage: "",
          conadisCard: "",
        },
  });

  const hasDisability = watch("hasDisability");
  const selectedCountryId = watch("countryId");
  const selectedProvinceId = watch("provinceId");

  // ===== Provincias: solo después de seleccionar país =====
  const {
    data: provincesResp,
    isLoading: isLoadingProvinces,
    isError: isErrorProvinces,
  } = useQuery({
    queryKey: ["provinces", selectedCountryId],
    queryFn: () => ProvinciasAPI.getByCountry(Number(selectedCountryId)),
    enabled: !!selectedCountryId, // 👈 NO consulta hasta que haya país
  });

  const provinces =
    provincesResp?.status === "success" && Array.isArray(provincesResp.data)
      ? provincesResp.data
      : [];

  // ===== Cantones: solo después de seleccionar provincia =====
  const {
    data: cantonsResp,
    isLoading: isLoadingCantons,
    isError: isErrorCantons,
  } = useQuery({
    queryKey: ["cantons", selectedProvinceId],
    queryFn: () => CantonesAPI.getByProvince(Number(selectedProvinceId)),
    enabled: !!selectedProvinceId, // 👈 NO consulta hasta que haya provincia
  });

  const cantons =
    cantonsResp?.status === "success" && Array.isArray(cantonsResp.data)
      ? cantonsResp.data
      : [];

  const onSubmit = (data: PersonaFormData) => {
    // Sacamos los campos solo-front para no romper el backend actual
    const {
      hasDisability,
      disabilityType,
      disabilityPercentage,
      conadisCard,
      countryId,
      provinceId,
      cantonId,
      ...rest
    } = data;

    const cleanData: InsertPersona | any = {
      ...rest,
      emailInstitucional: rest.emailInstitucional || undefined,
      telefono: rest.telefono || undefined,
      fechaNacimiento: rest.fechaNacimiento || undefined,
      // Si más adelante tu API acepta estos campos, aquí los puedes mapear:
      // countryId: countryId || undefined,
      // provinceId: provinceId || undefined,
      // cantonId: cantonId || undefined,
      // disabilityType: hasDisability ? disabilityType || undefined : undefined,
      // disabilityPercentage:
      //   hasDisability && disabilityPercentage
      //     ? Number(disabilityPercentage)
      //     : undefined,
      // conadisCard: hasDisability ? conadisCard || undefined : undefined,
    };

    if (isEditing && persona) {
      updateMutation.mutate({ id: persona.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* DATOS BÁSICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="identificacion">
            Identificación <span className="text-destructive">*</span>
          </Label>
          <Input
            id="identificacion"
            {...register("identificacion")}
            placeholder="1234567890"
            disabled={isEditing}
            data-testid="input-identificacion"
          />
          {errors.identificacion && (
            <p className="text-sm text-destructive mt-1">
              {errors.identificacion.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
          <Input
            id="fechaNacimiento"
            type="date"
            {...register("fechaNacimiento")}
            data-testid="input-fecha-nacimiento"
          />
          {errors.fechaNacimiento && (
            <p className="text-sm text-destructive mt-1">
              {errors.fechaNacimiento.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="nombres">
            Nombres <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nombres"
            {...register("nombres")}
            placeholder="Juan Carlos"
            data-testid="input-nombres"
          />
          {errors.nombres && (
            <p className="text-sm text-destructive mt-1">
              {errors.nombres.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="apellidos">
            Apellidos <span className="text-destructive">*</span>
          </Label>
          <Input
            id="apellidos"
            {...register("apellidos")}
            placeholder="Pérez González"
            data-testid="input-apellidos"
          />
          {errors.apellidos && (
            <p className="text-sm text-destructive mt-1">
              {errors.apellidos.message}
            </p>
          )}
        </div>
      </div>

      {/* CONTACTO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="emailInstitucional">Email Institucional</Label>
          <Input
            id="emailInstitucional"
            type="email"
            {...register("emailInstitucional")}
            placeholder="usuario@empresa.com"
            data-testid="input-email"
          />
          {errors.emailInstitucional && (
            <p className="text-sm text-destructive mt-1">
              {errors.emailInstitucional.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            {...register("telefono")}
            placeholder="+593 99 123 4567"
            data-testid="input-telefono"
          />
          {errors.telefono && (
            <p className="text-sm text-destructive mt-1">
              {errors.telefono.message}
            </p>
          )}
        </div>
      </div>

      {/* UBICACIÓN: País → Provincia → Cantón */}
      <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Ubicación geográfica
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* País */}
          <div>
            <Label>País</Label>
            <Controller
              name="countryId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    setValue("provinceId", "");
                    setValue("cantonId", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un país" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Si solo manejas Ecuador, puedes dejarlo fijo */}
                    <SelectItem value="1">Ecuador</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Provincia (deshabilitada hasta que haya país) */}
          <div>
            <Label>Provincia</Label>
            <Controller
              name="provinceId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    setValue("cantonId", "");
                  }}
                  disabled={
                    !selectedCountryId ||
                    isLoadingProvinces ||
                    isErrorProvinces
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !selectedCountryId
                          ? "Seleccione primero un país"
                          : isLoadingProvinces
                          ? "Cargando provincias..."
                          : "Seleccione una provincia"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((prov: any) => (
                      <SelectItem
                        key={prov.id || prov.provinceId}
                        value={String(prov.id ?? prov.provinceId)}
                      >
                        {prov.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Cantón (deshabilitado hasta que haya provincia) */}
          <div>
            <Label>Cantón</Label>
            <Controller
              name="cantonId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={
                    !selectedProvinceId ||
                    isLoadingCantons ||
                    isErrorCantons
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !selectedProvinceId
                          ? "Seleccione primero una provincia"
                          : isLoadingCantons
                          ? "Cargando cantones..."
                          : "Seleccione un cantón"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {cantons.map((cant: any) => (
                      <SelectItem
                        key={cant.id || cant.cantonId}
                        value={String(cant.id ?? cant.cantonId)}
                      >
                        {cant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      {/* DISCAPACIDAD (solo front) */}
      <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Información de discapacidad
          </h3>
          <Controller
            name="hasDisability"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasDisability"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                />
                <Label htmlFor="hasDisability" className="cursor-pointer">
                  Persona con discapacidad
                </Label>
              </div>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="disabilityType">Tipo de discapacidad</Label>
            <Input
              id="disabilityType"
              {...register("disabilityType")}
              placeholder="Auditiva, visual, motriz..."
              disabled={!hasDisability}
            />
          </div>
          <div>
            <Label htmlFor="disabilityPercentage">% discapacidad</Label>
            <Input
              id="disabilityPercentage"
              {...register("disabilityPercentage")}
              placeholder="Ej. 30"
              disabled={!hasDisability}
            />
          </div>
          <div>
            <Label htmlFor="conadisCard">Carné CONADIS</Label>
            <Input
              id="conadisCard"
              {...register("conadisCard")}
              placeholder="Número de carné"
              disabled={!hasDisability}
            />
          </div>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          data-testid="button-reset"
        >
          {isEditing ? "Cancelar" : "Limpiar"}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="button-submit-persona"
        >
          {isEditing ? "Guardar Cambios" : "Crear Persona"}
        </Button>
      </div>
    </form>
  );
}
