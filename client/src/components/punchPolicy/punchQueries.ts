import { useQuery } from "@tanstack/react-query";
import { PunchPolicyAPI } from "@/lib/api/services/punchPolicy";
import { unwrapApiResponse } from "@/lib/api/utils/error-handling";

export const PUNCH_SETTINGS_KEY = ["punchPolicy", "settings"] as const;
export const PUNCH_MY_ACCESS_KEY = ["punchPolicy", "myAccess"] as const;
export const PUNCH_NETWORKS_KEY = ["punchPolicy", "networks"] as const;
export const PUNCH_POLICIES_KEY = ["punchPolicy", "policies"] as const;
export const PUNCH_LOG_KEY = ["punchPolicy", "log"] as const;

export function usePunchSettings() {
  return useQuery({
    queryKey: PUNCH_SETTINGS_KEY,
    queryFn: async () => unwrapApiResponse(await PunchPolicyAPI.settings()),
    staleTime: 0,
  });
}

export function useMyPunchAccess() {
  return useQuery({
    queryKey: PUNCH_MY_ACCESS_KEY,
    queryFn: async () => unwrapApiResponse(await PunchPolicyAPI.myAccess()),
    staleTime: 0,
    retry: false,
  });
}

/** Cantidad de empleados con autorización de picada externa vigente hoy. */
export function useEffectivePolicyCount() {
  return useQuery({
    queryKey: [...PUNCH_POLICIES_KEY, "count"],
    queryFn: async () =>
      unwrapApiResponse(await PunchPolicyAPI.policies({ onlyEffective: true, page: 1, pageSize: 1 })).totalCount,
    staleTime: 0,
  });
}
