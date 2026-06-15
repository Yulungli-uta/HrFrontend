// src/pages/admin/ActiveSessions.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, RefreshCw, LogOut, Users, Key, Power, Wifi, WifiOff,
  AlertTriangle, Copy, Check, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/error-handling";
import {
  SessionManagementAPI,
  type ActiveSessionDto,
  type ActiveApiClientDto,
  type RotateSecretResultDto,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return <span className="italic text-muted-foreground">—</span>;
  return new Date(iso).toLocaleString("es-EC", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortenAgent(ua?: string | null) {
  if (!ua) return "—";
  if (ua.includes("Chrome"))  return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari"))  return "Safari";
  if (ua.includes("Edge"))    return "Edge";
  return ua.slice(0, 30) + "…";
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ActiveSessionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Sesiones de usuario ──────────────────────────────────────────────────
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: () => SessionManagementAPI.getActiveSessions(),
    refetchInterval: 30_000,
  });

  const sessions: ActiveSessionDto[] = (() => {
    const d = sessionsData as any;
    // { status:'success', data: { success:true, data:[...] } }  ← apiFetch wrapping
    if (d?.status === "success" && d?.data?.success && Array.isArray(d?.data?.data)) return d.data.data;
    // { status:'success', data:[...] }
    if (d?.status === "success" && Array.isArray(d?.data)) return d.data;
    // { success:true, data:[...] }
    if (d?.success && Array.isArray(d?.data)) return d.data;
    return [];
  })();

  const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);
  const [revokeAllUserId, setRevokeAllUserId] = useState<{ userId: string; email: string } | null>(null);

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => SessionManagementAPI.revokeSession(sessionId),
    onSuccess: (res) => {
      const d = (res as any)?.data ?? res;
      toast({
        title: "Sesión revocada",
        description: d?.message ?? "La sesión fue terminada exitosamente.",
      });
      qc.invalidateQueries({ queryKey: ["active-sessions"] });
      setRevokeSessionId(null);
    },
    onError: (err) => toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" }),
  });

  const revokeAllMutation = useMutation({
    mutationFn: (userId: string) => SessionManagementAPI.revokeAllUserSessions(userId),
    onSuccess: (res) => {
      const d = (res as any)?.data ?? res;
      toast({ title: "Sesiones revocadas", description: `${d?.revokedCount ?? "??"} sesión(es) terminadas.` });
      qc.invalidateQueries({ queryKey: ["active-sessions"] });
      setRevokeAllUserId(null);
    },
    onError: (err) => toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" }),
  });

  // ── Clientes API ─────────────────────────────────────────────────────────
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["active-api-clients"],
    queryFn: () => SessionManagementAPI.getApiClients(),
    refetchInterval: 60_000,
  });

  const clients: ActiveApiClientDto[] = (() => {
    const d = clientsData as any;
    if (d?.status === "success" && d?.data?.success && Array.isArray(d?.data?.data)) return d.data.data;
    if (d?.status === "success" && Array.isArray(d?.data)) return d.data;
    if (d?.success && Array.isArray(d?.data)) return d.data;
    return [];
  })();

  const [toggleClientId, setToggleClientId] = useState<ActiveApiClientDto | null>(null);
  const [rotateClientId, setRotateClientId] = useState<string | null>(null);
  const [rotateResult, setRotateResult]     = useState<RotateSecretResultDto | null>(null);
  const [secretCopied, setSecretCopied]     = useState(false);

  const toggleMutation = useMutation({
    mutationFn: (id: string) => SessionManagementAPI.toggleClient(id),
    onSuccess: (res) => {
      const d = (res as any)?.data ?? res;
      toast({ title: d?.isActive ? "Cliente activado" : "Cliente suspendido", description: d?.message });
      qc.invalidateQueries({ queryKey: ["active-api-clients"] });
      setToggleClientId(null);
    },
    onError: (err) => toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" }),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => SessionManagementAPI.rotateSecret(id),
    onSuccess: (res) => {
      const d = (res as any)?.data ?? res;
      setRotateResult(d);
      setRotateClientId(null);
      qc.invalidateQueries({ queryKey: ["active-api-clients"] });
    },
    onError: (err) => toast({ title: "Error", description: parseApiError(err).message, variant: "destructive" }),
  });

  const copySecret = () => {
    if (!rotateResult?.newClientSecret) return;
    navigator.clipboard.writeText(rotateResult.newClientSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestión de Sesiones Activas
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitorea y controla sesiones de usuarios y clientes API en tiempo real
          </p>
        </div>
        <Button variant="outline" onClick={() => { qc.invalidateQueries({ queryKey: ["active-sessions"] }); qc.invalidateQueries({ queryKey: ["active-api-clients"] }); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sesiones de usuarios
            {sessions.length > 0 && <Badge variant="secondary" className="ml-1">{sessions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Clientes API
            {clients.length > 0 && <Badge variant="secondary" className="ml-1">{clients.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab sesiones de usuario ────────────────────────────────────── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {sessionsLoading ? "Cargando..." : `${sessions.length} sesión(es) activa(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : sessions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No hay sesiones activas en este momento.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Navegador</TableHead>
                      <TableHead>Login</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>WS</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.sessionId}>
                        <TableCell>
                          <div className="font-medium">{s.email}</div>
                          {s.displayName && <div className="text-xs text-muted-foreground">{s.displayName}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.userType === "Local" ? "default" : "secondary"}>{s.userType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{s.ipAddress ?? "—"}</TableCell>
                        <TableCell className="text-sm">{shortenAgent(s.userAgent)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{fmtDate(s.loginAt)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{fmtDate(s.expiresAt)}</TableCell>
                        <TableCell>
                          {s.isWebSocketConnected
                            ? <Wifi className="h-4 w-4 text-green-500" title="WebSocket conectado" />
                            : <WifiOff className="h-4 w-4 text-muted-foreground" title="Sin WebSocket" />
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline" size="sm"
                              title="Revocar esta sesión"
                              onClick={() => setRevokeSessionId(s.sessionId)}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              title="Revocar todas las sesiones de este usuario"
                              onClick={() => setRevokeAllUserId({ userId: s.userId, email: s.email })}
                              className="text-destructive hover:text-destructive"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab clientes API ───────────────────────────────────────────── */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {clientsLoading ? "Cargando..." : `${clients.length} cliente(s) API registrado(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : clients.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No hay clientes API registrados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Client ID</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Llamadas 24h</TableHead>
                      <TableHead>Último uso</TableHead>
                      <TableHead>Secret rotado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">{c.clientId}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.isActive ? "default" : "destructive"}>
                            {c.isActive ? "Activo" : "Suspendido"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{c.callsLast24h}</Badge>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{fmtDate(c.lastUsedAt)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {c.secretRotatedAt ? fmtDate(c.secretRotatedAt) : <span className="italic text-muted-foreground">Nunca</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline" size="sm"
                              title={c.isActive ? "Suspender cliente" : "Activar cliente"}
                              onClick={() => setToggleClientId(c)}
                              className={c.isActive ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              title="Rotar secret"
                              onClick={() => setRotateClientId(c.id)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── AlertDialog: revocar sesión ─────────────────────────────────── */}
      <AlertDialog open={!!revokeSessionId} onOpenChange={() => setRevokeSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar esta sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              El usuario será desconectado inmediatamente si tiene WebSocket activo,
              o en su próxima petición si no está conectado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeSessionId && revokeMutation.mutate(revokeSessionId)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {revokeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revocar sesión"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: revocar todas las sesiones del usuario ────────── */}
      <AlertDialog open={!!revokeAllUserId} onOpenChange={() => setRevokeAllUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar TODAS las sesiones?</AlertDialogTitle>
            <AlertDialogDescription>
              Se revocarán todas las sesiones activas de <strong>{revokeAllUserId?.email}</strong>.
              El usuario deberá iniciar sesión nuevamente en todos sus dispositivos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeAllUserId && revokeAllMutation.mutate(revokeAllUserId.userId)}
              className="bg-destructive hover:bg-red-700"
            >
              {revokeAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revocar todas"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: toggle cliente API ────────────────────────────── */}
      <AlertDialog open={!!toggleClientId} onOpenChange={() => setToggleClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleClientId?.isActive ? "¿Suspender cliente API?" : "¿Activar cliente API?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleClientId?.isActive
                ? `El cliente "${toggleClientId?.name}" será suspendido. Todos sus tokens actuales serán rechazados de inmediato.`
                : `El cliente "${toggleClientId?.name}" volverá a ser funcional con su secret actual.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleClientId && toggleMutation.mutate(toggleClientId.id)}
              className={toggleClientId?.isActive ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}
            >
              {toggleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (toggleClientId?.isActive ? "Suspender" : "Activar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: confirmar rotación de secret ───────────────────── */}
      <AlertDialog open={!!rotateClientId} onOpenChange={() => setRotateClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rotar el ClientSecret?</AlertDialogTitle>
            <AlertDialogDescription>
              Se generará un nuevo secret aleatorio. <strong>El secret actual dejará de funcionar
              inmediatamente.</strong> El nuevo secret se mostrará una sola vez — guárdelo en un lugar seguro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rotateClientId && rotateMutation.mutate(rotateClientId)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {rotateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rotar secret"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: mostrar nuevo secret ────────────────────────────────── */}
      <Dialog open={!!rotateResult} onOpenChange={() => setRotateResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              Nuevo ClientSecret generado
            </DialogTitle>
            <DialogDescription>
              Guarde este valor ahora — no se volverá a mostrar.
              <br />
              Cliente: <strong>{rotateResult?.clientId}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-3">
              <code className="flex-1 text-sm font-mono break-all select-all">
                {rotateResult?.newClientSecret}
              </code>
              <Button variant="ghost" size="sm" onClick={copySecret} className="shrink-0">
                {secretCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Rotado el {rotateResult ? fmtDate(rotateResult.rotatedAt) : "—"}
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setRotateResult(null)} className="w-full">
              Ya lo guardé, cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
