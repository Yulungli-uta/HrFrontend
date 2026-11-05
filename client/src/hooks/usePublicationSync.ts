import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PublicationSyncAPI,
  ResearcherProfileAPI,
  type ApiResponse,
  type PublicationSyncReadiness,
  type ResearcherProfileDto,
} from "@/lib/api";

/** `apiFetch` no lanza: devuelve `status: 'error'`. Se convierte en excepción para que React Query exponga `error`. */
export function unwrap<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (res.status === "error") throw new Error(res.error.message || defaultMessage);
  return res.data;
}

export const researcherProfileKey = (personId: number) => ["researcher-profile", personId] as const;
export const syncReadinessKey = (personId: number) => ["publication-sync", "readiness", personId] as const;

/** Perfil de investigador (ORCID e IDs por plataforma) de una persona. */
export function useResearcherProfile(personId: number | undefined, options?: { enabled?: boolean }) {
  return useQuery<ResearcherProfileDto>({
    queryKey: researcherProfileKey(personId ?? 0),
    queryFn: async () => unwrap(await ResearcherProfileAPI.get(personId!), "Error al cargar el perfil de investigador"),
    enabled: personId != null && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

/** Qué le falta a la persona para sincronizar cada proveedor. Siempre fresco: se consulta al abrir el diálogo. */
export function usePublicationSyncReadiness(personId: number | undefined, options?: { enabled?: boolean }) {
  return useQuery<PublicationSyncReadiness>({
    queryKey: syncReadinessKey(personId ?? 0),
    queryFn: async () => unwrap(await PublicationSyncAPI.readiness(personId!), "No se pudo verificar la configuración de la sincronización"),
    enabled: personId != null && (options?.enabled ?? true),
    staleTime: 0,
    gcTime: 0,
  });
}

/** Mutaciones del perfil: tras cada cambio se refrescan el perfil y la disponibilidad para sincronizar. */
export function useResearcherProfileMutations(personId: number) {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: researcherProfileKey(personId) }),
      queryClient.invalidateQueries({ queryKey: syncReadinessKey(personId) }),
    ]);
  };

  // Solo refresca cuando el ORCID quedó guardado: una petición de confirmación de nombre no cambia nada.
  const setOrcid = useMutation({
    mutationFn: async (vars: { orcid: string; acknowledgeNameMismatch?: boolean }) =>
      unwrap(await ResearcherProfileAPI.setOrcid(personId, vars.orcid, vars.acknowledgeNameMismatch ?? false), "No se pudo guardar el ORCID"),
    onSuccess: async (result) => {
      if (result.saved) await refresh();
    },
  });

  const addProviderId = useMutation({
    mutationFn: async (vars: { providerCode: string; externalId: string }) =>
      unwrap(await ResearcherProfileAPI.addProviderId(personId, vars.providerCode, vars.externalId), "No se pudo guardar el ID"),
    onSuccess: refresh,
  });

  const removeProviderId = useMutation({
    mutationFn: async (providerIdId: number) =>
      unwrap(await ResearcherProfileAPI.removeProviderId(personId, providerIdId), "No se pudo eliminar el ID"),
    onSuccess: refresh,
  });

  return { setOrcid, addProviderId, removeProviderId };
}
