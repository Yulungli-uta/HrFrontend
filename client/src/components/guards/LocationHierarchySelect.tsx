import { useGuardLocationsTree } from '@/hooks/guards/useGuards';
import type { GuardServiceLocationTreeDto } from '@/types/guards';

interface FlatLocationOption {
  locationId: number;
  level: number;
  label: string;
}

// Aplana el árbol de ubicaciones (raíz incluida) preservando el nivel de cada
// nodo, para poder indentarlo visualmente en un <select> nativo. El árbol ya
// viene filtrado por activo desde el backend (HR.tbl_GuardServiceLocations,
// GetTreeAsync) — a diferencia de /assignable, no filtra por IsAssignable, así
// que incluye nodos raíz/categoría.
function flattenLocationTree(nodes: GuardServiceLocationTreeDto[], acc: FlatLocationOption[] = []): FlatLocationOption[] {
  for (const n of nodes) {
    const indent = '    '.repeat(n.level);
    const marker = n.level > 0 ? '↳ ' : '';
    const codeSuffix = n.locationCode ? ` [${n.locationCode}]` : '';
    acc.push({ locationId: n.locationId, level: n.level, label: `${indent}${marker}${n.locationName}${codeSuffix} · Nivel ${n.level}` });
    if (n.children.length > 0) flattenLocationTree(n.children, acc);
  }
  return acc;
}

interface LocationHierarchySelectProps {
  value: number | '';
  onChange: (locationId: number | '') => void;
  className?: string;
  placeholder?: string;
}

/**
 * Selector jerárquico de ubicaciones de guardias: incluye nodos raíz y todos
 * los niveles activos, indentados por nivel (con etiqueta "Nivel N" explícita).
 * Usa el árbol completo (GET /guard-service-locations/tree, cacheado 2 min por
 * `useGuardLocationsTree`), no el endpoint /assignable — ese sigue usándose sin
 * cambios en las otras pantallas de Guardias que no necesitan ver la raíz.
 */
export function LocationHierarchySelect({ value, onChange, className, placeholder = 'Seleccionar ubicación…' }: LocationHierarchySelectProps) {
  const { data, isLoading } = useGuardLocationsTree();
  const roots = data?.status === 'success' ? data.data : [];
  const options = flattenLocationTree(roots);

  return (
    <select
      className={className ?? 'w-full h-9 border rounded-md px-3 text-sm bg-background mt-1'}
      value={value}
      disabled={isLoading}
      onChange={e => onChange(e.target.value !== '' ? Number(e.target.value) : '')}
    >
      <option value="">{isLoading ? 'Cargando ubicaciones…' : placeholder}</option>
      {options.map(o => (
        <option key={o.locationId} value={o.locationId}>{o.label}</option>
      ))}
    </select>
  );
}
