// client/src/hooks/personDetails/usePersonMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  PublicacionesAPI,
  CargasFamiliaresAPI,
  ExperienciasLaboralesAPI,
  CapacitacionesAPI,
  LibrosAPI,
  ContactosEmergenciaAPI,
  type ApiResponse,
} from "@/lib/api";

// Helper para manejar respuestas de API
function ensureSuccess<T>(res: ApiResponse<T>, defaultMessage: string): T {
  console.log("[usePersonMutations] ensureSuccess RAW response", res);

  if (res.status === "error") {
    console.error("[usePersonMutations] API ERROR", res);
    throw new Error(res.error?.message || defaultMessage);
  }
  return res.data;
}

export function usePersonMutations(personId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  console.log("[usePersonMutations] INIT", { personId });

  // Mutation base reusable para create
  const createMutation = (config: {
    queryKey: string[];
    apiCall: (data: any) => Promise<ApiResponse<any>>;
    successMessage: string;
    errorMessage: string;
    transformData?: (data: any) => any;
  }) =>
    useMutation({
      mutationFn: async (data: any) => {
        const entity = config.queryKey[0];
        const transformedData = config.transformData
          ? config.transformData(data)
          : { ...data, personId };

        // console.log("[usePersonMutations] CREATE start", {
        //   entity,
        //   personId,
        //   inputData: data,
        //   payload: transformedData,
        // });

        const res = await config.apiCall(transformedData);

        // console.log("[usePersonMutations] CREATE response", {
        //   entity,
        //   personId,
        //   res,
        // });

        return ensureSuccess(res, config.errorMessage);
      },
      onSuccess: (result) => {
        const entity = config.queryKey[0];
        // console.log("[usePersonMutations] CREATE success", {
        //   entity,
        //   personId,
        //   result,
        // });

        queryClient.invalidateQueries({ queryKey: config.queryKey });

        toast({
          title: "✅ Éxito",
          description: config.successMessage,
        });
      },
      onError: (error: Error) => {
        const entity = config.queryKey[0];
        // console.error("[usePersonMutations] CREATE error", {
        //   entity,
        //   personId,
        //   error,
        // });
        toast({
          title: "❌ Error",
          description: error.message || config.errorMessage,
          variant: "destructive",
        });
      },
    });

  // Mutation base reusable para update
  const updateMutation = (config: {
    queryKey: string[];
    apiCall: (id: number, data: any) => Promise<ApiResponse<any>>;
    successMessage: string;
    errorMessage: string;
    transformData?: (data: any) => any;
  }) =>
    useMutation({
      mutationFn: async ({ id, data }: { id: number; data: any }) => {
        const entity = config.queryKey[0];
        const transformedData = config.transformData
          ? config.transformData(data)
          : { ...data, personId };

        // console.log("[usePersonMutations] UPDATE start", {
        //   entity,
        //   personId,
        //   id,
        //   inputData: data,
        //   payload: transformedData,
        // });

        const res = await config.apiCall(id, transformedData);

        // console.log("[usePersonMutations] UPDATE response", {
        //   entity,
        //   personId,
        //   id,
        //   res,
        // });

        return ensureSuccess(res, config.errorMessage);
      },
      onSuccess: (result, variables) => {
        const entity = config.queryKey[0];
        // console.log("[usePersonMutations] UPDATE success", {
        //   entity,
        //   personId,
        //   id: variables.id,
        //   result,
        // });

        queryClient.invalidateQueries({ queryKey: config.queryKey });

        toast({
          title: "✅ Éxito",
          description: config.successMessage,
        });
      },
      onError: (error: Error, variables) => {
        const entity = config.queryKey[0];
        // console.error("[usePersonMutations] UPDATE error", {
        //   entity,
        //   personId,
        //   id: variables?.id,
        //   error,
        // });

        toast({
          title: "❌ Error",
          description: error.message || config.errorMessage,
          variant: "destructive",
        });
      },
    });

  // Mutation base reusable para delete
  const deleteMutation = (config: {
    queryKey: string[];
    apiCall: (id: number) => Promise<ApiResponse<any>>;
    successMessage: string;
    errorMessage: string;
  }) =>
    useMutation({
      mutationFn: async (id: number) => {
        const entity = config.queryKey[0];
        // console.log("[usePersonMutations] DELETE start", {
        //   entity,
        //   personId,
        //   id,
        // });

        const res = await config.apiCall(id);

        // console.log("[usePersonMutations] DELETE response", {
        //   entity,
        //   personId,
        //   id,
        //   res,
        // });

        return ensureSuccess(res, config.errorMessage);
      },
      onSuccess: (result, id) => {
        const entity = config.queryKey[0];
        // console.log("[usePersonMutations] DELETE success", {
        //   entity,
        //   personId,
        //   id,
        //   result,
        // });

        queryClient.invalidateQueries({ queryKey: config.queryKey });

        toast({
          title: "✅ Éxito",
          description: config.successMessage,
        });
      },
      onError: (error: Error, id) => {
        const entity = config.queryKey[0];
        // console.error("[usePersonMutations] DELETE error", {
        //   entity,
        //   personId,
        //   id,
        //   error,
        // });

        toast({
          title: "❌ Error",
          description: error.message || config.errorMessage,
          variant: "destructive",
        });
      },
    });

  return {
    publications: {
      create: createMutation({
        queryKey: ["publications", String(personId)],
        apiCall: PublicacionesAPI.create,
        successMessage: "La publicación se ha creado correctamente",
        errorMessage: "No se pudo crear la publicación",
      }),
      update: updateMutation({
        queryKey: ["publications", String(personId)],
        apiCall: PublicacionesAPI.update,
        successMessage: "La publicación se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar la publicación",
      }),
      delete: deleteMutation({
        queryKey: ["publications", String(personId)],
        apiCall: PublicacionesAPI.remove,
        successMessage: "La publicación se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar la publicación",
      }),
    },
    familyMembers: {
      create: createMutation({
        queryKey: ["familyMembers", String(personId)],
        apiCall: CargasFamiliaresAPI.create,
        successMessage: "La carga familiar se ha creado correctamente",
        errorMessage: "No se pudo crear la carga familiar",
      }),
      update: updateMutation({
        queryKey: ["familyMembers", String(personId)],
        apiCall: CargasFamiliaresAPI.update,
        successMessage: "La carga familiar se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar la carga familiar",
      }),
      delete: deleteMutation({
        queryKey: ["familyMembers", String(personId)],
        apiCall: CargasFamiliaresAPI.remove,
        successMessage: "La carga familiar se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar la carga familiar",
      }),
    },
    workExperiences: {
      create: createMutation({
        queryKey: ["workExperiences", String(personId)],
        apiCall: ExperienciasLaboralesAPI.create,
        successMessage: "La experiencia laboral se ha creado correctamente",
        errorMessage: "No se pudo crear la experiencia laboral",
      }),
      update: updateMutation({
        queryKey: ["workExperiences", String(personId)],
        apiCall: ExperienciasLaboralesAPI.update,
        successMessage: "La experiencia laboral se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar la experiencia laboral",
      }),
      delete: deleteMutation({
        queryKey: ["workExperiences", String(personId)],
        apiCall: ExperienciasLaboralesAPI.remove,
        successMessage: "La experiencia laboral se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar la experiencia laboral",
      }),
    },
    trainings: {
      create: createMutation({
        queryKey: ["trainings", String(personId)],
        apiCall: CapacitacionesAPI.create,
        successMessage: "La capacitación se ha creado correctamente",
        errorMessage: "No se pudo crear la capacitación",
      }),
      update: updateMutation({
        queryKey: ["trainings", String(personId)],
        apiCall: CapacitacionesAPI.update,
        successMessage: "La capacitación se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar la capacitación",
      }),
      delete: deleteMutation({
        queryKey: ["trainings", String(personId)],
        apiCall: CapacitacionesAPI.remove,
        successMessage: "La capacitación se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar la capacitación",
      }),
    },
    books: {
      create: createMutation({
        queryKey: ["books", String(personId)],
        apiCall: LibrosAPI.create,
        successMessage: "El libro se ha creado correctamente",
        errorMessage: "No se pudo crear el libro",
      }),
      update: updateMutation({
        queryKey: ["books", String(personId)],
        apiCall: LibrosAPI.update,
        successMessage: "El libro se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar el libro",
      }),
      delete: deleteMutation({
        queryKey: ["books", String(personId)],
        apiCall: LibrosAPI.remove,
        successMessage: "El libro se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar el libro",
      }),
    },
    emergencyContacts: {
      create: createMutation({
        queryKey: ["emergencyContacts", String(personId)],
        apiCall: ContactosEmergenciaAPI.create,
        successMessage: "El contacto de emergencia se ha creado correctamente",
        errorMessage: "No se pudo crear el contacto de emergencia",
      }),
      update: updateMutation({
        queryKey: ["emergencyContacts", String(personId)],
        apiCall: ContactosEmergenciaAPI.update,
        successMessage: "El contacto de emergencia se ha actualizado correctamente",
        errorMessage: "No se pudo actualizar el contacto de emergencia",
      }),
      delete: deleteMutation({
        queryKey: ["emergencyContacts", String(personId)],
        apiCall: ContactosEmergenciaAPI.remove,
        successMessage: "El contacto de emergencia se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar el contacto de emergencia",
      }),
    },
  };
}
