// src/components/job-activities/OccupationalFamiliesPanel.tsx
import { useMemo, useState } from "react";
import { Layers, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/DataPagination";
import { RecordAvatar, RecordCard } from "@/components/ui/RecordCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { useClientInfiniteSlice } from "@/hooks/pagination/useClientInfiniteSlice";
import type { ActiveFilter } from "@/hooks/useCatalogPaged";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { CatalogFilterBar } from "./CatalogFilterBar";
import { CatalogStateRow } from "./CatalogStateRow";
import { clickableRow } from "./clickableRow";
import type { OccupationalFamily } from "./OccupationalFamilyForm";

interface Props {
  onNew: () => void;
  onEdit: (family: OccupationalFamily) => void;
}

/** Prefijo de nivel guardado en la metadata del tipo ({"levelPrefix":"Nivel "}); false si no hay o no se puede leer. */
export function readLevelWord(metadata?: string | null): boolean {
  if (!metadata) return false;
  try {
    const parsed = JSON.parse(metadata) as { levelPrefix?: unknown };
    return typeof parsed.levelPrefix === "string" && parsed.levelPrefix.trim() !== "";
  } catch {
    return false;
  }
}

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Grupos ocupacionales (Servidor Público, Autoridades Académicas…): alta, edición y estado. Son pocos y ya están en la caché
 * compartida de tipos de referencia, así que la búsqueda y la paginación se hacen en memoria; en móvil carga por scroll.
 */
export function OccupationalFamiliesPanel({ onNew, onEdit }: Props) {
  const families = useRefTypesByCategory(REF_TYPE_CATEGORIES.OCCUPATIONAL_GROUP_FAMILY);
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const items = useMemo<OccupationalFamily[]>(() => {
    const words = normalize(searchText).split(/\s+/).filter(Boolean);
    return families.data
      .filter((t): t is typeof t & { typeId: number } => typeof t.typeId === "number")
      .map((t) => ({
        typeId: t.typeId,
        name: t.name,
        description: t.description ?? "",
        isActive: t.isActive !== false,
        sortOrder: t.sortOrder ?? 0,
        levelWord: readLevelWord(t.metadata),
      }))
      .filter((f) => (activeFilter === "all" ? true : activeFilter === "active" ? f.isActive : !f.isActive))
      .filter((f) => words.every((w) => normalize(`${f.name} ${f.description}`).includes(w)))
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"));
  }, [families.data, searchText, activeFilter]);

  const isDesktop = useIsDesktop();
  const { visibleItems, infinite } = useClientInfiniteSlice(items, { page, setPage, pageSize });
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const showCards = !isDesktop && visibleItems.length > 0;
  const hasFilters = activeFilter !== "all" || searchText.trim() !== "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-info" />
            Grupos ocupacionales
          </span>
          <Button size="sm" onClick={onNew}>
            <Plus className="mr-1 h-4 w-4" />
            Nuevo
          </Button>
        </CardTitle>
        {/* <CardDescription>
          Categorías del personal (p. ej. Servidor Público, Autoridades Académicas). Cada escala pertenece a un grupo y a un grado.
        </CardDescription> */}
      </CardHeader>
      <CardContent className="space-y-3">
        <CatalogFilterBar
          searchText={searchText}
          onSearchText={(text) => {
            setSearchText(text);
            setPage(1);
          }}
          searchPlaceholder="Buscar grupo..."
          activeFilter={activeFilter}
          onActiveFilter={(value) => {
            setActiveFilter(value);
            setPage(1);
          }}
          hasFilters={hasFilters}
          onClear={() => {
            setSearchText("");
            setActiveFilter("all");
            setPage(1);
          }}
        />

        {showCards ? (
          <ul className="grid gap-3">
            {visibleItems.map((f) => (
              <li key={f.typeId} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <RecordCard
                  tone={f.isActive ? "success" : "muted"}
                  dimmed={!f.isActive}
                  leading={<RecordAvatar seed={String(f.typeId)} icon={Layers} />}
                  title={f.name}
                  subtitle={f.description || undefined}
                  badges={<StatusBadge tone={f.isActive ? "success" : "neutral"}>{f.isActive ? "Activo" : "Inactivo"}</StatusBadge>}
                  onClick={() => onEdit(f)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="w-[130px]">Niveles</TableHead>
                  <TableHead className="w-[100px] text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((f) => (
                  <TableRow key={f.typeId} {...clickableRow(() => onEdit(f))}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{f.name}</span>
                        {f.description && <span className="text-xs text-muted-foreground">{f.description}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{f.levelWord ? "Nivel N" : "Solo número"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={f.isActive ? "default" : "secondary"}
                        className={f.isActive ? "bg-success/15 text-success" : "bg-muted text-foreground"}
                      >
                        {f.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <CatalogStateRow
                  colSpan={3}
                  isLoading={families.isLoading}
                  isError={families.isError}
                  errorMessage="No se pudieron cargar los grupos."
                  isEmpty={items.length === 0}
                  emptyText={hasFilters ? "No hay grupos que coincidan con los filtros." : "No hay grupos registrados."}
                />
              </TableBody>
            </Table>
          </div>
        )}

        <DataPagination
          infinite={infinite}
          itemLabel="grupos"
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          totalCount={items.length}
          pageSize={pageSize}
          hasPreviousPage={page > 1}
          hasNextPage={page < totalPages}
          onPageChange={setPage}
          onPageSizeChange={() => undefined}
          pageSizeOptions={[pageSize]}
        />
      </CardContent>
    </Card>
  );
}
