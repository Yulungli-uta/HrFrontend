import { useMemo } from "react";
import type { ReferenceType } from "@/types/department";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";

const DEPT_SCOPE_CATEGORY = REF_TYPE_CATEGORIES.DEPARTMENT_SCOPE;

export const useReferenceScopeTypes = () => {
  const { data, isLoading, refetch } = useRefTypesByCategory(DEPT_SCOPE_CATEGORY);

  const scopeTypes = useMemo(
    () =>
      (data as unknown as ReferenceType[])
        .filter((t) => t.isActive)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  return { scopeTypes, loading: isLoading, refetch };
};
