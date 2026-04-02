// client/src/hooks/personDetails/usePersonData.ts
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  PersonasAPI, 
  PublicacionesAPI, 
  CargasFamiliaresAPI, 
  ExperienciasLaboralesAPI, 
  CapacitacionesAPI, 
  LibrosAPI, 
  ContactosEmergenciaAPI,
  type ApiResponse 
} from "@/lib/api";
import { 
  Person, 
  Publication, 
  FamilyMember, 
  WorkExperience, 
  Training, 
  Book, 
  EmergencyContact,
  normalizePerson,
  normalizePublication 
} from "@/types/person";

// Helper para manejar respuestas de API
function ensureSuccess<T>(res: ApiResponse<T>, defaultMessage: string): T {
  //console\.log("[ensureSuccess] RAW response", res);

  if (res.status === "error") {
    console.error("[ensureSuccess] API ERROR", res);
    throw new Error(res.error?.message || defaultMessage);
  }
  return res.data;
}

// Función para transformar datos del formulario al formato del backend
function transformWorkExperienceFormData(formData: any, personId: number, isUpdate: boolean = false) {
  const transformed = {
    workExpId: isUpdate ? (formData.workExperienceId || 0) : 0,
    personId: personId,
    countryId: formData.countryId,
    company: formData.company,
    institutionTypeId: formData.institutionTypeId,
    entryReason: formData.entryReason,
    exitReason: formData.exitReason || "",
    position: formData.position,
    institutionAddress: formData.institutionAddress || "",
    startDate: formData.startDate,
    endDate: formData.isCurrent ? "" : (formData.endDate || ""),
    experienceTypeId: formData.experienceTypeId,
    isCurrent: formData.isCurrent,
    // createdAt no se envía - el backend lo genera automáticamente
  };
  
  //console\.log("[transformWorkExperienceFormData] Datos transformados para backend:", transformed);
  return transformed;
}

export function usePersonData(personId: number) {
  const queryClient = useQueryClient();

  //console\.log("[usePersonData] INIT", { personId });

  // Consulta principal de persona
  const {
    data: personResponse,
    isLoading: isLoadingPerson,
    error: personError
  } = useQuery<ApiResponse<Person>>({
    queryKey: ['person', String(personId)],
    queryFn: () => {
      //console\.log("[usePersonData] fetching person", { personId });
      return PersonasAPI.get(personId);
    },
    enabled: !!personId && personId > 0,
    select: (response) => {
      //console\.log("[usePersonData] person RAW response", response);

      if (response.status === 'success') {
        const normalized = {
          ...response,
          data: normalizePerson(response.data)
        };
        //console\.log("[usePersonData] person NORMALIZED", normalized);
        return normalized;
      }

      console.error("[usePersonData] person ERROR status", response);
      return response;
    },
  });

  // Consultas paralelas para datos relacionados usando los nuevos endpoints por personId
  const relatedQueries = useQueries({
    queries: [
      {
        queryKey: ['publications', String(personId)],
        queryFn: () => {
          //console\.log("[usePersonData] fetching publications", { personId });
          return PublicacionesAPI.getByPersonId(personId);
        },
        enabled: !!personId,
        select: (response: ApiResponse<Publication[]>) => {
          //console\.log("[usePersonData] publications RAW response", { personId, response });

          if (response.status === 'success') {
            const data = (response.data || []).map(normalizePublication);
            const normalized = { ...response, data };
            //console\.log("[usePersonData] publications NORMALIZED", {
            //   personId,
            //   count: data.length,
            //   data,
            // });
            return normalized;
          }

          console.error("[usePersonData] publications ERROR status", { personId, response });
          return response;
        },
      },
      {
        queryKey: ['familyMembers', String(personId)],
        queryFn: () => {
          //console\.log("[usePersonData] fetching familyMembers", { personId });
          return CargasFamiliaresAPI.getByPersonId(personId);
        },
        enabled: !!personId,
        select: (response: ApiResponse<FamilyMember[]>) => {
          //console\.log("[usePersonData] familyMembers RAW response", { personId, response });

          if (response.status === 'success') {
            const data = response.data || [];
            //console\.log("[usePersonData] familyMembers NORMALIZED", {
            //   personId,
            //   count: data.length,
            // });
            return { ...response, data };
          }

          console.error("[usePersonData] familyMembers ERROR status", { personId, response });
          return response;
        },
      },
      {
        queryKey: ['workExperiences', String(personId)],
        queryFn: () => {
          //console\.log("[usePersonData] fetching workExperiences", { personId });
          return ExperienciasLaboralesAPI.getByPersonId(personId);
        },
        enabled: !!personId,
        select: (response: ApiResponse<WorkExperience[]>) => {
          //console\.log("[usePersonData] workExperiences RAW response", { personId, response });

          if (response.status === 'success') {
            const data = response.data || [];
            //console\.log("[usePersonData] workExperiences NORMALIZED", {
            //   personId,
            //   count: data.length,
            // });
            return { ...response, data };
          }

          console.error("[usePersonData] workExperiences ERROR status", { personId, response });
          return response;
        },
      },
      {
        queryKey: ['trainings', String(personId)],
        queryFn: () => {
          //console\.log("[usePersonData] fetching trainings", { personId });
          return CapacitacionesAPI.getByPersonId(personId);
        },
        enabled: !!personId,
        select: (response: ApiResponse<Training[]>) => {
          //console\.log("[usePersonData] trainings RAW response", { personId, response });

          if (response.status === 'success') {
            const data = response.data || [];
            //console\.log("[usePersonData] trainings NORMALIZED", {
            //   personId,
            //   count: data.length,
            // });
            return { ...response, data };
          }

          console.error("[usePersonData] trainings ERROR status", { personId, response });
          return response;
        },
      },
      {
        queryKey: ['books', String(personId)],
        queryFn: () => {
          //console\.log("[usePersonData] fetching books", { personId });
          return LibrosAPI.getByPersonId(personId);
        },
        enabled: !!personId,
        select: (response: ApiResponse<Book[]>) => {
          //console\.log("[usePersonData] books RAW response", { personId, response });

          if (response.status === 'success') {
            const data = response.data || [];
            //console\.log("[usePersonData] books NORMALIZED", {
            //   personId,
            //   count: data.length,
            // });
            return { ...response, data };
          }

          console.error("[usePersonData] books ERROR status", { personId, response });
          return response;
        },
      },
      {
        queryKey: ['emergencyContacts', String(personId)],
        queryFn: () => {
          //console\.log("[usePersonData] fetching emergencyContacts", { personId });
          return ContactosEmergenciaAPI.getByPersonId(personId);
        },
        enabled: !!personId,
        select: (response: ApiResponse<EmergencyContact[]>) => {
          //console\.log("[usePersonData] emergencyContacts RAW response", { personId, response });

          if (response.status === 'success') {
            const data = response.data || [];
            //console\.log("[usePersonData] emergencyContacts NORMALIZED", {
            //   personId,
            //   count: data.length,
            // });
            return { ...response, data };
          }

          console.error("[usePersonData] emergencyContacts ERROR status", { personId, response });
          return response;
        },
      },
    ],
  });

  const isLoading = isLoadingPerson || relatedQueries.some(q => q.isLoading);
  const hasError = personError || relatedQueries.some(q => q.error);

  // Datos normalizados
  const person = (personResponse as any)?.status === 'success' ? (personResponse as any).data : undefined;

  const labels = [
    "publications",
    "familyMembers",
    "workExperiences",
    "trainings",
    "books",
    "emergencyContacts",
  ] as const;
  
  const [
    publications, 
    familyMembers, 
    workExperiences, 
    trainings, 
    books, 
    emergencyContacts
  ] = relatedQueries.map((q, index) => {
    const label = labels[index];
    const raw: any = q.data;
    const data = raw?.status === 'success' ? raw.data : [];

    //console\.log(`[usePersonData] normalized array ${label}`, {
    //   personId,
    //   label,
    //   status: raw?.status,
    //   isArray: Array.isArray(data),
    //   count: Array.isArray(data) ? data.length : "not-array",
    //   sample: Array.isArray(data) ? data.slice(0, 2) : data,
    // });

    return Array.isArray(data) ? data : [];
  });

  //console\.log("[usePersonData] FINAL MERGED DATA", {
  //   personId,
  //   hasPerson: !!person,
  //   counts: {
  //     publications: publications.length,
  //     familyMembers: familyMembers.length,
  //     workExperiences: workExperiences.length,
  //     trainings: trainings.length,
  //     books: books.length,
  //     emergencyContacts: emergencyContacts.length,
  //   },
  // });

  const refetchAll = () => {
    //console\.log("[usePersonData] refetchAll()", { personId });

    queryClient.invalidateQueries({ queryKey: ['person', String(personId)] });
    relatedQueries.forEach((q, index) => {
      // console.log("[usePersonData] refetch related query", {
      //   index,
      //   label: labels[index],
      // });
      q.refetch();
    });
  };

  return {
    person,
    isLoading,
    hasError,
    data: {
      publications,
      familyMembers,
      workExperiences,
      trainings,
      books,
      emergencyContacts,
    },
    refetch: refetchAll,
  };
}

export function usePersonMutations(personId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  //console\.log("[usePersonMutations] INIT", { personId });

  // Mutation base reusable
  const createMutation = (config: {
    queryKey: string[];
    apiCall: (data: any) => Promise<ApiResponse<any>>;
    successMessage: string;
    errorMessage: string;
    transformData?: (data: any) => any;
  }) => useMutation({
    mutationFn: async (data: any) => {
      const entity = config.queryKey[0];

      const transformedData = config.transformData 
        ? config.transformData(data) 
        : { ...data, personId: personId };
      
      //console\.log("[usePersonMutations] CREATE start", {
      //   entity,
      //   personId,
      //   inputData: data,
      //   payload: transformedData,
      // });

      const response = await config.apiCall(transformedData);

      //console\.log("[usePersonMutations] CREATE response", {
      //   entity,
      //   personId,
      //   response,
      // });

      return ensureSuccess(response, config.errorMessage);
    },
    onSuccess: () => {
      const entity = config.queryKey[0];

      //console\.log("[usePersonMutations] CREATE success", {
      //   entity,
      //   personId,
      // });

      queryClient.invalidateQueries({ queryKey: config.queryKey });
      toast({
        title: "✅ Éxito",
        description: config.successMessage,
      });
    },
    onError: (error: Error) => {
      const entity = config.queryKey[0];

      console.error("[usePersonMutations] CREATE error", {
        entity,
        personId,
        error,
      });

      toast({
        title: "❌ Error",
        description: `${config.errorMessage}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = (config: {
    queryKey: string[];
    apiCall: (id: number, data: any) => Promise<ApiResponse<any>>;
    successMessage: string;
    errorMessage: string;
    transformData?: (data: any) => any;
  }) => useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const entity = config.queryKey[0];

      const transformedData = config.transformData 
        ? config.transformData(data) 
        : { ...data, personId: personId };
      
      //console\.log("[usePersonMutations] UPDATE start", {
      //   entity,
      //   personId,
      //   id,
      //   inputData: data,
      //   payload: transformedData,
      // });

      const response = await config.apiCall(id, transformedData);

      //console\.log("[usePersonMutations] UPDATE response", {
      //   entity,
      //   personId,
      //   id,
      //   response,
      // });

      return ensureSuccess(response, config.errorMessage);
    },
    onSuccess: (_res, vars) => {
      const entity = config.queryKey[0];

      //console\.log("[usePersonMutations] UPDATE success", {
      //   entity,
      //   personId,
      //   id: (vars as any)?.id,
      // });

      queryClient.invalidateQueries({ queryKey: config.queryKey });
      toast({
        title: "✅ Éxito",
        description: config.successMessage,
      });
    },
    onError: (error: Error, vars) => {
      const entity = config.queryKey[0];

      console.error("[usePersonMutations] UPDATE error", {
        entity,
        personId,
        id: (vars as any)?.id,
        error,
      });

      toast({
        title: "❌ Error",
        description: `${config.errorMessage}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = (config: {
    queryKey: string[];
    apiCall: (id: number) => Promise<ApiResponse<any>>;
    successMessage: string;
    errorMessage: string;
  }) => useMutation({
    mutationFn: async (id: number) => {
      const entity = config.queryKey[0];

      //console\.log("[usePersonMutations] DELETE start", {
      //   entity,
      //   personId,
      //   id,
      // });

      const response = await config.apiCall(id);

      //console\.log("[usePersonMutations] DELETE response", {
      //   entity,
      //   personId,
      //   id,
      //   response,
      // });

      return ensureSuccess(response, config.errorMessage);
    },
    onSuccess: (_res, id) => {
      const entity = config.queryKey[0];

      //console\.log("[usePersonMutations] DELETE success", {
      //   entity,
      //   personId,
      //   id,
      // });

      queryClient.invalidateQueries({ queryKey: config.queryKey });
      toast({
        title: "✅ Éxito",
        description: config.successMessage,
      });
    },
    onError: (error: Error, id) => {
      const entity = config.queryKey[0];

      console.error("[usePersonMutations] DELETE error", {
        entity,
        personId,
        id,
        error,
      });

      toast({
        title: "❌ Error",
        description: `${config.errorMessage}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    publications: {
      create: createMutation({
        queryKey: ['publications', String(personId)],
        apiCall: PublicacionesAPI.create,
        successMessage: "La publicación se ha creado correctamente",
        errorMessage: "No se pudo crear la publicación"
      }),
      update: updateMutation({
        queryKey: ['publications', String(personId)],
        apiCall: PublicacionesAPI.update,
        successMessage: "La publicación se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar la publicación"
      }),
      delete: deleteMutation({
        queryKey: ['publications', String(personId)],
        apiCall: PublicacionesAPI.remove,
        successMessage: "La publicación se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar la publicación"
      }),
    },
    familyMembers: {
      create: createMutation({
        queryKey: ['familyMembers', String(personId)],
        apiCall: CargasFamiliaresAPI.create,
        successMessage: "La carga familiar se ha creado correctamente",
        errorMessage: "No se pudo crear la carga familiar"
      }),
      update: updateMutation({
        queryKey: ['familyMembers', String(personId)],
        apiCall: CargasFamiliaresAPI.update,
        successMessage: "La carga familiar se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar la carga familiar"
      }),
      delete: deleteMutation({
        queryKey: ['familyMembers', String(personId)],
        apiCall: CargasFamiliaresAPI.remove,
        successMessage: "La carga familiar se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar la carga familiar"
      }),
    },
    workExperiences: {
      create: createMutation({
        queryKey: ['workExperiences', String(personId)],
        apiCall: ExperienciasLaboralesAPI.create,
        successMessage: "La experiencia laboral se ha creado correctamente",
        errorMessage: "No se pudo crear la experiencia laboral",
        transformData: (data: any) => transformWorkExperienceFormData(data, personId, false)
      }),
      update: updateMutation({
        queryKey: ['workExperiences', String(personId)],
        apiCall: ExperienciasLaboralesAPI.update,
        successMessage: "La experiencia laboral se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar la experiencia laboral",
        transformData: (data: any) => transformWorkExperienceFormData(data, personId, true)
      }),
      delete: deleteMutation({
        queryKey: ['workExperiences', String(personId)],
        apiCall: ExperienciasLaboralesAPI.remove,
        successMessage: "La experiencia laboral se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar la experiencia laboral"
      }),
    },
    trainings: {
      create: createMutation({
        queryKey: ['trainings', String(personId)],
        apiCall: CapacitacionesAPI.create,
        successMessage: "La capacitación se ha creado correctamente",
        errorMessage: "No se pudo crear la capacitación"
      }),
      update: updateMutation({
        queryKey: ['trainings', String(personId)],
        apiCall: CapacitacionesAPI.update,
        successMessage: "La capacitación se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar la capacitación"
      }),
      delete: deleteMutation({
        queryKey: ['trainings', String(personId)],
        apiCall: CapacitacionesAPI.remove,
        successMessage: "La capacitación se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar la capacitación"
      }),
    },
    books: {
      create: createMutation({
        queryKey: ['books', String(personId)],
        apiCall: LibrosAPI.create,
        successMessage: "El libro se ha agregado correctamente",
        errorMessage: "No se pudo agregar el libro"
      }),
      update: updateMutation({
        queryKey: ['books', String(personId)],
        apiCall: LibrosAPI.update,
        successMessage: "El libro se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar el libro"
      }),
      delete: deleteMutation({
        queryKey: ['books', String(personId)],
        apiCall: LibrosAPI.remove,
        successMessage: "El libro se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar el libro"
      }),
    },
    emergencyContacts: {
      create: createMutation({
        queryKey: ['emergencyContacts', String(personId)],
        apiCall: ContactosEmergenciaAPI.create,
        successMessage: "El contacto de emergencia se ha agregado correctamente",
        errorMessage: "No se pudo agregar el contacto de emergencia"
      }),
      update: updateMutation({
        queryKey: ['emergencyContacts', String(personId)],
        apiCall: ContactosEmergenciaAPI.update,
        successMessage: "El contacto de emergencia se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar el contacto de emergencia"
      }),
      delete: deleteMutation({
        queryKey: ['emergencyContacts', String(personId)],
        apiCall: ContactosEmergenciaAPI.remove,
        successMessage: "El contacto de emergencia se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar el contacto de emergencia"
      }),
    },
  };
}
