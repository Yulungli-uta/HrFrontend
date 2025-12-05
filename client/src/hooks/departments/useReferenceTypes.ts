import { useState, useEffect, useCallback } from "react";
import { TiposReferenciaAPI, handleApiError, type ApiResponse } from "@/lib/api";
import type { ReferenceType } from "@/types/department";

const DEPT_TYPE_CATEGORY = "DEPARTAMENT_TYPE";

export const useReferenceTypes = () => {
  const [refTypes, setRefTypes] = useState<ReferenceType[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res: ApiResponse<ReferenceType[]> = await TiposReferenciaAPI.byCategory(DEPT_TYPE_CATEGORY);
      if (res.status === "success") {
        const activeTypes = (res.data || [])
          .filter(t => t.isActive)
          .sort((a, b) => a.name.localeCompare(b.name));
        setRefTypes(activeTypes);
      }
    } catch {
      setRefTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  return { refTypes, loading, refetch: loadTypes };
};