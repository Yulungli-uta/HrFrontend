import { useQuery } from "@tanstack/react-query";
import { ContractsRHAPI, TiposReferenciaAPI } from "@/lib/api";

export const CONTRACT_STATUS_CATEGORY = "CONTRACT_STATUS";

export function useContractWorkflow(params: { enabled: boolean; currentStatusTypeId?: number | null }) {
  const { enabled, currentStatusTypeId } = params;

  const qStatuses = useQuery({
    queryKey: ["reftypes", CONTRACT_STATUS_CATEGORY],
    queryFn: () => TiposReferenciaAPI.byCategory(CONTRACT_STATUS_CATEGORY),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const statuses = qStatuses.data?.status === "success" ? qStatuses.data.data : [];

  const qAllowed = useQuery({
    queryKey: ["contracts", "allowed-next-statuses", currentStatusTypeId],
    queryFn: () => ContractsRHAPI.allowedNextStatuses(Number(currentStatusTypeId)),
    enabled: enabled && Number.isFinite(currentStatusTypeId) && (currentStatusTypeId ?? 0) > 0,
    staleTime: 30 * 1000,
  });

  const allowedNextIds = qAllowed.data ?? [];

  const allowedNextStatuses = statuses.filter((s) => allowedNextIds.includes(s.typeID));

  return {
    qStatuses,
    statuses,
    qAllowed,
    allowedNextStatuses,
  };
}