import { useState, useEffect, useCallback } from "react";
import { TiposReferenciaAPI, type ApiResponse } from "@/lib/api";
import type { ReferenceType } from "@/types/department";

const DEPT_SCOPE_CATEGORY = "DEPARTMENT_SCOPE";

export const useReferenceScopeTypes = () => {
  const [scopeTypes, setScopeTypes] = useState<ReferenceType[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res: ApiResponse<ReferenceType[]> = await TiposReferenciaAPI.byCategory(DEPT_SCOPE_CATEGORY);
      if (res.status === "success") {
        const activeTypes = (res.data || [])
          .filter(t => t.isActive)
          .sort((a, b) => a.name.localeCompare(b.name));
        setScopeTypes(activeTypes);
      }
    } catch {
      setScopeTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  return { scopeTypes, loading, refetch: loadTypes };
};
