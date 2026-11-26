import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Globe, History, Loader2, Plus, RefreshCw, Search, UserCheck, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DepartmentCombobox } from "@/components/ui/DepartmentCombobox";
import { VwDepartmentWithTypeAPI } from "@/lib/api/services/views";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { DataPagination } from "@/components/ui/DataPagination";
import { useMobileInfiniteList, withMobileList } from "@/hooks/pagination/useMobileInfiniteList";
import { EmployeeCombobox } from "@/components/ui/EmployeeCombobox";
import { useToast } from "@/hooks/use-toast";
import { PunchPolicyAPI } from "@/lib/api/services/punchPolicy";
import { unwrapApiResponse } from "@/lib/api/utils/error-handling";
import type { PunchPolicyItem, PunchPolicyStatus } from "@/types/punchPolicy";
import { PUNCH_POLICIES_KEY, punchErrorText } from "./punchQueries";
import { formatDate, formatDateTime } from "@/lib/clock";

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");
const fmt = (value?: string | null) => (value ? formatDate(value, "es-EC") : null);

const STATUS: Record<PunchPolicyStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: "Vigente", tone: "success" },
  SCHEDULED: { label: "Programada", tone: "primary" },
  EXPIRED: { label: "Vencida", tone: "muted" },
  REVOKED: { label: "Revocada", tone: "destructive" },
};

const rangeText = (from?: string | null, to?: string | null) =>
  from || to ? `${fmt(from) ?? "…"} – ${fmt(to) ?? "…"}` : "Sin límite";

type Scope = "employee" | "department" | "all";
const SCOPE_LABELS: Record<Scope, string> = { employee: "Un empleado", department: "Un departamento", all: "Toda la institución" };

interface FormState {
  scope: Scope;
  employeeId: number | null;
  departmentId: number | null;
  includeChildren: boolean;
  reason: string;
  validFrom: string;
  validTo: string;
}
const EMPTY: FormState = { scope: "employee", employeeId: null, departmentId: null, includeChildren: false, reason: "", validFrom: "", validTo: "" };

export default function ExternalPunchTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<"effective" | "all">("effective");
  const [historyOf, setHistoryOf] = useState<PunchPolicyItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [toRevoke, setToRevoke] = useState<PunchPolicyItem | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeBatch, setRevokeBatch] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Con el historial de un empleado se muestran todas sus autorizaciones, también las revocadas y vencidas.
  const onlyEffective = filter === "effective" && !historyOf;
  const employeeId = historyOf?.employeeId ?? undefined;
  const policiesKey = [...PUNCH_POLICIES_KEY, debounced, onlyEffective, employeeId ?? null];
  const fetchPolicies = async (pg: number, size: number) =>
    unwrapApiResponse(await PunchPolicyAPI.policies({ search: debounced, onlyEffective, employeeId, page: pg, pageSize: size }));
  const mobile = useMobileInfiniteList<any>({ queryKey: policiesKey, fetchPage: fetchPolicies, pageSize, staleTime: 0 });
  const listQuery = useQuery({
    queryKey: [...policiesKey, page, pageSize],
    queryFn: () => fetchPolicies(page, pageSize),
    staleTime: 0,
    placeholderData: (prev) => prev,
    enabled: !mobile.active,
  });
  const list = withMobileList(listQuery, mobile);
  const refresh = () => queryClient.invalidateQueries({ queryKey: PUNCH_POLICIES_KEY });

  const departmentsQuery = useQuery({
    queryKey: ["punchPolicy", "departments"],
    queryFn: async () => unwrapApiResponse(await VwDepartmentWithTypeAPI.getActive()),
    staleTime: 5 * 60_000,
    enabled: dialog && form.scope === "department",
  });

  const datesOk = !form.validFrom || !form.validTo || form.validTo >= form.validFrom;

  // Vista previa: cuántas personas alcanza y a cuántas se omite (ya tienen una autorización que se cruza)
  const preview = useQuery({
    queryKey: ["punchPolicy", "departmentPreview", form.departmentId, form.includeChildren, form.validFrom, form.validTo],
    queryFn: async () =>
      unwrapApiResponse(
        await PunchPolicyAPI.previewDepartmentPolicies({
          departmentId: form.departmentId!,
          includeChildren: form.includeChildren,
          validFrom: form.validFrom || null,
          validTo: form.validTo || null,
        })
      ),
    enabled: dialog && form.scope === "department" && form.departmentId !== null && datesOk,
    staleTime: 0,
  });

  const saveSingle = useMutation({
    mutationFn: async () => {
      const common = { reason: form.reason.trim(), validFrom: form.validFrom || null };
      if (form.scope === "all") {
        return unwrapApiResponse(await PunchPolicyAPI.createGlobalPolicy({ ...common, validTo: form.validTo }));
      }
      return unwrapApiResponse(await PunchPolicyAPI.createPolicy({ ...common, employeeId: form.employeeId!, validTo: form.validTo || null }));
    },
    onSuccess: () => {
      toast({ title: form.scope === "all" ? "Autorización a toda la institución creada" : "Autorización creada" });
      setDialog(false);
      refresh();
    },
    onError: (e: Error) => toast({ title: "No se pudo guardar", description: punchErrorText(e), variant: "destructive" }),
  });

  const saveDepartment = useMutation({
    mutationFn: async () =>
      unwrapApiResponse(
        await PunchPolicyAPI.createDepartmentPolicies({
          departmentId: form.departmentId!,
          includeChildren: form.includeChildren,
          reason: form.reason.trim(),
          validFrom: form.validFrom || null,
          validTo: form.validTo || null,
        })
      ),
    onSuccess: (r) => {
      toast({
        title: `${r.created} autorizaciones creadas`,
        description: r.skipped > 0 ? `${r.skipped} se omitieron porque ya tenían una autorización vigente.` : undefined,
      });
      setDialog(false);
      refresh();
    },
    onError: (e: Error) => toast({ title: "No se pudo guardar", description: punchErrorText(e), variant: "destructive" }),
  });

  const revoke = useMutation({
    // Los datos viajan como parámetro: AlertDialogAction cierra el diálogo y limpia el estado antes de que corra la mutación.
    mutationFn: async ({ p, reason, batch }: { p: PunchPolicyItem; reason?: string; batch: boolean }) => {
      if (batch && p.batchId) return (await unwrapApiResponse(await PunchPolicyAPI.revokeBatch(p.batchId, reason))).revoked;
      await unwrapApiResponse(await PunchPolicyAPI.revokePolicy(p.policyId, reason));
      return 1;
    },
    onSuccess: (n) => {
      toast({ title: n === 1 ? "Autorización revocada" : `${n} autorizaciones revocadas` });
      setToRevoke(null);
      refresh();
    },
    onError: (e: Error) => {
      setToRevoke(null);
      toast({ title: "No se pudo revocar", description: punchErrorText(e), variant: "destructive" });
    },
  });

  const openDialog = () => {
    setForm(EMPTY);
    setDialog(true);
  };
  const openRevoke = (p: PunchPolicyItem) => {
    setRevokeReason("");
    setRevokeBatch(false);
    setToRevoke(p);
  };

  const reasonOk = form.reason.trim() !== "";
  const canSave =
    datesOk &&
    reasonOk &&
    (form.scope === "employee"
      ? form.employeeId !== null && !saveSingle.isPending
      : form.scope === "all"
        ? form.validTo !== "" && !saveSingle.isPending
        : form.departmentId !== null && (preview.data?.toCreate ?? 0) > 0 && !saveDepartment.isPending);
  const isSaving = saveSingle.isPending || saveDepartment.isPending;
  const submit = () => (form.scope === "department" ? saveDepartment.mutate() : saveSingle.mutate());
  const data = list.data;
  const departments = (departmentsQuery.data ?? []) as any[];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Picada externa</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empleado"
                aria-label="Buscar empleado"
                className="w-56 pl-8"
              />
            </div>
            <Select
              value={filter}
              onValueChange={(v) => {
                setFilter(v as "effective" | "all");
                setPage(1);
              }}
              disabled={!!historyOf}
            >
              <SelectTrigger className="w-40" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="effective">Vigentes</SelectItem>
                <SelectItem value="all">Todo el historial</SelectItem>
              </SelectContent>
            </Select>
            <ActionIconButton icon={RefreshCw} label="Actualizar" onClick={refresh} touch />
            {canManage && (
              <Button onClick={openDialog}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Autorizar
              </Button>
            )}
          </div>
        </div>
        {historyOf && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">Historial de {historyOf.fullName}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setHistoryOf(null)}>
              <X className="mr-1 h-4 w-4" aria-hidden="true" /> Quitar filtro
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Cargando" />
          </div>
        ) : list.isError ? (
          <p className="py-6 text-center text-sm text-destructive" role="alert">
            {(list.error as Error).message}
          </p>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="empty-state">
            <UserCheck className="empty-state-icon" aria-hidden="true" />
            <p className="empty-state-title">Sin autorizaciones</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Registro</TableHead>
                  {canManage && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.items.map((p: PunchPolicyItem) => {
                  const st = STATUS[p.status] ?? STATUS.ACTIVE;
                  return (
                    <TableRow key={p.policyId}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium">
                          {p.isGlobal && <Globe className="h-4 w-4 text-primary" aria-hidden="true" />}
                          {p.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.isGlobal ? "Aplica a todo el personal" : [p.idCard, p.department].filter(Boolean).join(" · ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={st.label} tone={st.tone} />
                      </TableCell>
                      <TableCell className="max-w-xs break-words text-sm">
                        <div>{p.reason || "—"}</div>
                        {p.batchDepartmentName && (
                          <div className="mt-1 text-xs text-muted-foreground">Lote: {p.batchDepartmentName}</div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{rangeText(p.validFrom, p.validTo)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>
                          Autorizó{p.authorizedByName ? ` ${p.authorizedByName}` : ""} · {formatDateTime(p.createdAt, "es-EC")}
                        </div>
                        {p.revokedAt && (
                          <div className="mt-1">
                            Revocó{p.revokedByName ? ` ${p.revokedByName}` : ""} · {formatDateTime(p.revokedAt, "es-EC")}
                            {p.revokeReason ? ` · ${p.revokeReason}` : ""}
                          </div>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex justify-end gap-1 flex-wrap">
                            {!p.isGlobal && <ActionIconButton icon={History} label={`Ver historial de ${p.fullName}`} onClick={() => setHistoryOf(p)} />}
                            {(p.status === "ACTIVE" || p.status === "SCHEDULED") && (
                              <ActionIconButton icon={Ban} label={`Revocar a ${p.fullName}`} tone="destructive" onClick={() => openRevoke(p)} />
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataPagination
              infinite={mobile.infinite}
              itemLabel="autorizaciones"
              page={data!.page}
              totalPages={data!.totalPages}
              totalCount={data!.totalCount}
              pageSize={data!.pageSize}
              hasPreviousPage={data!.hasPreviousPage}
              hasNextPage={data!.hasNextPage}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </>
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={(o) => !o && setDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Autorizar picada externa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="punch-pol-scope">Alcance</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...EMPTY, scope: v as Scope, reason: form.reason, validFrom: form.validFrom, validTo: form.validTo })}>
                <SelectTrigger id="punch-pol-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SCOPE_LABELS) as Scope[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SCOPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.scope === "employee" ? (
              <div className="grid gap-1.5">
                <Label>Empleado</Label>
                <EmployeeCombobox
                  value={form.employeeId}
                  onSelect={(id) => setForm((f) => ({ ...f, employeeId: id }))}
                  placeholder="Buscar por nombre o cédula"
                />
              </div>
            ) : form.scope === "all" ? (
              <div className="alert-warning rounded-md p-3 text-sm" role="alert">
                Se creará <strong>una sola autorización</strong> que permite picar fuera del campus a <strong>todo el personal</strong> mientras esté
                vigente. Indique la fecha final; puede revocarla en cualquier momento.
              </div>
            ) : (
              <>
                <div className="grid gap-1.5">
                  <Label>Departamento</Label>
                  <DepartmentCombobox
                    departments={departments}
                    value={form.departmentId}
                    onChange={(id) => setForm((f) => ({ ...f, departmentId: id }))}
                    placeholder="Buscar departamento"
                    className="h-10 w-full text-sm"
                    disabled={departmentsQuery.isLoading}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="punch-pol-children"
                    checked={form.includeChildren}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, includeChildren: v === true }))}
                  />
                  <Label htmlFor="punch-pol-children">Incluir los subdepartamentos</Label>
                </div>
              </>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="punch-pol-reason">
                Motivo<span className="text-destructive"> *</span>
              </Label>
              <Textarea
                id="punch-pol-reason"
                value={form.reason}
                maxLength={300}
                rows={2}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Ej.: teletrabajo autorizado"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="punch-pol-from">Desde</Label>
                <Input id="punch-pol-from" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="punch-pol-to">
                  Hasta{form.scope === "all" && <span className="text-destructive"> *</span>}
                </Label>
                <Input id="punch-pol-to" type="date" value={form.validTo} min={form.validFrom || undefined} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
              </div>
            </div>
            {!datesOk && (
              <p className="form-error" role="alert">
                La fecha final es anterior a la inicial.
              </p>
            )}
            {form.scope === "department" && form.departmentId !== null && datesOk && (
              <div className="alert-info rounded-md p-3 text-sm" role="status">
                {preview.isLoading ? (
                  <span>Calculando personal alcanzado…</span>
                ) : preview.isError ? (
                  <span>{(preview.error as Error).message}</span>
                ) : preview.data ? (
                  <>
                    <div>
                      Se crearán <strong>{preview.data.toCreate}</strong> autorizaciones ({preview.data.departmentName}
                      {preview.data.departments > 1 ? `, ${preview.data.departments} departamentos` : ""}).
                    </div>
                    {preview.data.alreadyAuthorized > 0 && (
                      <div className="mt-1">{preview.data.alreadyAuthorized} se omiten: ya tienen una autorización vigente en esas fechas.</div>
                    )}
                    <div className="mt-1 text-xs">Solo alcanza al personal que está hoy en el departamento; quien ingrese después no queda incluido.</div>
                  </>
                ) : null}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!canSave}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />} {form.scope === "employee" ? "Guardar" : "Autorizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toRevoke} onOpenChange={(o) => !o && setToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar la autorización?</AlertDialogTitle>
            <AlertDialogDescription>
              {toRevoke?.fullName}. Deja de permitir picar fuera del campus y queda en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="punch-pol-revoke-reason">Motivo (opcional)</Label>
              <Textarea
                id="punch-pol-revoke-reason"
                value={revokeReason}
                maxLength={300}
                rows={2}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>
            {toRevoke?.batchId && (
              <div className="flex items-center gap-2">
                <Checkbox id="punch-pol-revoke-batch" checked={revokeBatch} onCheckedChange={(v) => setRevokeBatch(v === true)} />
                <Label htmlFor="punch-pol-revoke-batch">
                  Revocar también las demás del lote{toRevoke.batchDepartmentName ? ` (${toRevoke.batchDepartmentName})` : ""}
                </Label>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toRevoke && revoke.mutate({ p: toRevoke, reason: revokeReason.trim() || undefined, batch: revokeBatch })}>Revocar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
