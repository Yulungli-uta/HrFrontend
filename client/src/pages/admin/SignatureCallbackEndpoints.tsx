// src/pages/admin/SignatureCallbackEndpoints.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Loader2, Webhook } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  CallbackEndpointsAPI,
  type CallbackEndpoint,
} from "@/lib/api";

const AVAILABLE_EVENTS = ["PROCESS_CREATED", "PROCESS_COMPLETED"] as const;

type FormState = { clientId: string; url: string; events: string[] };
const emptyForm: FormState = { clientId: "", url: "", events: ["PROCESS_COMPLETED"] };

export default function SignatureCallbackEndpoints() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CallbackEndpoint | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["signature-callback-endpoints"],
    queryFn: () => CallbackEndpointsAPI.list(),
  });
  const endpoints: CallbackEndpoint[] = data?.status === "success" ? data.data : [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["signature-callback-endpoints"] });

  const createMutation = useMutation({
    mutationFn: () => CallbackEndpointsAPI.create({ clientId: form.clientId, url: form.url, events: form.events }),
    onSuccess: (res) => {
      if (res.status === "error") { setError(res.error.message); return; }
      setDialogOpen(false);
      invalidate();
    },
    onError: () => setError("No se pudo crear el endpoint."),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("no editing target");
      return CallbackEndpointsAPI.update(editing.callbackEndpointId, {
        url: form.url,
        events: form.events,
        isActive: editing.isActive,
      });
    },
    onSuccess: (res) => {
      if (res.status === "error") { setError(res.error.message); return; }
      setDialogOpen(false);
      invalidate();
    },
    onError: () => setError("No se pudo actualizar el endpoint."),
  });

  const toggleMutation = useMutation({
    mutationFn: (endpoint: CallbackEndpoint) =>
      endpoint.isActive
        ? CallbackEndpointsAPI.deactivate(endpoint.callbackEndpointId)
        : CallbackEndpointsAPI.update(endpoint.callbackEndpointId, { url: endpoint.url, events: endpoint.events, isActive: true }),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (endpoint: CallbackEndpoint) => {
    setEditing(endpoint);
    setForm({ clientId: endpoint.clientId, url: endpoint.url, events: endpoint.events });
    setError("");
    setDialogOpen(true);
  };

  const toggleEvent = (event: string) =>
    setForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }));

  const submit = () => {
    if (!form.url.trim() || form.events.length === 0) {
      setError("Ingrese una URL y al menos un evento.");
      return;
    }
    if (editing) updateMutation.mutate();
    else {
      if (!form.clientId.trim()) { setError("El ClientId es obligatorio."); return; }
      createMutation.mutate();
    }
  };

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Endpoints de callback de firma electrónica</h1>
        <p className="text-sm text-muted-foreground">
          A qué URL avisar por cada sistema (HrBackend, u otros) cuando un proceso de firma se crea o se completa.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4 text-primary" />
              Sistemas registrados
            </CardTitle>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar sistema
            </Button>
          </div>
          <CardDescription>
            Cada ClientId solo puede tener un endpoint activo a la vez — desactivar uno libera el ClientId para registrar otro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {!isLoading && isError && (
            <Alert variant="destructive">
              <AlertDescription>No se pudieron cargar los endpoints.</AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && endpoints.length === 0 && (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              Ningún sistema tiene un endpoint de callback registrado todavía.
            </p>
          )}

          {!isLoading && endpoints.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ClientId</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Eventos</TableHead>
                    <TableHead className="w-20">Activo</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint) => (
                    <TableRow key={endpoint.callbackEndpointId}>
                      <TableCell className="font-medium">{endpoint.clientId}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{endpoint.url}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {endpoint.events.map((e) => (
                            <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={endpoint.isActive}
                          disabled={toggleMutation.isPending}
                          onCheckedChange={() => toggleMutation.mutate(endpoint)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(endpoint)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar endpoint" : "Registrar sistema"}</DialogTitle>
            <DialogDescription>
              El host de la URL debe estar en la allowlist (<code>Callbacks:AllowedHosts</code>) de signature-api.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>ClientId {editing && <span className="text-muted-foreground font-normal">(no editable)</span>}</Label>
              <Input
                value={form.clientId}
                disabled={!!editing}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                placeholder="ej. hrbackend"
              />
            </div>
            <div>
              <Label>URL (HTTPS) *</Label>
              <Input
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Eventos *</Label>
              <div className="mt-1 flex flex-col gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Guardar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
