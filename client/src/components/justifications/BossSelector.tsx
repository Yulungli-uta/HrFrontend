import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import type { Employee } from "@/types/justifications";

interface Props {
  employees?: Employee[];
  isLoading: boolean;
  query: string;
  onQuery: (v: string) => void;
  selected: Employee | null;
  onSelect: (e: Employee | null) => void;
}

export default function BossSelector({ employees, isLoading, query, onQuery, selected, onSelect }: Props) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!employees) return [];
    if (!q) return employees.slice(0, 50);
    return employees.filter(e =>
      `${e.firstName ?? ""} ${e.lastName ?? ""} ${e.department ?? ""}`
        .toLowerCase()
        .includes(q)
    ).slice(0, 50);
  }, [employees, query]);

  return (
    <div className="space-y-2">
      <Label>Seleccionar Jefe Inmediato *</Label>
      <div className="border rounded-md p-3">
        {selected ? (
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <div>
              <p className="font-medium">{selected.firstName} {selected.lastName}</p>
              <p className="text-sm text-gray-600">{selected.department}</p>
              <p className="text-xs text-gray-500">ID: {selected.employeeId}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
              Cambiar
            </Button>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por nombre o departamento..."
                className="pl-8"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="max-h-60">
              {isLoading ? (
                <p className="text-center py-4">Cargando empleados...</p>
              ) : filtered.length > 0 ? (
                filtered.map((employee) => (
                  <div
                    key={employee.employeeId}
                    className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => onSelect(employee)}
                  >
                    <div>
                      <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                      <p className="text-sm text-gray-600">{employee.department}</p>
                      <p className="text-xs text-gray-500">ID: {employee.employeeId}</p>
                    </div>
                    <Button variant="ghost" size="sm">Seleccionar</Button>
                  </div>
                ))
              ) : (
                <p className="text-center py-4">No se encontraron empleados</p>
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}
