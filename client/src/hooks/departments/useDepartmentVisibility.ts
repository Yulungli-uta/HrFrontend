// hooks/departments/useDepartmentVisibility.ts
import { useMemo } from "react";
import type { Department, ActiveFilter } from "@/types/department";

export function useDepartmentVisibility(
  departments: Department[],
  search: string,
  onlyActive: ActiveFilter,
  typeFilter: string,
  refTypes: Array<{ typeId: number; name: string }>
) {
  // Mapa de parentId para buscar ancestros
  const parentById = useMemo(() => {
    const map = new Map<number, number | null>();
    departments.forEach(d => map.set(d.departmentId, d.parentId));
    return map;
  }, [departments]);

  // Función para ver si un departamento cumple con los filtros base (estado y búsqueda)
  const matchesFilterBase = useMemo(() => {
    return (d: Department) => {
      if (onlyActive === "active" && !d.isActive) return false;
      if (onlyActive === "inactive" && d.isActive) return false;
      if (search) {
        const searchText = `${d.name || ""} ${d.code || ""} ${d.shortName || ""}`;
        if (!searchText.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    };
  }, [onlyActive, search]);

  // Función para ver si un departamento cumple con todos los filtros (incluyendo tipo)
  const matchesFilterAll = useMemo(() => {
    return (d: Department) => {
      if (!matchesFilterBase(d)) return false;
      if (typeFilter !== "all") {
        const wanted = Number(typeFilter);
        let dTypeId: number | undefined;
        if (typeof d.departmentType === "number") {
          dTypeId = d.departmentType;
        } else if (typeof d.departmentType === "string") {
          dTypeId = refTypes.find(t => t.name === d.departmentType)?.typeId;
        }
        if (dTypeId !== wanted) return false;
      }
      return true;
    };
  }, [matchesFilterBase, typeFilter, refTypes]);

  // IDs de departamentos que cumplen todos los filtros
  const matchIds = useMemo(() => {
    return departments.filter(matchesFilterAll).map(d => d.departmentId);
  }, [departments, matchesFilterAll]);

  // IDs visibles: matches + todos sus ancestros
  const visibleIds = useMemo(() => {
    const set = new Set<number>(matchIds);
    
    // Función para obtener todos los ancestros de un departamento
    const getAncestors = (id: number): number[] => {
      const ancestors: number[] = [];
      let currentId = parentById.get(id);
      while (currentId) {
        ancestors.push(currentId);
        currentId = parentById.get(currentId);
      }
      return ancestors;
    };

    // Agregar todos los ancestros de los matches
    matchIds.forEach(id => {
      const ancestors = getAncestors(id);
      ancestors.forEach(ancestorId => set.add(ancestorId));
    });

    return set;
  }, [matchIds, parentById]);

  return { visibleIds, matchIds };
}