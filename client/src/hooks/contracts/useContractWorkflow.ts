import { useQuery } from "@tanstack/react-query";
import { ContractsRHAPI } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";

export const CONTRACT_STATUS_CATEGORY = REF_TYPE_CATEGORIES.CONTRACT_STATUS;

export function useContractWorkflow(params: { enabled: boolean; currentStatusTypeId?: number | null }) {
  const { enabled, currentStatusTypeId } = params;

  const qStatuses = useRefTypesByCategory(CONTRACT_STATUS_CATEGORY, { enabled });

  const statuses = qStatuses.data ?? [];

  const qAllowed = useQuery({
    queryKey: ["contracts", "allowed-next-statuses", currentStatusTypeId],
    queryFn: () => ContractsRHAPI.allowedNextStatuses(Number(currentStatusTypeId)),
    enabled: enabled && Number.isFinite(currentStatusTypeId) && (currentStatusTypeId ?? 0) > 0,
    staleTime: 30 * 1000,
  });

  const allowedNextIds: number[] =
    qAllowed.data?.status === 'success' ? (qAllowed.data.data ?? []) : [];

  const allowedNextStatuses = statuses.filter((s) => allowedNextIds.includes(s.typeID));

  return {
    qStatuses,
    statuses,
    qAllowed,
    allowedNextStatuses,
  };
}