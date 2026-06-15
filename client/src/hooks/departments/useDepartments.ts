import { useState, useEffect, useCallback } from "react";
import { DepartamentosAPI } from "@/lib/api";
import type { Department } from "@/types/department";
import { parseApiError } from "@/lib/error-handling";

/**
 * Hook que carga TODOS los departamentos con GET /departments (sin paginación server).
 *
 * ¿Por qué no usamos listPaged aquí?
 * La vista de árbol (jerarquía padre-hijo) necesita TODOS los registros en memoria
 * para que buildTree() pueda armar la jerarquía completa. Si cargamos solo 20 de 222,
 * los hijos cuyo padre está en otra página quedan huérfanos y el árbol se rompe.
 *
 * La paginación se aplica en la CAPA DE PRESENTACIÓN (Departments.tsx), sobre los
 * nodos raíz visibles después de filtrar — no en la capa de datos.
 *
 * Búsqueda: el campo de búsqueda se pasa a useDepartmentVisibility (cliente).
 * Si en el futuro se migra a búsqueda server-side, se puede cambiar aquí sin
 * afectar la lógica de paginación del árbol.
 */
export const useDepartments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await DepartamentosAPI.list();
      if (res.status === "success") {
        setDepartments(Array.isArray(res.data) ? (res.data as Department[]) : []);
      } else {
        setDepartments([]);
        setError("No se pudo cargar departamentos");
      }
    } catch (e: unknown) {
      setDepartments([]);
      setError(parseApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDepartments(); }, [loadDepartments]);

  return {
    departments,
    loading,
    error,
    refetch: loadDepartments,
  };
};
