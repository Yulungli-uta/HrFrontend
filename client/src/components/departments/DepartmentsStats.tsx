import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Department, ReferenceType, ActiveFilter } from "@/types/department";

interface DepartmentsStatsProps {
  departments: Department[];
  refTypes: ReferenceType[];
  loadingTypes: boolean;
  onlyActive: ActiveFilter;
  search: string;
}

export function DepartmentsStats({
  departments,
  refTypes,
  loadingTypes,
  onlyActive,
  search
}: DepartmentsStatsProps) {
  // Calcular estadísticas
  const total = departments.length;
  const activeCount = departments.filter(d => d.isActive).length;

  // Conteo por tipo (solo aplicando filtros de estado y búsqueda, no de tipo)
  const countsByType = new Map<number, number>();
  
  departments.forEach(d => {
    // Aplicar filtros base (igual que en la página principal)
    if (onlyActive === "active" && !d.isActive) return;
    if (onlyActive === "inactive" && d.isActive) return;
    if (search) {
      const searchText = `${d.name || ""} ${d.code || ""} ${d.shortName || ""}`;
      if (!searchText.toLowerCase().includes(search.toLowerCase())) return;
    }

    // Determinar el typeId del departamento
    let typeId: number | undefined;
    if (typeof d.departmentType === "number") {
      typeId = d.departmentType;
    } else if (typeof d.departmentType === "string") {
      const found = refTypes.find(t => t.name === d.departmentType);
      if (found) typeId = found.typeId;
    }
    
    if (typeId != null) {
      countsByType.set(typeId, (countsByType.get(typeId) || 0) + 1);
    }
  });

  const getFilterDescription = () => {
    if (onlyActive === "all") return "Todos los estados";
    if (onlyActive === "active") return "Solo activos";
    return "Solo inactivos";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Tarjeta de totales */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardDescription className="text-sm font-medium">Total de Departamentos</CardDescription>
          <CardTitle className="text-2xl">{total}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600">
            {activeCount} activos / {total - activeCount} inactivos
          </div>
        </CardContent>
      </Card>

      {/* Tarjeta de filtro aplicado */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardDescription className="text-sm font-medium">Filtro Aplicado</CardDescription>
          <CardTitle className="text-lg font-semibold">
            {getFilterDescription()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600">
            {search ? `Con búsqueda: "${search}"` : "Sin búsqueda"}
          </div>
        </CardContent>
      </Card>

      {/* Tarjeta de conteo por tipo */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardDescription className="text-sm font-medium">Conteo por Tipo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {refTypes.length === 0 ? (
              <Badge variant="secondary" className="text-xs">
                {loadingTypes ? "Cargando tipos…" : "Sin tipos activos"}
              </Badge>
            ) : (
              refTypes.map(t => (
                <Badge 
                  key={t.typeId} 
                  variant="outline" 
                  className="text-xs mb-1"
                >
                  {t.name}: {countsByType.get(t.typeId) ?? 0}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}