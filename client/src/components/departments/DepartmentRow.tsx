import { Building2, Edit3, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import type { Department } from "@/types/department";

interface DepartmentRowProps {
  node: Department & { children?: Department[] };
  depth?: number;
  expanded: Record<number, boolean>;
  visibleIds: Set<number>;
  search: string;
  onToggleExpand: (departmentId: number) => void;
  onEdit: (department: Department) => void;
  getDepartmentTypeName: (type?: number | string | null) => string;
}

export const DepartmentRow = ({
  node,
  depth = 0,
  expanded,
  visibleIds,
  search,
  onToggleExpand,
  onEdit,
  getDepartmentTypeName
}: DepartmentRowProps) => {
  const hasChildren = (node.children?.length || 0) > 0;
  const isVisible = visibleIds.has(node.departmentId);
  const childrenToRender = (node.children || []).filter(ch => visibleIds.has(ch.departmentId));
  const forcedOpen = !!search.trim() && childrenToRender.length > 0;
  const isOpen = forcedOpen || !!expanded[node.departmentId];

  if (!isVisible) return null;

  return (
    <>
      <TableRow className="hover:bg-background">
        <TableCell className="py-3">
          <div style={{ marginLeft: depth * 18 }} className="flex items-center min-h-[44px]">
            {hasChildren && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onToggleExpand(node.departmentId)}
                className="h-8 w-8 p-0 mr-1"
                aria-label={isOpen ? "Contraer" : "Expandir"}
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            {!hasChildren && <div className="w-6 mr-1" />}
            <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="font-medium text-sm">{node.name}</span>
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell py-3">
          <span className="text-sm">{node.code || "-"}</span>
        </TableCell>
        <TableCell className="hidden md:table-cell py-3">
          <span className="text-sm">{getDepartmentTypeName(node.departmentType) || "-"}</span>
        </TableCell>
        <TableCell className="py-3">
          <Badge variant={node.isActive ? "default" : "secondary"} className="text-xs">
            {node.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </TableCell>
        <TableCell className="py-3 text-right">
          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            onClick={() => onEdit(node)}
            className="h-8"
          >
            <Edit3 className="h-3 w-3 mr-1" /> 
            <span className="hidden xs:inline">Editar</span>
          </Button>
        </TableCell>
      </TableRow>
      {isOpen && childrenToRender.map(child => (
        <DepartmentRow
          key={child.departmentId}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          visibleIds={visibleIds}
          search={search}
          onToggleExpand={onToggleExpand}
          onEdit={onEdit}
          getDepartmentTypeName={getDepartmentTypeName}
        />
      ))}
    </>
  );
};