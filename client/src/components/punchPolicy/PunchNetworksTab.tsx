import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Search, Trash2, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { useToast } from "@/hooks/use-toast";
import { PunchPolicyAPI } from "@/lib/api/services/punchPolicy";
import { unwrapApiResponse } from "@/lib/api/utils/error-handling";
import type { PunchIpCheck, PunchNetwork, PunchNetworkSave } from "@/types/punchPolicy";
import { PUNCH_MY_ACCESS_KEY, PUNCH_NETWORKS_KEY, PUNCH_SETTINGS_KEY, useMyPunchAccess } from "./punchQueries";

const EMPTY: PunchNetworkSave = { name: "", ipOrCidr: "", notes: "", isActive: true };

export default function PunchNetworksTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PunchNetwork | null>(null);
  const [form, setForm] = useState<PunchNetworkSave>(EMPTY);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PunchNetwork | null>(null);
  const [probeIp, setProbeIp] = useState("");
  const [probe, setProbe] = useState<PunchIpCheck | null>(null);
  const [probing, setProbing] = useState(false);

  const networks = useQuery({
    queryKey: PUNCH_NETWORKS_KEY,
    queryFn: async () => unwrapApiResponse(await PunchPolicyAPI.networks()),
    staleTime: 0,
  });
  const myAccess = useMyPunchAccess();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: PUNCH_NETWORKS_KEY });
    queryClient.invalidateQueries({ queryKey: PUNCH_SETTINGS_KEY });
    queryClient.invalidateQueries({ queryKey: PUNCH_MY_ACCESS_KEY });
  };
  const fail = (title: string) => (e: Error) => toast({ title, description: e.message, variant: "destructive" });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, name: form.name.trim(), ipOrCidr: form.ipOrCidr.trim() };
      return unwrapApiResponse(
        editing ? await PunchPolicyAPI.updateNetwork(editing.networkId, payload) : await PunchPolicyAPI.createNetwork(payload)
      );
    },
    onSuccess: () => {
      toast({ title: editing ? "Red actualizada" : "Red agregada" });
      setDialogOpen(false);
      refresh();
    },
    onError: fail("No se pudo guardar la red"),
  });

  const toggle = useMutation({
    mutationFn: async (n: PunchNetwork) =>
      unwrapApiResponse(
        await PunchPolicyAPI.updateNetwork(n.networkId, { name: n.name, ipOrCidr: n.ipOrCidr, notes: n.notes ?? "", isActive: !n.isActive })
      ),
    onSuccess: refresh,
    onError: fail("No se pudo cambiar el estado"),
  });

  const remove = useMutation({
    mutationFn: async (n: PunchNetwork) => unwrapApiResponse(await PunchPolicyAPI.deleteNetwork(n.networkId)),
    onSuccess: () => {
      toast({ title: "Red eliminada" });
      setToDelete(null);
      refresh();
    },
    onError: (e: Error) => {
      setToDelete(null);
      fail("No se pudo eliminar")(e);
    },
  });

  const openForm = (n: PunchNetwork | null) => {
    setEditing(n);
    setForm(n ? { name: n.name, ipOrCidr: n.ipOrCidr, notes: n.notes ?? "", isActive: n.isActive } : EMPTY);
    setDialogOpen(true);
  };

  const runProbe = async () => {
    if (!probeIp.trim()) return;
    setProbing(true);
    try {
      setProbe(unwrapApiResponse(await PunchPolicyAPI.checkIp(probeIp.trim())));
    } catch (e) {
      fail("No se pudo probar la IP")(e as Error);
    } finally {
      setProbing(false);
    }
  };

  const canSave = form.name.trim() !== "" && form.ipOrCidr.trim() !== "" && !save.isPending;
  const list = networks.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Redes del campus</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={probeIp}
                onChange={(e) => {
                  setProbeIp(e.target.value);
                  setProbe(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && runProbe()}
                placeholder="Probar una IP"
                aria-label="Probar una IP"
                className="w-44 pl-8 font-mono"
              />
            </div>
            <Button variant="outline" onClick={runProbe} disabled={probing || !probeIp.trim()}>
              {probing ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Probando" /> : "Probar"}
            </Button>
            {probe && (
              <span role="status" aria-live="polite">
                <StatusBadge
                  label={!probe.isValid ? "IP inválida" : probe.isCampus ? "Dentro del campus" : "Fuera del campus"}
                  tone={!probe.isValid ? "warning" : probe.isCampus ? "success" : "muted"}
                />
              </span>
            )}
            {canManage && (
              <Button onClick={() => openForm(null)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Agregar red
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {networks.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Cargando" />
          </div>
        ) : networks.isError ? (
          <p className="py-6 text-center text-sm text-destructive" role="alert">
            {(networks.error as Error).message}
          </p>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <Wifi className="empty-state-icon" aria-hidden="true" />
            <p className="empty-state-title">Sin redes configuradas</p>
            {canManage && <p className="empty-state-desc">Agrega la IP pública del campus.</p>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>IP / rango</TableHead>
                <TableHead>Estado</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((n) => (
                <TableRow key={n.networkId}>
                  <TableCell>
                    <div className="font-medium">{n.name}</div>
                    {n.notes && <div className="text-xs text-muted-foreground">{n.notes}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{n.ipOrCidr}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={n.isActive}
                        disabled={!canManage || toggle.isPending}
                        onCheckedChange={() => toggle.mutate(n)}
                        aria-label={`${n.isActive ? "Desactivar" : "Activar"} ${n.name}`}
                      />
                      <StatusBadge label={n.isActive ? "Activa" : "Inactiva"} tone={n.isActive ? "success" : "muted"} />
                    </div>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <ActionIconButton icon={Pencil} label={`Editar ${n.name}`} onClick={() => openForm(n)} />
                        <ActionIconButton icon={Trash2} label={`Eliminar ${n.name}`} tone="destructive" onClick={() => setToDelete(n)} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar red" : "Nueva red"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="punch-net-name">Nombre</Label>
              <Input
                id="punch-net-name"
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Campus Huachi"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="punch-net-ip">IP o rango</Label>
              <div className="flex gap-2">
                <Input
                  id="punch-net-ip"
                  value={form.ipOrCidr}
                  maxLength={64}
                  onChange={(e) => setForm({ ...form, ipOrCidr: e.target.value })}
                  placeholder="190.10.20.0/24"
                  className="font-mono"
                />
                {myAccess.data?.ip && (
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, ipOrCidr: myAccess.data!.ip! })}>
                    Mi IP
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="punch-net-notes">Notas</Label>
              <Input id="punch-net-notes" value={form.notes ?? ""} maxLength={300} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="punch-net-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label htmlFor="punch-net-active">Activa</Label>
            </div>
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

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta red?</AlertDialogTitle>
            <AlertDialogDescription>{toDelete ? `${toDelete.name} · ${toDelete.ipOrCidr}` : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
