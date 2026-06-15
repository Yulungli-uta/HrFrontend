import { Building2, Edit3, ChevronRight, ChevronDown, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
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
  /** Activa / desactiva el departamento sin abrir el modal */
  onToggleStatus: (department: Department) => void;
  getDepartmentTypeName: (type?: number | string | null) => string;
  getDepartmentScopeName: (scope?: number | null) => string;
}

export const DepartmentRow = ({
  node,
  depth = 0,
  expanded,
  visibleIds,
  search,
  onToggleExpand,
  onEdit,
  onToggleStatus,
  getDepartmentTypeName,
  getDepartmentScopeName,
}: DepartmentRowProps) => {
  const hasChildren     = (node.children?.length || 0) > 0;
  const isVisible       = visibleIds.has(node.departmentId);
  const childrenToRender = (node.children || []).filter(ch => visibleIds.has(ch.departmentId));
  const forcedOpen      = !!search.trim() && childrenToRender.length > 0;
  const isOpen          = forcedOpen || !!expanded[node.departmentId];

  if (!isVisible) return null;

  return (
    <>
      <TableRow className="hover:bg-muted/30">
        {/* Nombre con indentación jerárquica */}
        <TableCell className="py-3">
          <div style={{ marginLeft: depth * 18 }} className="flex items-center min-h-[44px]">
            {hasChildren ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onToggleExpand(node.departmentId)}
                className="h-8 w-8 p-0 mr-1 shrink-0"
                aria-label={isOpen ? "Contraer" : "Expandir"}
              >
                {isOpen
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <div className="w-9 shrink-0" />
            )}
            <Building2 className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">{node.name}</span>
          </div>
        </TableCell>

        {/* Código — oculto en mobile */}
        <TableCell className="hidden sm:table-cell py-3">
          <span className="text-sm text-muted-foreground">{node.code || "—"}</span>
        </TableCell>

        {/* Tipo / Ámbito — oculto hasta md */}
        <TableCell className="hidden md:table-cell py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{getDepartmentTypeName(node.departmentType) || "—"}</span>
            <span className="text-xs text-muted-foreground">
              {getDepartmentScopeName(node.departmentScope) || "Sin ámbito"}
            </span>
          </div>
        </TableCell>

        {/* Estado */}
        <TableCell className="py-3">
          <Badge
            variant={node.isActive ? "default" : "secondary"}
            className="text-xs whitespace-nowrap"
          >
            {node.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </TableCell>

        {/* Acciones */}
        <TableCell className="py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {/* Toggle de estado — activa/desactiva sin abrir modal */}
            <ActionIconButton
              icon={Power}
              label={node.isActive ? "Desactivar departamento" : "Activar departamento"}
              tone={node.isActive ? "destructive" : "success"}
              onClick={() => onToggleStatus(node)}
            />

            {/* Editar — abre modal completo */}
            <ActionIconButton
              icon={Edit3}
              label="Editar departamento"
              tone="primary"
              onClick={() => onEdit(node)}
            />
          </div>
        </TableCell>
      </TableRow>

      {/* Hijos recursivos */}
      {isOpen &&
        childrenToRender.map(child => (
          <DepartmentRow
            key={child.departmentId}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            visibleIds={visibleIds}
            search={search}
            onToggleExpand={onToggleExpand}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            getDepartmentTypeName={getDepartmentTypeName}
            getDepartmentScopeName={getDepartmentScopeName}
          />
        ))}
    </>
  );
};
