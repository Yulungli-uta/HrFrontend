import { useMemo } from "react";
import type { ReferenceType } from "@/types/department";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";

const DEPT_TYPE_CATEGORY = REF_TYPE_CATEGORIES.DEPARTMENT_TYPE;

export const useReferenceTypes = () => {
  const { data, isLoading, refetch } = useRefTypesByCategory(DEPT_TYPE_CATEGORY);

  const refTypes = useMemo(
    () =>
      (data as unknown as ReferenceType[])
        .filter((t) => t.isActive)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  return { refTypes, loading: isLoading, refetch };
};