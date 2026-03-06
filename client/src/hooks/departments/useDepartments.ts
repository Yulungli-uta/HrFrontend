import { useState, useEffect, useCallback } from "react";
import { DepartamentosAPI, handleApiError, type ApiResponse } from "@/lib/api";
import type { Department } from "@/types/department";
import { parseApiError } from '@/lib/error-handling';

export const useDepartments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res: ApiResponse<Department[]> = await DepartamentosAPI.list();
      if (res.status === "success") {
        setDepartments(Array.isArray(res.data) ? res.data : []);
      } else {
        setError(handleApiError(res.error, "No se pudo cargar departamentos"));
        setDepartments([]);
      }
    } catch (e: unknown) {
      setError(parseApiError(e).message);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  return { departments, loading, error, refetch: loadDepartments };
};