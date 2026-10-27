import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { EmployeeCombobox } from "@/components/ui/EmployeeCombobox";
import { useToast } from "@/hooks/use-toast";
import { PunchPolicyAPI } from "@/lib/api/services/punchPolicy";
import { unwrapApiResponse } from "@/lib/api/utils/error-handling";
import type { PunchPolicyItem, PunchPolicySave } from "@/types/punchPolicy";
import { PUNCH_POLICIES_KEY } from "./punchQueries";
import { formatDate } from "@/lib/clock";

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");
const fmt = (value?: string | null) => (value ? formatDate(value, "es-EC") : null);

function statusOf(p: PunchPolicyItem): { label: string; tone: StatusTone } {
  if (!p.allowExternalPunch) return { label: "Desactivada", tone: "muted" };
  return p.isEffective ? { label: "Vigente", tone: "success" } : { label: "Fuera de vigencia", tone: "warning" };
}

interface FormState {
  employeeId: number | null;
  employeeLabel: string;
  allow: boolean;
  reason: string;
  validFrom: string;
  validTo: string;
}
const EMPTY: FormState = { employeeId: null, employeeLabel: "", allow: true, reason: "", validFrom: "", validTo: "" };

export default function ExternalPunchTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<"all" | "effective">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [toRemove, setToRemove] = useState<PunchPolicyItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const onlyEffective = filter === "effective";
  const list = useQuery({
    queryKey: [...PUNCH_POLICIES_KEY, debounced, onlyEffective, page, pageSize],
    queryFn: async () => unwrapApiResponse(await PunchPolicyAPI.policies({ search: debounced, onlyEffective, page, pageSize })),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: PUNCH_POLICIES_KEY });

  const save = useMutation({
    mutationFn: async () => {
      const payload: PunchPolicySave = {
        allowExternalPunch: form.allow,
        reason: form.reason.trim() || undefined,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
      };
      return unwrapApiResponse(await PunchPolicyAPI.savePolicy(form.employeeId!, payload));
    },
    onSuccess: () => {
      toast({ title: "Autorización guardada" });
      setDialogOpen(false);
      refresh();
    },
    onError: (e: Error) => toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (p: PunchPolicyItem) => unwrapApiResponse(await PunchPolicyAPI.deletePolicy(p.employeeId)),
    onSuccess: () => {
      toast({ title: "Autorización eliminada" });
      setToRemove(null);
      refresh();
    },
    onError: (e: Error) => {
      setToRemove(null);
      toast({ title: "No se pudo eliminar", description: e.message, variant: "destructive" });
    },
  });

  const openNew = () => {
    setIsEdit(false);
    setForm(EMPTY);
    setDialogOpen(true);
  };
  const openEdit = (p: PunchPolicyItem) => {
    setIsEdit(true);
    setForm({
      employeeId: p.employeeId,
      employeeLabel: p.fullName,
      allow: p.allowExternalPunch,
      reason: p.reason ?? "",
      validFrom: toDateInput(p.validFrom),
      validTo: toDateInput(p.validTo),
    });
    setDialogOpen(true);
  };

  const datesOk = !form.validFrom || !form.validTo || form.validTo >= form.validFrom;
  const canSave = form.employeeId !== null && datesOk && (!form.allow || form.reason.trim() !== "") && !save.isPending;
  const data = list.data;

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
                setFilter(v as "all" | "effective");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="effective">Vigentes</SelectItem>
              </SelectContent>
            </Select>
            <ActionIconButton icon={RefreshCw} label="Actualizar" onClick={refresh} touch />
            {canManage && (
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Autorizar
              </Button>
            )}
          </div>
        </div>
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
                  {canManage && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.items.map((p) => {
                  const st = statusOf(p);
                  return (
                    <TableRow key={p.employeeId}>
                      <TableCell>
                        <div className="font-medium">{p.fullName}</div>
                        <div className="text-xs text-muted-foreground">{[p.idCard, p.department].filter(Boolean).join(" · ")}</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={st.label} tone={st.tone} />
                      </TableCell>
                      <TableCell className="max-w-xs break-words text-sm">{p.reason || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {p.validFrom || p.validTo ? `${fmt(p.validFrom) ?? "…"} – ${fmt(p.validTo) ?? "…"}` : "Sin límite"}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <ActionIconButton icon={Pencil} label={`Editar a ${p.fullName}`} onClick={() => openEdit(p)} />
                            <ActionIconButton icon={Trash2} label={`Quitar a ${p.fullName}`} tone="destructive" onClick={() => setToRemove(p)} />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataPagination
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar autorización" : "Autorizar picada externa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Empleado</Label>
              {isEdit ? (
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium">{form.employeeLabel}</p>
              ) : (
                <EmployeeCombobox
                  value={form.employeeId}
                  onSelect={(id) => setForm((f) => ({ ...f, employeeId: id }))}
                  placeholder="Buscar por nombre o cédula"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="punch-pol-allow" checked={form.allow} onCheckedChange={(v) => setForm({ ...form, allow: v })} />
              <Label htmlFor="punch-pol-allow">Autorizada</Label>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="punch-pol-reason">Motivo{form.allow && <span className="text-destructive"> *</span>}</Label>
              <Textarea
                id="punch-pol-reason"
                value={form.reason}
                maxLength={300}
                rows={2}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Ej.: teletrabajo autorizado"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="punch-pol-from">Desde</Label>
                <Input id="punch-pol-from" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="punch-pol-to">Hasta</Label>
                <Input id="punch-pol-to" type="date" value={form.validTo} min={form.validFrom || undefined} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
              </div>
            </div>
            {!datesOk && (
              <p className="form-error" role="alert">
                La fecha final es anterior a la inicial.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={!canSave}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar la autorización?</AlertDialogTitle>
            <AlertDialogDescription>{toRemove?.fullName}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toRemove && remove.mutate(toRemove)}>Quitar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
