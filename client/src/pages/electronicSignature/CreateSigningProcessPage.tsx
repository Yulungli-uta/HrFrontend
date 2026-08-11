// src/pages/electronicSignature/CreateSigningProcessPage.tsx
import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, FileText, Loader2, Trash2, UserPlus, Users, UploadCloud, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmployeeCombobox } from "@/components/ui/EmployeeCombobox";
import { DocumentsAPI, SignatureProcessesAPI } from "@/lib/api";

type Signer = {
  tempId: string;
  employeeId?: number;
  identification: string;
  fullName: string;
  email: string;
  /** de dónde salió el correo prellenado — solo informativo, el campo sigue editable */
  emailSource: "INSTITUCIONAL" | "PERSONAL" | "MANUAL";
  source: "RH" | "EXTERNO";
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const emptyExternal = { identification: "", fullName: "", email: "" };

export default function CreateSigningProcessPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [workflow, setWorkflow] = useState<"UNORDERED" | "SEQUENTIAL">("UNORDERED");
  const [signers, setSigners] = useState<Signer[]>([]);
  const [externalOpen, setExternalOpen] = useState(false);
  const [externalForm, setExternalForm] = useState(emptyExternal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const alreadyAdded = (identification: string) =>
    signers.some((s) => s.identification === identification.trim());

  const addFromHr = (employeeId: number, emp: any) => {
    const identification: string = emp.idCard ?? emp.IDCard ?? "";
    if (alreadyAdded(identification)) {
      setError(`${emp.fullName} ya está en la lista de firmantes.`);
      return;
    }
    const institutional: string = (emp.email ?? "").trim();
    const personal: string = (emp.personnelEmail ?? "").trim();
    const email = institutional || personal;
    const emailSource: Signer["emailSource"] = institutional ? "INSTITUCIONAL" : personal ? "PERSONAL" : "MANUAL";
    setError("");
    setSigners((prev) => [
      ...prev,
      {
        tempId: `emp-${employeeId}-${Date.now()}`,
        employeeId,
        identification,
        fullName: emp.fullName,
        email,
        emailSource,
        source: "RH",
      },
    ]);
  };

  const addExternal = () => {
    const { identification, fullName, email } = externalForm;
    if (!identification.trim() || !fullName.trim() || !email.trim()) return;
    if (alreadyAdded(identification)) {
      setError("Ese número de identificación ya está en la lista de firmantes.");
      return;
    }
    setError("");
    setSigners((prev) => [
      ...prev,
      {
        tempId: `external-${Date.now()}`,
        identification: identification.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        emailSource: "MANUAL",
        source: "EXTERNO",
      },
    ]);
    setExternalForm(emptyExternal);
    setExternalOpen(false);
  };

  const removeSigner = (tempId: string) => setSigners((prev) => prev.filter((s) => s.tempId !== tempId));

  const updateEmail = (tempId: string, email: string) =>
    setSigners((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, email, emailSource: "MANUAL" } : s)));

  const moveSigner = (index: number, direction: -1 | 1) => {
    setSigners((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const submit = async () => {
    if (!file || file.type !== "application/pdf") {
      setError("Seleccione un documento PDF.");
      return;
    }
    if (!title.trim()) {
      setError("Ingrese un título para el proceso.");
      return;
    }
    if (signers.length === 0) {
      setError("Agregue al menos un firmante.");
      return;
    }
    if (signers.some((s) => !s.email.trim())) {
      setError("Todos los firmantes necesitan un correo de notificación.");
      return;
    }

    setBusy(true);
    setError("");
    const reference = crypto.randomUUID();
    const upload = await DocumentsAPI.uploadSingle({
      directoryCode: import.meta.env.VITE_SIGNATURE_DIRECTORY_CODE || "SIGNATURE",
      entityType: "SIGNING_PROCESS",
      entityId: reference,
      relativePath: "requests",
      file,
      documentTypeId: "",
    });
    if (upload.status === "error") {
      setError(upload.error.message);
      setBusy(false);
      return;
    }
    const stored = upload.data.items.find((x) => x.success)?.storedFile;
    if (!stored) {
      setError(upload.data.message || "No se pudo almacenar el documento.");
      setBusy(false);
      return;
    }
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");

    const created = await SignatureProcessesAPI.create({
      source: { system: "UTA-PORTAL", module: "ELECTRONIC_SIGNATURE", entityType: "SIGNING_PROCESS", entityId: reference },
      document: { fileGuid: stored.fileGuid, fileName: file.name, sha256 },
      process: { title, description: description.trim() || undefined, workflowType: workflow, minimumRequiredSignatures: signers.length, notifyOnCreate },
      signers: signers.map((s, i) => ({
        employeeId: s.employeeId,
        identification: s.identification,
        fullName: s.fullName,
        email: s.email,
        role: "SIGNER",
        required: true,
        order: workflow === "SEQUENTIAL" ? i + 1 : undefined,
        isExternal: s.source === "EXTERNO",
      })),
    });
    setBusy(false);
    if (created.status === "error") {
      setError(created.error.message);
      return;
    }
    // El QueryClient global usa staleTime:Infinity (para no refrescar de mas en toda la
    // app), asi que sin esto la lista de "Procesos de firma" se queda con la version en
    // cache de antes de crear este proceso hasta que el usuario refresque a mano.
    queryClient.invalidateQueries({ queryKey: ["signature-processes"] });
    const data = created.data as { processId: number };
    navigate(`/signatures/processes/${data.processId}`);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Crear proceso de firma</h1>
        <p className="text-sm text-muted-foreground">
          Sube el documento, define quién debe firmarlo y en qué orden.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Documento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Contrato de servicios profesionales" />
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto adicional que se incluirá en el correo de notificación a los firmantes."
              rows={3}
            />
          </div>

          <div>
            <Label>Documento PDF *</Label>
            <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 text-sm hover:bg-muted/40">
              <UploadCloud className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className={file ? "font-medium" : "text-muted-foreground"}>
                {file ? file.name : "Seleccionar archivo PDF..."}
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div>
            <Label>Flujo de firma</Label>
            <Select value={workflow} onValueChange={(v) => setWorkflow(v as typeof workflow)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNORDERED">Sin orden — todos pueden firmar en cualquier momento</SelectItem>
                <SelectItem value="SEQUENTIAL">Secuencial — firman uno tras otro, en el orden de la lista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="notify-on-create" checked={notifyOnCreate} onCheckedChange={(v) => setNotifyOnCreate(v === true)} />
            <Label htmlFor="notify-on-create" className="cursor-pointer font-normal">
              Enviar correo de notificación a los firmantes al crear el proceso
            </Label>
          </div>
          {!notifyOnCreate && (
            <p className="text-xs text-muted-foreground">
              El proceso se creará sin notificar. Usa "Enviar correo a pendientes" en el detalle del proceso cuando quieras avisarles.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Firmantes a notificar
            </CardTitle>
            <Badge variant="secondary">{signers.length}</Badge>
          </div>
          <CardDescription>
            Cada persona agregada aquí recibirá una notificación para firmar el documento
            {workflow === "SEQUENTIAL" ? ", respetando el orden de la lista." : "."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Label>Buscar en el sistema de RH</Label>
              <EmployeeCombobox value={null} onSelect={() => {}} onSelectEmployee={(emp) => addFromHr(emp.employeeID ?? emp.employeeId, emp)} />
            </div>
            <Button type="button" variant="outline" onClick={() => setExternalOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Firmante externo
            </Button>
          </div>

          {signers.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              Aún no hay firmantes. Búscalos en RH o agrégalos como externos.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {workflow === "SEQUENTIAL" && <TableHead className="w-16">Orden</TableHead>}
                    <TableHead>Firmante</TableHead>
                    <TableHead>Correo de notificación</TableHead>
                    <TableHead className="w-24">Origen</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signers.map((s, i) => (
                    <TableRow key={s.tempId}>
                      {workflow === "SEQUENTIAL" && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                aria-label="Subir orden"
                                disabled={i === 0}
                                onClick={() => moveSigner(i, -1)}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                aria-label="Bajar orden"
                                disabled={i === signers.length - 1}
                                onClick={() => moveSigner(i, 1)}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{initials(s.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{s.fullName}</p>
                            <p className="text-xs text-muted-foreground">{s.identification}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="email"
                          value={s.email}
                          onChange={(e) => updateEmail(s.tempId, e.target.value)}
                          placeholder="correo@uta.edu.ec"
                          className="h-8"
                        />
                        {s.emailSource === "PERSONAL" && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                            <TriangleAlert className="h-3 w-3 shrink-0" />
                            Sin correo institucional — se notificará al personal.
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.source === "RH" ? "secondary" : "outline"} className="text-xs">
                          {s.source === "RH" ? "RH" : "Externo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeSigner(s.tempId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button disabled={busy} onClick={submit}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {busy ? "Creando proceso..." : "Crear proceso de firma"}
        </Button>
      </div>

      <Dialog open={externalOpen} onOpenChange={setExternalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar firmante externo</DialogTitle>
            <DialogDescription>
              Para personas que no están registradas en el sistema de RH (ej. asesores externos).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Identificación *</Label>
              <Input
                value={externalForm.identification}
                onChange={(e) => setExternalForm((f) => ({ ...f, identification: e.target.value }))}
              />
            </div>
            <div>
              <Label>Nombre completo *</Label>
              <Input
                value={externalForm.fullName}
                onChange={(e) => setExternalForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Correo *</Label>
              <Input
                type="email"
                value={externalForm.email}
                onChange={(e) => setExternalForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalOpen(false)}>Cancelar</Button>
            <Button
              onClick={addExternal}
              disabled={!externalForm.identification.trim() || !externalForm.fullName.trim() || !externalForm.email.trim()}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
