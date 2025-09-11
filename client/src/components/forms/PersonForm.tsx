import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { type Person } from "@shared/schema";
import { UserPlus, Save, X } from "lucide-react";
import { PersonasAPI, PaisesAPI, ProvinciasAPI, CantonesAPI, TiposReferenciaAPI } from "@/lib/api";
import { useEffect, useState } from "react";
import { z } from "zod";

interface PersonFormProps {
  person?: Person;
  onSuccess?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface RefType {
  typeId: number;
  name: string;
  category: string;
}

interface Country {
  countryId: string;
  countryName: string;
}

interface Province {
  provinceId: string;
  provinceName: string;
  countryId: string;
}

interface Canton {
  cantonId: string;
  cantonName: string;
  provinceId: string;
}

// Esquema actualizado para coincidir con la API
const personFormSchema = z.object({
  firstName: z.string().min(1, "Nombre es requerido"),
  lastName: z.string().min(1, "Apellido es requerido"),
  idCard: z.string().min(10, "Cédula debe tener al menos 10 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().min(1, "Campo telefono es requerida"),
  birthDate: z.string().min(1, "Campo Fecha de nacimiento es requerida"),
  // sex: z.enum(["M", "F"]),
  sex: z.string().min(1, "Campo sexo es requerida").transform(Number),
  gender: z.string().min(1, "Campo genero es requerida").transform(Number),
  disability: z.string().optional(),
  address: z.string().min(1, "Campo direccion es requerida"),
  isActive: z.boolean().default(true),
  maritalStatusTypeId: z.number().optional(),
  militaryCard: z.string().optional(),
  motherName: z.string().optional(),
  fatherName: z.string().optional(),
  countryId: z.string().min(1, "Campo Pais es requerida"),
  provinceId: z.string().min(1, "Campo provincia es requerida"),
  cantonId: z.string().min(1, "Campo canton es requerida"),
  yearsOfResidence: z.number().default(0),
  ethnicityTypeId: z.number().min(1, "Campo Etnia es requerida"),
  bloodTypeTypeId: z.number().min(1, "Campo Tipo de sangre es requerida"),
  specialNeedsTypeId: z.number().optional(),
  disabilityPercentage: z.number().min(0).max(100).optional(),
  conadisCard: z.string().optional()
});

type PersonFormData = z.infer<typeof personFormSchema>;

export default function PersonForm({ person, onSuccess, onCancel, isLoading }: PersonFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!person;
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  // Obtener tipos de referencia
  const { data: refTypes, isLoading: loadingRefTypes } = useQuery<RefType[]>({
    queryKey: ['refTypes'],
    queryFn: async () => {
      const response = await TiposReferenciaAPI.list();
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data || [];
    },
  });

  // Obtener países
  const { data: countries, isLoading: loadingCountries } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      const response = await PaisesAPI.list();
      // console.log('Paises response:', response);
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response.data || [];
    },
  });


  // Obtener provincias basado en el país seleccionado
  const { data: provinces, isLoading: loadingProvinces } = useQuery<Province[]>({
    queryKey: ['provinces', selectedCountry],
    queryFn: async () => {
      if (!selectedCountry) return [];      
      const response = await ProvinciasAPI.list();
      // console.log('Provincias response:', response);
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      
      return (response.data || []).filter((province: Province) => 
        province.countryId === selectedCountry
      );
    },
    enabled: !!selectedCountry,
  });

  // Obtener cantones basado en la provincia seleccionada
  const { data: cantons, isLoading: loadingCantons } = useQuery<Canton[]>({
    queryKey: ['cantons', selectedProvince],
    queryFn: async () => {
      if (!selectedProvince) return [];
      
      const response = await CantonesAPI.list();
      // console.log('Cantones response:', response);
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      
      return (response.data || []).filter((canton: Canton) => 
        canton.provinceId === selectedProvince
      );
    },
    enabled: !!selectedProvince,
  });

  // Filtrar tipos de referencia por categoría y asegurar que no haya valores undefined
  // console.log('refTypes:', refTypes);
  const maritalStatusOptions = (refTypes || []).filter(type => 
    type?.category === 'MARITAL_STATUS' && type.typeId !== undefined
  );
  const ethnicityOptions = (refTypes || []).filter(type => 
    type?.category === 'ETHNICITY' && type.typeId !== undefined
  );
  const bloodTypeOptions = (refTypes || []).filter(type => 
    type?.category === 'BLOOD_TYPE' && type.typeId !== undefined
  );
  const specialNeedsOptions = (refTypes || []).filter(type => 
    type?.category === 'SPECIAL_NEEDS' && type.typeId !== undefined
  );
  const genderOptions = (refTypes || []).filter(type => 
    type?.category === 'GENDER_TYPE' && type.typeId !== undefined
  );
  const sexOptions = (refTypes || []).filter(type => 
    type?.category === 'SEX_TYPE' && type.typeId !== undefined
  );

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      firstName: person?.firstName || "",
      lastName: person?.lastName || "",
      idCard: person?.idCard || "",
      email: person?.email || "",
      phone: person?.phone || "",
      birthDate: person?.birthDate || "",
      sex: person?.sex || "M",
      gender: person?.gender || "",
      disability: person?.disability || "",
      address: person?.address || "",
      isActive: person?.isActive ?? true,
      maritalStatusTypeId: person?.maritalStatusTypeId || undefined,
      militaryCard: person?.militaryCard || "",
      motherName: person?.motherName || "",
      fatherName: person?.fatherName || "",
      countryId: person?.countryId || undefined,
      provinceId: person?.provinceId || undefined,
      cantonId: person?.cantonId || undefined,
      yearsOfResidence: person?.yearsOfResidence || undefined,
      ethnicityTypeId: person?.ethnicityTypeId || undefined,
      bloodTypeTypeId: person?.bloodTypeTypeId || undefined,
      specialNeedsTypeId: person?.specialNeedsTypeId || undefined,
      disabilityPercentage: person?.disabilityPercentage || undefined,
      conadisCard: person?.conadisCard || ""
    }
  });

  // Efecto para establecer valores iniciales de país y provincia cuando se edita
  useEffect(() => {
    if (person) {
      if (person.countryId) {
        setSelectedCountry(person.countryId);
      }
      if (person.provinceId) {
        setSelectedProvince(person.provinceId);
      }
    }
  }, [person]);

  // Mutación corregida usando PersonasAPI
  const mutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      // Limpiar campos vacíos y convertir a null si es necesario
      const cleanData = {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        birthDate: data.birthDate || null,
        gender: data.gender || null,
        disability: data.disability || null,
        address: data.address || null,
        militaryCard: data.militaryCard || null,
        motherName: data.motherName || null,
        fatherName: data.fatherName || null,
        conadisCard: data.conadisCard || null,
        // Convertir 0 a null para IDs opcionales
        maritalStatusTypeId: data.maritalStatusTypeId || null,
        countryId: data.countryId || null,
        provinceId: data.provinceId || null,
        cantonId: data.cantonId || null,
        yearsOfResidence: data.yearsOfResidence || null,
        ethnicityTypeId: data.ethnicityTypeId || null,
        bloodTypeTypeId: data.bloodTypeTypeId || null,
        specialNeedsTypeId: data.specialNeedsTypeId || null,
        disabilityPercentage: data.disabilityPercentage || null,
      };
      console.log('Cleaned form data:', cleanData);
      // console.log('Is editing:', isEditing);
      // console.log('Person being edited:', person);
      if (isEditing && person?.personId) {
        console.log('Updating person ID:', person.personId, 'with data:', cleanData);
        const response = await PersonasAPI.update(person.personId, cleanData);
        if (response.status === 'error') {
          throw new Error(response.error.message || "Error al actualizar persona");
        }
        console.log('Updated person response data:', response.data);
        return response.data;
      } else {
        console.log('Creating new person with data:', cleanData);
        const response = await PersonasAPI.create(cleanData);
        if (response.status === 'error') {
          throw new Error(response.error.message || "Error al crear persona");
        }
        console.log('Created person response data:', response.data);
        return response.data;
      }
    },
    onSuccess: (savedPerson) => {
      console.log('Saved person:', savedPerson);
      // // Actualizar caché de personas
      // queryClient.setQueryData(['people'], (old: Person[] | undefined) => {
      //   if (!old) return [savedPerson];
        
      //   if (isEditing) {
      //     return old.map(p => p.personId === savedPerson.personId ? savedPerson : p);
      //   }
        
      //   return [...old, savedPerson];
      // });
      
      // // Mostrar mensaje de éxito
      // toast({
      //   title: isEditing ? "Persona actualizada" : "Persona creada",
      //   description: `${savedPerson.firstName} ${savedPerson.lastName} se ha ${isEditing ? 'actualizado' : 'registrado'} correctamente.`,
      // });
      //console.log('Saved person:', savedPerson);
      //********************************************************* */
      // Obtener datos actuales del caché
      // const currentPeople = queryClient.getQueryData<Person[]>(['people']) || [];
      
      // if (isEditing) {
      //   // Actualizar persona existente
      //   const updatedPeople = currentPeople.map(p => 
      //     p.personId === savedPerson.personId ? savedPerson : p
      //   );
      //   queryClient.setQueryData(['people'], updatedPeople);
      // } else {
      //   // Agregar nueva persona
      //   queryClient.setQueryData(['people'], [...currentPeople, savedPerson]);
      // }
      // Invalidar la query para forzar un refetch
      queryClient.invalidateQueries({ queryKey: ['people'] });
      // Mostrar mensaje de éxito
      toast({
        title: isEditing ? "Persona actualizada" : "Persona creada",
        description: `${savedPerson.firstName} ${savedPerson.lastName} se ha ${isEditing ? 'actualizado' : 'registrado'} correctamente.`,
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || (isEditing 
          ? "No se pudo actualizar la persona" 
          : "No se pudo crear la persona"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidar query para asegurar datos frescos
      queryClient.invalidateQueries({ queryKey: ["people"] });
    }
  });

  const onSubmit = (data: PersonFormData) => {
    //console.log('Submitting form data:', data);
    mutation.mutate(data);
  };

  const isProcessing = isLoading || mutation.isPending;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="h-5 w-5" />
          <span>{isEditing ? "Editar Persona" : "Agregar Nueva Persona"}</span>
        </CardTitle>
        <CardDescription>
          {isEditing ? "Modifique la información de la persona" : "Complete los datos de la nueva persona"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Información Personal Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido *</FormLabel>
                    <FormControl>
                      <Input placeholder="Apellido" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="idCard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula *</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl>
                      <Input placeholder="0999999999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Nacimiento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione sexo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sexOptions.map((option) => (
                          <SelectItem key={`sex-${option.typeId}`} value={String(option.typeId)}>
                            {option.name}
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
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Género *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || "gender-empty"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione género" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gender-empty">Sin especificar</SelectItem>
                        {genderOptions.map((option) => (
                          <SelectItem key={`gender-${option.typeId}`} value={String(option.typeId)}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Información Adicional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maritalStatusTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado Civil *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "maritalStatus-empty" ? undefined : parseInt(value))} 
                      value={field.value ? String(field.value) : "maritalStatus-empty"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione estado civil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="maritalStatus-empty">Sin especificar</SelectItem>
                        {maritalStatusOptions.map((option) => (
                          <SelectItem key={`marital-${option.typeId}`} value={String(option.typeId)}>
                            {option.name}
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
                name="militaryCard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libreta Militar</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de libreta militar" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Madre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre completo de la madre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Padre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre completo del padre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Ubicación Geográfica */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="countryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País *</FormLabel>
                    <Select 
                      onValueChange={(value) => {                       
                        const countryId = value === "country-empty" ? undefined : value;
                        field.onChange(countryId);
                        setSelectedCountry(countryId || null);
                        setSelectedProvince(null);
                        form.setValue('provinceId', undefined);
                        form.setValue('cantonId', undefined);
                      }} 
                      value={field.value ? String(field.value) : "country-empty"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el país" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="country-empty">Sin especificar</SelectItem>
                        {(countries || []).filter(c => c.countryId).map((country) => (
                          <SelectItem key={`country-${country.countryId}`} value={country.countryId}>
                            {country.countryName}
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
                name="provinceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provincia *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        const provinceId = value === "province-empty" ? undefined : value;
                        field.onChange(provinceId);
                        setSelectedProvince(provinceId || null);
                        form.setValue('cantonId', undefined);
                      }} 
                      value={field.value ? String(field.value) : "province-empty"}
                      disabled={!selectedCountry}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione la provincia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="province-empty">Sin especificar</SelectItem>
                        {(provinces || []).map((province) => (
                          <SelectItem key={`province-${province.provinceId}`} value={String(province.provinceId)}>
                            {province.provinceName}
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
                    <FormLabel>Cantón *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "canton-empty" ? undefined : value)} 
                      value={field.value ? String(field.value) : "canton-empty"}
                      disabled={!selectedProvince}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el cantón" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="canton-empty">Sin especificar</SelectItem>
                        {(cantons || []).filter(c => c.cantonId).map((canton) => (
                          <SelectItem key={`canton-${canton.cantonId}`} value={canton.cantonId}>
                            {canton.cantonName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dirección completa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="yearsOfResidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Años de Residencia</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Años" 
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Información Médica y Étnica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ethnicityTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etnia *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "ethnicity-empty" ? undefined : parseInt(value))} 
                      value={field.value ? String(field.value) : "ethnicity-empty"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione la etnia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ethnicity-empty">Sin especificar</SelectItem>
                        {ethnicityOptions.map((option) => (
                          <SelectItem key={`ethnicity-${option.typeId}`} value={String(option.typeId)}>
                            {option.name}
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
                name="bloodTypeTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Sangre *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "bloodType-empty" ? undefined : parseInt(value))} 
                      value={field.value ? String(field.value) : "bloodType-empty"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo de sangre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bloodType-empty">Sin especificar</SelectItem>
                        {bloodTypeOptions.map((option) => (
                          <SelectItem key={`blood-${option.typeId}`} value={String(option.typeId)}>
                            {option.name}
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
                name="specialNeedsTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Necesidades Especiales</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "specialNeeds-empty" ? undefined : parseInt(value))} 
                      value={field.value ? String(field.value) : "specialNeeds-empty"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione necesidades especiales" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="specialNeeds-empty">Sin especificar</SelectItem>
                        {specialNeedsOptions.map((option) => (
                          <SelectItem key={`needs-${option.typeId}`} value={String(option.typeId)}>
                            {option.name}
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
                name="disabilityPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porcentaje de Discapacidad</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0-100" 
                        min="0" 
                        max="100" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="disability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discapacidad</FormLabel>
                    <FormControl>
                      <Input placeholder="Descripción de la discapacidad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conadisCard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carnet CONADIS</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de carnet CONADIS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estado Activo */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Activo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Determina si la persona está activa en el sistema
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Botones de Acción */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isProcessing}>
                <Save className="h-4 w-4 mr-2" />
                {isProcessing 
                  ? "Guardando..." 
                  : isEditing 
                    ? "Actualizar" 
                    : "Crear"
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}