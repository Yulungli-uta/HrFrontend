import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepartmentRow } from "./DepartmentRow";
import type { Department } from "@/types/department";

interface DepartmentsTableProps {
  tree: (Department & { children: Department[] })[];
  expanded: Record<number, boolean>;
  visibleIds: Set<number>;
  search: string;
  loading: boolean;
  error?: string;
  onToggleExpand: (departmentId: number) => void;
  onEdit: (department: Department) => void;
  onRefetch: () => void;
  getDepartmentTypeName: (type?: number | string | null) => string;
}

export const DepartmentsTable = ({
  tree,
  expanded,
  visibleIds,
  search,
  loading,
  error,
  onToggleExpand,
  onEdit,
  onRefetch,
  getDepartmentTypeName
}: DepartmentsTableProps) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Cargando departamentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive font-medium mb-2">Error al cargar los departamentos</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Button onClick={onRefetch} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay departamentos registrados
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Nombre</TableHead>
            <TableHead className="hidden sm:table-cell">Código</TableHead>
            <TableHead className="hidden md:table-cell">Tipo</TableHead>
            <TableHead className="w-[100px]">Estado</TableHead>
            <TableHead className="w-[120px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tree.map((node) => (
            <DepartmentRow
              key={node.departmentId}
              node={node}
              expanded={expanded}
              visibleIds={visibleIds}
              search={search}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              getDepartmentTypeName={getDepartmentTypeName}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};