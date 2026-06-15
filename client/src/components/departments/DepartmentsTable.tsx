import {
  Table, TableHead, TableHeader,
  TableRow, TableBody,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw, ChevronLeft, ChevronRight,
  Building2, Power,
  ChevronDown, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { DepartmentRow } from "./DepartmentRow";
import type { Department } from "@/types/department";

// ═══════════════════════════════════════════════════════════
// Props principales
// ═══════════════════════════════════════════════════════════
interface DepartmentsTableProps {
  paginatedRoots: (Department & { children: Department[] })[];
  expanded: Record<number, boolean>;
  visibleIds: Set<number>;
  search: string;
  loading: boolean;
  error?: string;
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onToggleExpand: (id: number) => void;
  onEdit: (department: Department) => void;
  onToggleStatus: (department: Department) => void;
  onRefetch: () => void;
  getDepartmentTypeName: (type?: number | string | null) => string;
  getDepartmentScopeName: (scope?: number | null) => string;
}

// ═══════════════════════════════════════════════════════════
// MobileCard — Card de un nodo en pantallas pequeñas
//
// Layout (3 filas):
//   Fila 1: [expand?]  [🏢]  NOMBRE COMPLETO (wrap)     [badge]
//   Fila 2:            Código · Tipo · Ámbito            [🔴 toggle]
//
// • Clic en la card (fuera de los botones) → onEdit (abre modal completo)
// • Botón Power → toggle estado (stopPropagation)
// • Botón expand → expandir/colapsar hijos (stopPropagation)
// ═══════════════════════════════════════════════════════════
interface MobileCardProps {
  node: Department & { children?: Department[] };
  depth?: number;
  expanded: Record<number, boolean>;
  visibleIds: Set<number>;
  search: string;
  onToggleExpand: (id: number) => void;
  onEdit: (d: Department) => void;
  onToggleStatus: (d: Department) => void;
  getDepartmentTypeName: (type?: number | string | null) => string;
  getDepartmentScopeName: (scope?: number | null) => string;
}

const MobileCard = ({
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
}: MobileCardProps) => {
  const hasChildren      = (node.children?.length ?? 0) > 0;
  const isVisible        = visibleIds.has(node.departmentId);
  const childrenToRender = (node.children ?? []).filter(ch => visibleIds.has(ch.departmentId));
  const forcedOpen       = !!search.trim() && childrenToRender.length > 0;
  const isOpen           = forcedOpen || !!expanded[node.departmentId];

  if (!isVisible) return null;

  const typeName  = getDepartmentTypeName(node.departmentType);
  const scopeName = getDepartmentScopeName(node.departmentScope);

  return (
    <div className={depth > 0 ? "ml-3 border-l-2 border-primary/20 pl-2" : ""}>

      {/* Card — clic abre modal de edición/detalle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEdit(node)}
        onKeyDown={(e) => e.key === "Enter" && onEdit(node)}
        className="rounded-lg border bg-card p-3 space-y-2 cursor-pointer
                   hover:border-primary/40 hover:bg-muted/20
                   active:bg-muted/40 transition-colors select-none"
      >
        {/* ── Fila 1: expand · ícono · NOMBRE · badge ──────── */}
        <div className="flex items-start gap-1.5">

          {/* Botón expand (stopPropagation para no abrir modal) */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleExpand(node.departmentId); }}
              className="mt-0.5 h-5 w-5 shrink-0 flex items-center justify-center
                         rounded hover:bg-muted"
              aria-label={isOpen ? "Contraer" : "Expandir"}
            >
              {isOpen
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          ) : (
            <div className="w-5 mt-0.5 shrink-0" />
          )}

          {/* Ícono building */}
          <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />

          {/* NOMBRE — ocupa todo el ancho restante y puede wrappear */}
          <p className="flex-1 font-semibold text-sm leading-snug break-words min-w-0">
            {node.name}
          </p>

          {/* Badge de estado */}
          <Badge
            variant={node.isActive ? "default" : "secondary"}
            className="text-xs px-1.5 h-5 shrink-0 mt-0.5 ml-1"
          >
            {node.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </div>

        {/* ── Fila 2: metadatos · botón toggle ─────────────── */}
        <div className="flex items-center justify-between gap-2 pl-7">

          {/* Código / Tipo / Ámbito */}
          <p className="text-xs text-muted-foreground truncate">
            {[
              node.code,
              typeName,
              scopeName,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>

          {/* Toggle estado (stopPropagation para no abrir modal) */}
          <ActionIconButton
            icon={Power}
            onClick={(e) => { e.stopPropagation(); onToggleStatus(node); }}
            label={node.isActive ? "Desactivar departamento" : "Activar departamento"}
            tone={node.isActive ? "destructive" : "success"}
            touch
          />
        </div>
      </div>

      {/* Hijos (sólo si está expandido) */}
      {isOpen && childrenToRender.length > 0 && (
        <div className="mt-1.5 space-y-1.5">
          {childrenToRender.map(child => (
            <MobileCard
              key={child.departmentId}
              node={child as Department & { children?: Department[] }}
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
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// PaginationControls
// ═══════════════════════════════════════════════════════════
interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
}

const PaginationControls = ({
  page, totalPages, totalCount, pageSize,
  hasNextPage, hasPreviousPage, onPageChange,
}: PaginationControlsProps) => {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-2">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Mostrando <span className="font-medium">{from}–{to}</span>{" "}
        de <span className="font-medium">{totalCount}</span> grupos raíz
      </p>
      <div className="flex items-center gap-2 order-1 sm:order-2">
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          className="h-8 px-3 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Anterior
        </Button>
        <span className="text-xs font-medium px-1 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="h-8 px-3 text-xs"
        >
          Siguiente
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// DepartmentsTable — componente principal exportado
// ═══════════════════════════════════════════════════════════
export const DepartmentsTable = ({
  paginatedRoots,
  expanded, visibleIds, search,
  loading, error,
  page, totalPages, totalCount, pageSize,
  hasNextPage, hasPreviousPage, onPageChange,
  onToggleExpand, onEdit, onToggleStatus, onRefetch,
  getDepartmentTypeName, getDepartmentScopeName,
}: DepartmentsTableProps) => {

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin mr-2 text-primary" />
        <span className="text-muted-foreground text-sm">Cargando departamentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive font-medium mb-1 text-sm">Error al cargar</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <Button onClick={onRefetch} variant="outline" size="sm">Reintentar</Button>
      </div>
    );
  }

  if (paginatedRoots.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        No hay departamentos que coincidan con los filtros
      </p>
    );
  }

  const sharedProps = {
    expanded, visibleIds, search,
    onToggleExpand, onEdit, onToggleStatus,
    getDepartmentTypeName, getDepartmentScopeName,
  };

  return (
    <div className="space-y-4">

      {/* ── MOBILE: cards ───────────────────────────────── */}
      <div className="flex flex-col gap-2 md:hidden">
        {paginatedRoots.map(node => (
          <MobileCard key={node.departmentId} node={node} {...sharedProps} />
        ))}
      </div>

      {/* ── DESKTOP: tabla ──────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-[220px]">Nombre</TableHead>
              <TableHead className="w-[110px]">Código</TableHead>
              <TableHead>Tipo / Ámbito</TableHead>
              <TableHead className="w-[90px]">Estado</TableHead>
              <TableHead className="w-[130px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRoots.map(node => (
              <DepartmentRow
                key={node.departmentId}
                node={node}
                {...sharedProps}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Paginación ──────────────────────────────────── */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPageChange={onPageChange}
      />
    </div>
  );
};
