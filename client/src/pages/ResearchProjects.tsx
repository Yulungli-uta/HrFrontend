// src/pages/ResearchProjects.tsx
// Gestión de proyectos de investigación (rol R_PROYECTOS): listado paginado, registro/edición con
// sus resoluciones (PDF) y participantes, y eliminación.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilterX, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/ui/DataPagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ResearchProjectsAPI } from "@/lib/api";
import type { ResearchProjectListItem } from "@/lib/api";
import { getServerErrorMessage } from "@/lib/api/utils/error-handling";
import { formatDateOnly } from "@/lib/dateOnly";
import { ResearchProjectForm } from "@/components/research-projects/ResearchProjectForm";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function ResearchProjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<ResearchProjectListItem | null>(null);

  // Búsqueda con pausa para no consultar en cada tecla; la lista anterior se mantiene mientras llega la nueva
  // (así el campo no se desmonta y no se pierde el foco al escribir).
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchText]);

  // Rango inválido (desde posterior a hasta): se avisa y no se consulta.
  const invalidRange = !!from && !!to && from > to;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["research-projects", search, from, to, page, pageSize],
    queryFn: () => ResearchProjectsAPI.search({ search, from: from || undefined, to: to || undefined, page, pageSize }),
    placeholderData: (prev) => prev,
    enabled: !invalidRange,
  });

  const hasFilters = !!searchText || !!from || !!to;
  const clearFilters = () => {
    setSearchText("");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const paged = data?.status === "success" ? data.data : null;
  const items = paged?.items ?? [];

  const remove = useMutation({
    mutationFn: (id: number) => ResearchProjectsAPI.remove(id),
    onSuccess: (resp) => {
      if (resp.status === "success") {
        void queryClient.invalidateQueries({ queryKey: ["research-projects"] });
        void queryClient.invalidateQueries({ queryKey: ["research-participations"] });
        toast({ title: "Proyecto eliminado" });
      } else {
        toast({ title: "No se pudo eliminar", description: getServerErrorMessage(resp.error) ?? "Intente de nuevo más tarde.", variant: "destructive" });
      }
      setToDelete(null);
    },
    onError: () => {
      toast({ title: "No se pudo eliminar", description: "Intente de nuevo más tarde.", variant: "destructive" });
      setToDelete(null);
    },
  });

  const openNew = () => {
    setEditingId(null);
    setFormOpen(true);
  };
  const openEdit = (id: number) => {
    setEditingId(id);
    setFormOpen(true);
  };

  return (
    <div className="container mx-auto space-y-4 p-4 sm:p-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Proyectos de investigación</CardTitle>
            <CardDescription>Registro de proyectos con sus resoluciones y la participación de cada persona.</CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo proyecto
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-1">
              <Label htmlFor="rp-filter-search">Nombre del proyecto o resolución</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="rp-filter-search"
                  className="pl-9"
                  placeholder="Buscar…"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rp-filter-from">Período desde</Label>
              <Input
                id="rp-filter-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rp-filter-to">Período hasta</Label>
              <Input
                id="rp-filter-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button type="button" variant="outline" onClick={clearFilters} disabled={!hasFilters}>
              <FilterX className="mr-2 h-4 w-4" /> Limpiar
            </Button>
          </div>
          {invalidRange && <p className="text-sm text-destructive">La fecha «desde» no puede ser posterior a la fecha «hasta».</p>}
          <p className="text-xs text-muted-foreground">El rango de fechas muestra los proyectos cuyo período (inicio a fin) se cruza con él.</p>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError || data?.status === "error" ? (
            <p className="py-8 text-center text-sm text-destructive">No se pudieron cargar los proyectos.</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {hasFilters ? "Ningún proyecto coincide con los filtros." : "Aún no hay proyectos registrados."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Prórroga</TableHead>
                    <TableHead className="text-center">Participantes</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="min-w-[16rem] max-w-xl break-words">{p.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateOnly(p.startDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateOnly(p.endDate)}</TableCell>
                      <TableCell>{p.hasExtension ? <Badge>Sí</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                      <TableCell className="text-center">{p.participantsCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Editar proyecto" onClick={() => openEdit(p.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Eliminar proyecto" onClick={() => setToDelete(p)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {paged && paged.totalCount > 0 && (
            <DataPagination
              page={paged.page}
              totalPages={paged.totalPages}
              totalCount={paged.totalCount}
              pageSize={paged.pageSize}
              hasPreviousPage={paged.hasPreviousPage}
              hasNextPage={paged.hasNextPage}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </CardContent>
      </Card>

      <ResearchProjectForm open={formOpen} onOpenChange={setFormOpen} projectId={editingId} />

      <AlertDialog open={toDelete !== null} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el proyecto?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              Se eliminará «{toDelete?.name}» junto con sus participantes. Esta acción no se puede deshacer desde la pantalla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)} disabled={remove.isPending}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
