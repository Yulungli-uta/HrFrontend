// src/pages/PublicationReview.tsx
// Revisión de publicaciones sincronizadas por la Dirección de Investigación (rol R_PROYECTOS):
// aprobar (congela el registro), rechazar o reabrir con observación. El backend exige PUBLICATIONS.APPROVE.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Eye, FilterX, RefreshCw, RotateCcw, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/ui/DataPagination";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { unwrap } from "@/hooks/usePublicationSync";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { DB_FIELD_LIMITS } from "@/features/dbFieldLimits";
import { PublicationReviewAPI } from "@/lib/api";
import type { PublicationApprovalStatus, PublicationReviewItem } from "@/lib/api";
import { formatDate } from "@/lib/clock";

const PAGE_SIZE_OPTIONS = [25, 50, 100];
type TabValue = "SIN_REVISION" | "APROBADA" | "RECHAZADA" | "ALL";
type NotesAction = "reject" | "reopen";

const STATUS_BADGE: Record<PublicationApprovalStatus, { label: string; className: string }> = {
  SIN_REVISION: { label: "En revisión", className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  APROBADA: { label: "Aprobada", className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  RECHAZADA: { label: "Rechazada", className: "border-muted-foreground/30 bg-muted text-muted-foreground" },
};

const shortDate = (v: string | null) =>
  v ? formatDate(v, "es-EC", { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function PublicationReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const providers = useRefTypesByCategory(REF_TYPE_CATEGORIES.SCIENTIFIC_PROVIDER);

  const [tab, setTab] = useState<TabValue>("SIN_REVISION");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [providerCode, setProviderCode] = useState("");
  const [year, setYear] = useState("");
  const [syncedFrom, setSyncedFrom] = useState("");
  const [syncedTo, setSyncedTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<PublicationReviewItem | null>(null);
  const [notesDialog, setNotesDialog] = useState<{ action: NotesAction; ids: number[] } | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchText]);

  const invalidRange = !!syncedFrom && !!syncedTo && syncedFrom > syncedTo;
  const yearNumber = /^\d{4}$/.test(year) ? Number(year) : null;
  const filter = useMemo(
    () => ({
      status: tab,
      syncedOnly: true,
      providerCode: providerCode || undefined,
      search: search || undefined,
      year: yearNumber,
      syncedFrom: syncedFrom || undefined,
      syncedTo: syncedTo || undefined,
    }),
    [tab, providerCode, search, yearNumber, syncedFrom, syncedTo],
  );

  const summary = useQuery({
    queryKey: ["publication-review", "summary"],
    queryFn: async () => unwrap(await PublicationReviewAPI.summary(), "No se pudo cargar el resumen"),
  });

  const list = useQuery({
    queryKey: ["publication-review", "list", filter, page, pageSize],
    queryFn: async () => unwrap(await PublicationReviewAPI.list(filter, page, pageSize), "No se pudo cargar la lista"),
    enabled: !invalidRange,
    placeholderData: (prev) => prev,
  });

  const items = list.data?.items ?? [];
  const refresh = () => {
    setSelected(new Set());
    return queryClient.invalidateQueries({ queryKey: ["publication-review"] });
  };

  const act = useMutation({
    mutationFn: async (vars: { action: "approve" | "reject" | "reopen" | "restore"; ids: number[]; notes?: string }) => {
      switch (vars.action) {
        case "approve": return unwrap(await PublicationReviewAPI.approve(vars.ids), "No se pudo aprobar");
        case "reject": return unwrap(await PublicationReviewAPI.reject(vars.ids, vars.notes ?? ""), "No se pudo rechazar");
        case "reopen": return unwrap(await PublicationReviewAPI.reopen(vars.ids, vars.notes ?? ""), "No se pudo reabrir");
        default: return unwrap(await PublicationReviewAPI.restore(vars.ids), "No se pudo restaurar");
      }
    },
    onSuccess: async (res) => {
      const failed = res.failed.length;
      toast({
        title: failed ? "Proceso con observaciones" : "Listo",
        description: `${res.processed} publicación(es) procesada(s)` + (failed ? `; ${failed} no se pudieron procesar: ${res.failed[0].reason}` : "."),
        variant: failed ? "destructive" : undefined,
      });
      setNotesDialog(null);
      setNotes("");
      setDetail(null);
      await refresh();
    },
    onError: (e: unknown) =>
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo completar la acción", variant: "destructive" }),
  });

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.publicationId));
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(items.map((i) => i.publicationId)) : new Set());
  const toggleOne = (id: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });

  const clearFilters = () => {
    setSearchText(""); setSearch(""); setProviderCode(""); setYear(""); setSyncedFrom(""); setSyncedTo(""); setPage(1);
  };
  const hasFilters = !!(searchText || providerCode || year || syncedFrom || syncedTo);

  const selectedIds = [...selected];
  const providerOptions = providers.data.filter((p) => !["MANUAL", "MIGRACION"].includes(p.name));
  const notesTrimmed = notes.trim();

  const runAction = (action: "approve" | "restore", ids: number[]) => act.mutate({ action, ids });
  const openNotes = (action: NotesAction, ids: number[]) => { setNotes(""); setNotesDialog({ action, ids }); };

  const rowActions = (item: PublicationReviewItem) => (
    <div className="flex items-center justify-end gap-1">
      <ActionIconButton icon={Eye} label="Ver detalle" onClick={() => setDetail(item)} />
      {item.approvalStatus === "SIN_REVISION" && (
        <>
          <ActionIconButton icon={Check} label="Aprobar" tone="success" disabled={act.isPending} onClick={() => runAction("approve", [item.publicationId])} />
          <ActionIconButton icon={X} label="Rechazar" tone="destructive" disabled={act.isPending} onClick={() => openNotes("reject", [item.publicationId])} />
        </>
      )}
      {item.approvalStatus === "APROBADA" && (
        <ActionIconButton icon={RotateCcw} label="Reabrir (volver a revisión)" tone="warning" disabled={act.isPending} onClick={() => openNotes("reopen", [item.publicationId])} />
      )}
      {item.approvalStatus === "RECHAZADA" && (
        <ActionIconButton icon={RotateCcw} label="Restaurar a revisión" tone="warning" disabled={act.isPending} onClick={() => runAction("restore", [item.publicationId])} />
      )}
    </div>
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Revisión de Publicaciones</h1>
          <p className="text-sm text-muted-foreground">
            Apruebe o rechace las publicaciones sincronizadas desde plataformas científicas. Lo aprobado queda congelado.
          </p>
        </div>
        <ActionIconButton icon={RefreshCw} label="Actualizar" onClick={() => { void refresh(); }} />
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SummaryCard label="En revisión" value={summary.data?.pendingCount} loading={summary.isLoading} />
        <SummaryCard label="Aprobadas" value={summary.data?.approvedCount} loading={summary.isLoading} />
        <SummaryCard label="Rechazadas" value={summary.data?.rejectedCount} loading={summary.isLoading} />
        <SummaryCard label="Docentes con pendientes" value={summary.data?.peopleWithPending} loading={summary.isLoading} />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as TabValue); setPage(1); setSelected(new Set()); }}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="SIN_REVISION">En revisión</TabsTrigger>
              <TabsTrigger value="APROBADA">Aprobadas</TabsTrigger>
              <TabsTrigger value="RECHAZADA">Rechazadas</TabsTrigger>
              <TabsTrigger value="ALL">Todas</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Docente, cédula, título o DOI"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                aria-label="Buscar"
              />
            </div>
            <select
              className="h-10 rounded-md border bg-background px-2 text-sm"
              value={providerCode}
              onChange={(e) => { setProviderCode(e.target.value); setPage(1); }}
              aria-label="Proveedor"
            >
              <option value="">Todos los proveedores</option>
              {providerOptions.map((p) => <option key={p.typeId} value={p.name}>{p.name}</option>)}
            </select>
            <Input
              inputMode="numeric"
              maxLength={4}
              placeholder="Año"
              value={year}
              onChange={(e) => { setYear(e.target.value.replace(/\D/g, "")); setPage(1); }}
              aria-label="Año de publicación"
            />
            <Input type="date" value={syncedFrom} onChange={(e) => { setSyncedFrom(e.target.value); setPage(1); }} aria-label="Sincronizadas desde" />
            <Input type="date" value={syncedTo} onChange={(e) => { setSyncedTo(e.target.value); setPage(1); }} aria-label="Sincronizadas hasta" />
          </div>
          {invalidRange && <p className="text-sm text-destructive">La fecha "desde" no puede ser posterior a "hasta".</p>}
          <div className="flex flex-wrap items-center gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <FilterX className="mr-1 h-4 w-4" /> Limpiar filtros
              </Button>
            )}
            {selected.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selected.size} seleccionada(s)</span>
                {tab === "SIN_REVISION" && (
                  <>
                    <Button size="sm" disabled={act.isPending} onClick={() => runAction("approve", selectedIds)}>
                      <Check className="mr-1 h-4 w-4" /> Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" disabled={act.isPending} onClick={() => openNotes("reject", selectedIds)}>
                      <X className="mr-1 h-4 w-4" /> Rechazar
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {list.isError ? (
            <div className="space-y-2 py-8 text-center">
              <p className="text-sm text-destructive">{list.error instanceof Error ? list.error.message : "No se pudo cargar la lista."}</p>
              <Button size="sm" onClick={() => list.refetch()}>Reintentar</Button>
            </div>
          ) : list.isLoading ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay publicaciones con ese criterio.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox checked={allSelected} onCheckedChange={(c) => toggleAll(c === true)} aria-label="Seleccionar todas" />
                    </TableHead>
                    <TableHead>Docente</TableHead>
                    <TableHead>Publicación</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Publicada</TableHead>
                    <TableHead>Sincronizada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.publicationId}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(item.publicationId)}
                          onCheckedChange={(c) => toggleOne(item.publicationId, c === true)}
                          aria-label="Seleccionar publicación"
                        />
                      </TableCell>
                      <TableCell className="min-w-40">
                        <p className="font-medium">{item.personName}</p>
                        <p className="text-xs text-muted-foreground">{item.idCard}</p>
                      </TableCell>
                      <TableCell className="min-w-64 max-w-md">
                        <p className="break-words">{item.title}</p>
                        {item.journalName && <p className="text-xs text-muted-foreground break-words">{item.journalName}</p>}
                      </TableCell>
                      <TableCell>{item.providerName}</TableCell>
                      <TableCell className="whitespace-nowrap">{shortDate(item.publicationDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{shortDate(item.lastSyncedAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE[item.approvalStatus].className}>
                          {STATUS_BADGE[item.approvalStatus].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{rowActions(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {list.data && (
            <DataPagination
              page={page}
              totalPages={list.data.totalPages}
              totalCount={list.data.totalCount}
              pageSize={pageSize}
              hasPreviousPage={page > 1}
              hasNextPage={page < list.data.totalPages}
              onPageChange={(p) => { setPage(p); setSelected(new Set()); }}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); setSelected(new Set()); }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="break-words">{detail.title}</SheetTitle>
                <SheetDescription>{detail.personName} · {detail.idCard}</SheetDescription>
              </SheetHeader>
              <dl className="mt-4 space-y-3 text-sm">
                <Field label="Estado">
                  <Badge variant="outline" className={STATUS_BADGE[detail.approvalStatus].className}>{STATUS_BADGE[detail.approvalStatus].label}</Badge>
                </Field>
                <Field label="Revista / fuente">{detail.journalName ?? "—"}</Field>
                <Field label="Fecha de publicación">{shortDate(detail.publicationDate)}</Field>
                <Field label="DOI">
                  {detail.doi ? (
                    <a className="inline-flex items-center gap-1 text-primary hover:underline break-all" href={`https://doi.org/${detail.doi}`} target="_blank" rel="noopener noreferrer">
                      {detail.doi} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "—"}
                </Field>
                {detail.link && (
                  <Field label="Enlace">
                    <a className="inline-flex items-center gap-1 text-primary hover:underline break-all" href={detail.link} target="_blank" rel="noopener noreferrer">
                      Abrir registro <ExternalLink className="h-3 w-3" />
                    </a>
                  </Field>
                )}
                <Field label="Origen">
                  Obtenida de {detail.providerName}
                  {detail.externalId ? ` (ID ${detail.externalId})` : ""}. Sincronizada el {shortDate(detail.lastSyncedAt)}.
                </Field>
                {detail.approvedAt && <Field label="Decisión">{shortDate(detail.approvedAt)}</Field>}
                {detail.reviewNotes && <Field label="Observación">{detail.reviewNotes}</Field>}
              </dl>
              <div className="mt-6 flex flex-wrap gap-2">
                {detail.approvalStatus === "SIN_REVISION" && (
                  <>
                    <Button disabled={act.isPending} onClick={() => runAction("approve", [detail.publicationId])}><Check className="mr-1 h-4 w-4" />Aprobar</Button>
                    <Button variant="destructive" disabled={act.isPending} onClick={() => openNotes("reject", [detail.publicationId])}><X className="mr-1 h-4 w-4" />Rechazar</Button>
                  </>
                )}
                {detail.approvalStatus === "APROBADA" && (
                  <Button variant="outline" disabled={act.isPending} onClick={() => openNotes("reopen", [detail.publicationId])}><RotateCcw className="mr-1 h-4 w-4" />Reabrir</Button>
                )}
                {detail.approvalStatus === "RECHAZADA" && (
                  <Button variant="outline" disabled={act.isPending} onClick={() => runAction("restore", [detail.publicationId])}><RotateCcw className="mr-1 h-4 w-4" />Restaurar</Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!notesDialog} onOpenChange={(o) => { if (!o && !act.isPending) setNotesDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{notesDialog?.action === "reject" ? "Rechazar publicación(es)" : "Reabrir publicación(es)"}</DialogTitle>
            <DialogDescription>
              {notesDialog?.ids.length} seleccionada(s). La observación es obligatoria y queda registrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="review-notes">Observación</Label>
            <Textarea
              id="review-notes"
              value={notes}
              maxLength={DB_FIELD_LIMITS.researcher.reviewNotes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <p className="text-right text-xs text-muted-foreground">{notes.length}/{DB_FIELD_LIMITS.researcher.reviewNotes}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={act.isPending} onClick={() => setNotesDialog(null)}>Cancelar</Button>
            <Button
              variant={notesDialog?.action === "reject" ? "destructive" : "default"}
              disabled={!notesTrimmed || act.isPending}
              onClick={() => notesDialog && act.mutate({ action: notesDialog.action, ids: notesDialog.ids, notes: notesTrimmed })}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-semibold">{value ?? 0}</p>}
        <CardTitle className="mt-1 text-xs font-normal text-muted-foreground">{label}</CardTitle>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}
