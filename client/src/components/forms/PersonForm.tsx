import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import type { Person, InsertPerson } from "@/shared/schema";
import { PaisesAPI, ProvinciasAPI, CantonesAPI } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";

// ---------------------- Tipos auxiliares ----------------------

interface RawRefType {
  id?: number;
  typeId?: number;
  name?: string;
  category?: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface RefOption {
  id: number;
  name: string;
}

interface Country {
  countryId: string;
  countryCode: string;
  countryName: string;
  createdAt?: string;
}

interface Province {
  provinceId: string;
  countryId: string;
  provinceCode: string;
  provinceName: string;
  createdAt?: string;
}

interface Canton {
  cantonId: string;
  provinceId: string;
  cantonCode: string;
  cantonName: string;
  createdAt?: string;
}

// ---------------------- Esquema de validación ----------------------

const personSchema = z.object({
  // Información básica
  firstName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      "El nombre solo puede contener letras y espacios"
    ),
  lastName: z
    .string()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(100, "El apellido no puede exceder 100 caracteres")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      "El apellido solo puede contener letras y espacios"
    ),
  identType: z.number().min(1, "El tipo de identificación es requerido"),
  idCard: z
    .string()
    .min(1, "La identificación es requerida")
    .max(20, "La identificación no puede exceder 20 caracteres"),
  email: z
    .string()
    .email("Email institucional inválido")
    .min(1, "El email es requerido")
    .max(150, "El email no puede exceder 150 caracteres"),
  phone: z
    .string()
    .max(30, "El teléfono no puede exceder 30 caracteres")
    .regex(/^[\d\s+\-()]*$/, "Formato de teléfono inválido")
    .optional()
    .or(z.literal("")),

  // Información personal
  birthDate: z.string().optional().or(z.literal("")),
  sex: z.number().optional(),
  gender: z.number().optional(),
  disability: z
    .string()
    .max(200, "La discapacidad no puede exceder 200 caracteres")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(255, "La dirección no puede exceder 255 caracteres")
    .optional()
    .or(z.literal("")),

  // Estado civil y familia
  maritalStatusTypeId: z.number().optional(),
  militaryCard: z
    .string()
    .max(50, "La cartilla militar no puede exceder 50 caracteres")
    .optional()
    .or(z.literal("")),
  motherName: z
    .string()
    .max(100, "El nombre no puede exceder 100 caracteres")
    .optional()
    .or(z.literal("")),
  fatherName: z
    .string()
    .max(100, "El nombre no puede exceder 100 caracteres")
    .optional()
    .or(z.literal("")),

  // Ubicación
  countryId: z.string().optional().or(z.literal("")),
  provinceId: z.string().optional().or(z.literal("")),
  cantonId: z.string().optional().or(z.literal("")),
  yearsOfResidence: z
    .number()
    .min(0, "Los años deben ser positivos")
    .max(100, "Máximo 100 años")
    .optional(),

  // Información étnica y de salud
  ethnicityTypeId: z.number().optional(),
  bloodTypeTypeId: z.number().optional(),
  specialNeedsTypeId: z.number().optional(),
  disabilityPercentage: z
    .number()
    .min(0, "El porcentaje no puede ser negativo")
    .max(100, "El porcentaje no puede ser mayor a 100")
    .optional(),
  conadisCard: z
    .string()
    .max(50, "El carnet no puede exceder 50 caracteres")
    .optional()
    .or(z.literal("")),

  // Solo para manejo de UI (no existe en la tabla)
  hasDisability: z.boolean().optional(),
});

type PersonFormData = z.infer<typeof personSchema>;

// ---------------------- Props ----------------------

interface PersonFormProps {
  person?: Person;
  onSubmit: (data: InsertPerson) => void;
  onCancel: () => void;
  isLoading?: boolean;
  refTypesByCategory: Record<string, RawRefType[]>;
  isRefTypesError?: boolean;
}

// ---------------------- Helpers ----------------------

const getSafeOptions = (
  refTypesByCategory: Record<string, RawRefType[]>,
  category: string
): RefOption[] => {
  if (!refTypesByCategory || typeof refTypesByCategory !== "object") {
    return [];
  }

  const list = refTypesByCategory[category] ?? [];

  return list
    .map((rt) => {
      const id =
        typeof rt.id === "number"
          ? rt.id
          : typeof rt.typeId === "number"
          ? rt.typeId
          : undefined;
      const name = typeof rt.name === "string" ? rt.name.trim() : "";

      if (!id || !name) return null;
      return { id, name };
    })
    .filter((x): x is RefOption => x !== null);
};

const SafeSelect = ({
  options,
  value,
  onValueChange,
  placeholder,
  id,
  disabled = false,
  required = false,
}: {
  options: RefOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  id: string;
  disabled?: boolean;
  required?: boolean;
}) => {
  const safeOptions = useMemo(
    () =>
      options.filter(
        (opt) =>
          opt &&
          typeof opt.id === "number" &&
          !isNaN(opt.id) &&
          typeof opt.name === "string" &&
          opt.name.trim() !== ""
      ),
    [options]
  );

  if (safeOptions.length === 0 && required) {
    return (
      <div>
        <Input
          value="Campo requerido - No hay opciones disponibles"
          disabled
          className="text-destructive border-destructive bg-destructive/10"
        />
        <p className="text-sm text-destructive mt-1">
          Este campo es requerido pero no hay opciones disponibles. Contacte al administrador.
        </p>
      </div>
    );
  }

  if (safeOptions.length === 0) {
    return (
      <div>
        <Input
          value="No hay opciones disponibles"
          disabled
          className="text-muted-foreground"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Este campo no está disponible actualmente
        </p>
      </div>
    );
  }

  return (
    <Select
      value={value ?? ""}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={required && !value ? "border-destructive" : ""}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {safeOptions.map((option) => (
          <SelectItem key={option.id} value={option.id.toString()}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// ---------------------- Componente principal ----------------------

export default function PersonForm({
  person,
  onSubmit,
  onCancel,
  isLoading = false,
  refTypesByCategory,
  isRefTypesError = false,
}: PersonFormProps) {
  const { toast } = useToast();
  const isEditing = !!person;
  const [activeTab, setActiveTab] = useState("basic");

  // Catálogos
  const identityTypes = useMemo(
    () => getSafeOptions(refTypesByCategory, "IDENTITY_TYPE"),
    [refTypesByCategory]
  );
  const sexTypes = useMemo(
    () => getSafeOptions(refTypesByCategory, "SEX_TYPE"),
    [refTypesByCategory]
  );
  const genderTypes = useMemo(
    () => getSafeOptions(refTypesByCategory, "GENDER_TYPE"),
    [refTypesByCategory]
  );
  const maritalStatusTypes = useMemo(
    () => getSafeOptions(refTypesByCategory, "MARITAL_STATUS"),
    [refTypesByCategory]
  );
  const bloodTypes = useMemo(
    () => getSafeOptions(refTypesByCategory, "BLOOD_TYPE"),
    [refTypesByCategory]
  );
  const ethnicityTypes = useMemo(
    () => getSafeOptions(refTypesByCategory, "ETHNICITY"),
    [refTypesByCategory]
  );
  const specialNeedsTypes = useMemo(
    () => getSafeOptions(refTypesByCategory, "SPECIAL_NEEDS"),
    [refTypesByCategory]
  );
  const disabilityTypes = useMemo(
    () => getSafeOptions(refTypesByCategory, "DISABILITY_TYPE"),
    [refTypesByCategory]
  );

  const cedulaType = useMemo(
    () =>
      identityTypes.find(
        (t) =>
          t.name.toUpperCase().includes("CÉDULA") ||
          t.name.toUpperCase().includes("CEDULA")
      ),
    [identityTypes]
  );

  const [selectedIdentType, setSelectedIdentType] = useState<number>(
    person?.identType || identityTypes[0]?.id || 0
  );

  // defaults de "tiene discapacidad"
  const initialHasDisability = Boolean(
    person?.disability ||
      (person?.disabilityPercentage && person.disabilityPercentage > 0) ||
      person?.conadisCard ||
      person?.specialNeedsTypeId
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    mode: "onChange",
    defaultValues: person
      ? {
          firstName: person.firstName,
          lastName: person.lastName,
          identType: person.identType,
          idCard: person.idCard,
          email: person.email,
          phone: person.phone || "",
          birthDate: person.birthDate
            ? new Date(person.birthDate).toISOString().split("T")[0]
            : "",
          sex: person.sex || undefined,
          gender: person.gender || undefined,
          disability: person.disability || "",
          address: person.address || "",
          maritalStatusTypeId: person.maritalStatusTypeId || undefined,
          militaryCard: person.militaryCard || "",
          motherName: person.motherName || "",
          fatherName: person.fatherName || "",
          countryId: person.countryId || "",
          provinceId: person.provinceId || "",
          cantonId: person.cantonId || "",
          yearsOfResidence: person.yearsOfResidence || undefined,
          ethnicityTypeId: person.ethnicityTypeId || undefined,
          bloodTypeTypeId: person.bloodTypeTypeId || undefined,
          specialNeedsTypeId: person.specialNeedsTypeId || undefined,
          disabilityPercentage: person.disabilityPercentage || undefined,
          conadisCard: person.conadisCard || "",
          hasDisability: initialHasDisability,
        }
      : {
          firstName: "",
          lastName: "",
          identType: identityTypes[0]?.id || 0,
          idCard: "",
          email: "",
          phone: "",
          birthDate: "",
          sex: undefined,
          gender: undefined,
          disability: "",
          address: "",
          maritalStatusTypeId: undefined,
          militaryCard: "",
          motherName: "",
          fatherName: "",
          countryId: "",
          provinceId: "",
          cantonId: "",
          yearsOfResidence: undefined,
          ethnicityTypeId: undefined,
          bloodTypeTypeId: undefined,
          specialNeedsTypeId: undefined,
          disabilityPercentage: undefined,
          conadisCard: "",
          hasDisability: false,
        },
  });

  const watchIdentType = watch("identType");
  const watchCountryId = watch("countryId");
  const watchProvinceId = watch("provinceId");
  const watchDisability = watch("disability");
  const watchSpecialNeedsId = watch("specialNeedsTypeId");
  const watchHasDisability = watch("hasDisability");

  useEffect(() => {
    if (!person && identityTypes.length > 0) {
      setValue("identType", identityTypes[0].id, { shouldValidate: true });
      setSelectedIdentType(identityTypes[0].id);
    }
  }, [identityTypes, person, setValue]);

  useEffect(() => {
    if (watchIdentType) {
      setSelectedIdentType(watchIdentType);
    }
  }, [watchIdentType]);

  // ---------------------- Geo: País / Provincia / Cantón ----------------------

  const { data: countriesResp } = useQuery<ApiResponse<Country[]>>({
    queryKey: ["countries"],
    queryFn: () => PaisesAPI.list(),
  });

  const { data: provincesResp } = useQuery<ApiResponse<Province[]>>({
    queryKey: ["provinces"],
    queryFn: () => ProvinciasAPI.list(),
  });

  const { data: cantonsResp } = useQuery<ApiResponse<Canton[]>>({
    queryKey: ["cantons"],
    queryFn: () => CantonesAPI.list(),
  });

  const countries = useMemo(
    () =>
      countriesResp?.status === "success" ? countriesResp.data || [] : [],
    [countriesResp]
  );
  const allProvinces = useMemo(
    () =>
      provincesResp?.status === "success" ? provincesResp.data || [] : [],
    [provincesResp]
  );
  const allCantons = useMemo(
    () =>
      cantonsResp?.status === "success" ? cantonsResp.data || [] : [],
    [cantonsResp]
  );

  const filteredProvinces = useMemo(
    () =>
      allProvinces.filter(
        (p) => !watchCountryId || p.countryId === watchCountryId
      ),
    [allProvinces, watchCountryId]
  );

  const filteredCantons = useMemo(
    () =>
      allCantons.filter(
        (c) => !watchProvinceId || c.provinceId === watchProvinceId
      ),
    [allCantons, watchProvinceId]
  );

  // Reset en cascada
  useEffect(() => {
    setValue("provinceId", "", { shouldValidate: true });
    setValue("cantonId", "", { shouldValidate: true });
  }, [watchCountryId, setValue]);

  useEffect(() => {
    setValue("cantonId", "", { shouldValidate: true });
  }, [watchProvinceId, setValue]);

  // ---------------------- Handlers ----------------------

  const handleIdentTypeChange = (value: string) => {
    const identType = parseInt(value, 10);
    setValue("identType", identType, { shouldValidate: true });
    setSelectedIdentType(identType);

    if (cedulaType && identType !== cedulaType.id) {
      setValue("idCard", "", { shouldValidate: true });
    }
  };

  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (cedulaType && selectedIdentType === cedulaType.id) {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setValue("idCard", value, { shouldValidate: true });
  };

  const handleToggleDisability = (checked: boolean) => {
    setValue("hasDisability", checked, {
      shouldValidate: false,
      shouldDirty: true,
    });

    if (!checked) {
      setValue("disability", "", { shouldValidate: true });
      setValue("disabilityPercentage", undefined, { shouldValidate: true });
      setValue("conadisCard", "", { shouldValidate: true });
      setValue("specialNeedsTypeId", undefined, { shouldValidate: true });
    }
  };

  // ---------------------- Submit ----------------------

  const onSubmitForm = (data: PersonFormData) => {
    try {
      const hasDisability = Boolean(data.hasDisability);

      const submitData: InsertPerson = {
        ...data,
        phone: data.phone || undefined,
        birthDate: data.birthDate || undefined,
        isActive: true,

        sex: data.sex || 0,
        gender: data.gender || 0,
        disability: hasDisability ? data.disability || undefined : undefined,
        address: data.address || undefined,
        maritalStatusTypeId: data.maritalStatusTypeId || 0,
        militaryCard: data.militaryCard || undefined,
        motherName: data.motherName || undefined,
        fatherName: data.fatherName || undefined,

        countryId: data.countryId || undefined,
        provinceId: data.provinceId || undefined,
        cantonId: data.cantonId || undefined,
        yearsOfResidence: data.yearsOfResidence || 0,

        ethnicityTypeId: data.ethnicityTypeId || 0,
        bloodTypeTypeId: data.bloodTypeTypeId || 0,
        specialNeedsTypeId: hasDisability
          ? data.specialNeedsTypeId ?? null
          : null,
        disabilityPercentage: hasDisability
          ? data.disabilityPercentage || 0
          : 0,
        conadisCard: hasDisability ? data.conadisCard || undefined : undefined,
      };

      // eliminar campo de UI antes de enviar (no existe en InsertPerson)
      // @ts-expect-error campo solo para UI
      delete submitData.hasDisability;

      onSubmit(submitData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar el formulario",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    reset();
    if (isEditing) {
      onCancel();
    }
  };

  const hasIdentityTypes = identityTypes.length > 0;

  // ---------------------- Render ----------------------

  return (
    <div className="space-y-6">
      {isRefTypesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los tipos de referencia. Algunos campos pueden no
            estar disponibles.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6 w-full">
          <TabsTrigger value="basic" className="text-xs sm:text-sm">
            Básico
          </TabsTrigger>
          <TabsTrigger value="personal" className="text-xs sm:text-sm">
            Personal
          </TabsTrigger>
          <TabsTrigger value="family" className="text-xs sm:text-sm">
            Familia
          </TabsTrigger>
          <TabsTrigger value="health" className="text-xs sm:text-sm">
            Salud
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
          {/* ============ BÁSICO ============ */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Información de Identificación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="identType">
                      Tipo de Identificación{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <SafeSelect
                      options={identityTypes}
                      value={watchIdentType?.toString() || ""}
                      onValueChange={handleIdentTypeChange}
                      placeholder="Seleccione el tipo de identificación"
                      id="identType"
                      required={true}
                    />
                    {errors.identType && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.identType.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="idCard">
                      Número de Identificación{" "}
                      <span className="text-destructive">*</span>
                      {cedulaType && selectedIdentType === cedulaType.id && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          10 dígitos
                        </Badge>
                      )}
                    </Label>
                    <Input
                      id="idCard"
                      {...register("idCard")}
                      onChange={handleIdCardChange}
                      placeholder={
                        cedulaType && selectedIdentType === cedulaType.id
                          ? "1234567890"
                          : "Número de identificación"
                      }
                      disabled={isEditing}
                      data-testid="input-idCard"
                      className={errors.idCard ? "border-destructive" : ""}
                    />
                    {errors.idCard && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.idCard.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">
                      Nombres <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      placeholder="Juan Carlos"
                      data-testid="input-firstName"
                      className={errors.firstName ? "border-destructive" : ""}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="lastName">
                      Apellidos <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      placeholder="Pérez González"
                      data-testid="input-lastName"
                      className={errors.lastName ? "border-destructive" : ""}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">
                      Email Institucional{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="usuario@universidad.edu.ec"
                      data-testid="input-email"
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      {...register("phone")}
                      placeholder="+593 99 123 4567"
                      data-testid="input-phone"
                      className={errors.phone ? "border-destructive" : ""}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ PERSONAL ============ */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información Personal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      {...register("birthDate")}
                      data-testid="input-birthDate"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sex">Sexo</Label>
                    <SafeSelect
                      options={sexTypes}
                      value={watch("sex")?.toString() || ""}
                      onValueChange={(value) =>
                        setValue("sex", parseInt(value, 10), {
                          shouldValidate: true,
                        })
                      }
                      placeholder="Seleccione el sexo"
                      id="sex"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gender">Género</Label>
                    <SafeSelect
                      options={genderTypes}
                      value={watch("gender")?.toString() || ""}
                      onValueChange={(value) =>
                        setValue("gender", parseInt(value, 10), {
                          shouldValidate: true,
                        })
                      }
                      placeholder="Seleccione el género"
                      id="gender"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maritalStatusTypeId">Estado Civil</Label>
                    <SafeSelect
                      options={maritalStatusTypes}
                      value={watch("maritalStatusTypeId")?.toString() || ""}
                      onValueChange={(value) =>
                        setValue(
                          "maritalStatusTypeId",
                          parseInt(value, 10),
                          { shouldValidate: true }
                        )
                      }
                      placeholder="Seleccione estado civil"
                      id="maritalStatusTypeId"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="address">Dirección</Label>
                    <Textarea
                      id="address"
                      {...register("address")}
                      placeholder="Dirección completa"
                      rows={3}
                    />
                  </div>
                </div>

                {/* País / Provincia / Cantón */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="countryId">País</Label>
                    {countries.length === 0 ? (
                      <Input
                        value="No hay países disponibles"
                        disabled
                        className="text-muted-foreground"
                      />
                    ) : (
                      <Select
                        value={watchCountryId || ""}
                        onValueChange={(value) =>
                          setValue("countryId", value, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger id="countryId">
                          <SelectValue placeholder="Seleccione país" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem
                              key={c.countryId}
                              value={c.countryId}
                            >
                              {c.countryName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="provinceId">Provincia</Label>
                    {filteredProvinces.length === 0 ? (
                      <Input
                        value={
                          watchCountryId
                            ? "No hay provincias para este país"
                            : "Seleccione un país primero"
                        }
                        disabled
                        className="text-muted-foreground"
                      />
                    ) : (
                      <Select
                        value={watchProvinceId || ""}
                        onValueChange={(value) =>
                          setValue("provinceId", value, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger id="provinceId">
                          <SelectValue placeholder="Seleccione provincia" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredProvinces.map((p) => (
                            <SelectItem
                              key={p.provinceId}
                              value={p.provinceId}
                            >
                              {p.provinceName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cantonId">Cantón</Label>
                    {filteredCantons.length === 0 ? (
                      <Input
                        value={
                          watchProvinceId
                            ? "No hay cantones para esta provincia"
                            : "Seleccione una provincia primero"
                        }
                        disabled
                        className="text-muted-foreground"
                      />
                    ) : (
                      <Select
                        value={watch("cantonId") || ""}
                        onValueChange={(value) =>
                          setValue("cantonId", value, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger id="cantonId">
                          <SelectValue placeholder="Seleccione cantón" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCantons.map((c) => (
                            <SelectItem
                              key={c.cantonId}
                              value={c.cantonId}
                            >
                              {c.cantonName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="yearsOfResidence">
                      Años de Residencia
                    </Label>
                    <Input
                      id="yearsOfResidence"
                      type="number"
                      {...register("yearsOfResidence", {
                        setValueAs: (v) =>
                          v === "" || v == null ? undefined : Number(v),
                      })}
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="militaryCard">Cartilla Militar</Label>
                    <Input
                      id="militaryCard"
                      {...register("militaryCard")}
                      placeholder="Número de cartilla militar"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ FAMILIA ============ */}
          <TabsContent value="family" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información Familiar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="motherName">Nombre de la Madre</Label>
                    <Input
                      id="motherName"
                      {...register("motherName")}
                      placeholder="Nombre completo de la madre"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fatherName">Nombre del Padre</Label>
                    <Input
                      id="fatherName"
                      {...register("fatherName")}
                      placeholder="Nombre completo del padre"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ethnicityTypeId">Etnia</Label>
                    <SafeSelect
                      options={ethnicityTypes}
                      value={watch("ethnicityTypeId")?.toString() || ""}
                      onValueChange={(value) =>
                        setValue("ethnicityTypeId", parseInt(value, 10), {
                          shouldValidate: true,
                        })
                      }
                      placeholder="Seleccione la etnia"
                      id="ethnicityTypeId"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SALUD ============ */}
          <TabsContent value="health" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de Salud</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Checkbox: tiene discapacidad */}
                <div className="flex items-center gap-2">
                  <input
                    id="has-disability"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!watchHasDisability}
                    onChange={(e) => handleToggleDisability(e.target.checked)}
                  />
                  <Label htmlFor="has-disability" className="text-sm">
                    Tiene discapacidad
                  </Label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bloodTypeTypeId">Tipo de Sangre</Label>
                    <SafeSelect
                      options={bloodTypes}
                      value={watch("bloodTypeTypeId")?.toString() || ""}
                      onValueChange={(value) =>
                        setValue("bloodTypeTypeId", parseInt(value, 10), {
                          shouldValidate: true,
                        })
                      }
                      placeholder="Seleccione tipo de sangre"
                      id="bloodTypeTypeId"
                    />
                  </div>

                  <div>
                    <Label htmlFor="disabilityPercentage">
                      Porcentaje de Discapacidad
                    </Label>
                    <Input
                      id="disabilityPercentage"
                      type="number"
                      {...register("disabilityPercentage", {
                        setValueAs: (v) =>
                          v === "" || v == null ? undefined : Number(v),
                      })}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={!watchHasDisability}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="disability">Tipo de Discapacidad</Label>
                    {disabilityTypes.length === 0 ? (
                      <Input
                        value="No hay tipos de discapacidad configurados"
                        disabled
                        className="text-muted-foreground"
                      />
                    ) : (
                      <Select
                        value={watchDisability || ""}
                        onValueChange={(value) =>
                          setValue("disability", value, {
                            shouldValidate: true,
                          })
                        }
                        disabled={!watchHasDisability}
                      >
                        <SelectTrigger id="disability">
                          <SelectValue placeholder="Seleccione tipo de discapacidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {disabilityTypes.map((opt) => (
                            <SelectItem key={opt.id} value={opt.name}>
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="conadisCard">Carnet CONADIS</Label>
                    <Input
                      id="conadisCard"
                      {...register("conadisCard")}
                      placeholder="Número de carnet CONADIS"
                      disabled={!watchHasDisability}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="specialNeedsTypeId">
                      Necesidades Especiales
                    </Label>
                    {specialNeedsTypes.length === 0 ? (
                      <Input
                        value="No hay necesidades especiales configuradas"
                        disabled
                        className="text-muted-foreground"
                      />
                    ) : (
                      <Select
                        value={
                          watchSpecialNeedsId
                            ? watchSpecialNeedsId.toString()
                            : "none"
                        }
                        onValueChange={(value) => {
                          if (value === "none") {
                            setValue("specialNeedsTypeId", undefined, {
                              shouldValidate: true,
                            });
                          } else {
                            setValue(
                              "specialNeedsTypeId",
                              parseInt(value, 10),
                              { shouldValidate: true }
                            );
                          }
                        }}
                        disabled={!watchHasDisability}
                      >
                        <SelectTrigger id="specialNeedsTypeId">
                          <SelectValue placeholder="Seleccione necesidades especiales" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ninguna</SelectItem>
                          {specialNeedsTypes.map((opt) => (
                            <SelectItem
                              key={opt.id}
                              value={opt.id.toString()}
                            >
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ BOTONES ============ */}
          <div className="flex flex-col-reverse sm:flex-row justify-between sm:justify-end space-y-3 sm:space-y-0 space-x-0 sm:space-x-3 pt-6 border-t">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setActiveTab(
                    activeTab === "basic"
                      ? "health"
                      : activeTab === "personal"
                      ? "basic"
                      : activeTab === "family"
                      ? "personal"
                      : "family"
                  )
                }
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setActiveTab(
                    activeTab === "basic"
                      ? "personal"
                      : activeTab === "personal"
                      ? "family"
                      : activeTab === "family"
                      ? "health"
                      : "health"
                  )
                }
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                Siguiente
              </Button>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                className="w-full sm:w-auto"
                data-testid="button-reset"
              >
                {isEditing ? "Cancelar" : "Limpiar"}
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading || isSubmitting || !isValid || !hasIdentityTypes
                }
                className="w-full sm:w-auto bg-uta-blue hover:bg-uta-blue/90"
                data-testid="button-submit-person"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : isEditing ? (
                  "Guardar Cambios"
                ) : (
                  "Crear Persona"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Tabs>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium mb-2">
            Información de validación:
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1 grid grid-cols-1 sm:grid-cols-2">
            <li>• Cédula: 10 dígitos exactos</li>
            <li>• Nombres y apellidos: Solo letras y espacios</li>
            <li>• Email: Formato institucional válido</li>
            <li>• Teléfono: Solo números y caracteres básicos</li>
            <li>
              • Campos marcados con{" "}
              <span className="text-destructive">*</span> son obligatorios
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
