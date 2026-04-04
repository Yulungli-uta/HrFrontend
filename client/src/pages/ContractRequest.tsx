// src/pages/ContractRequest.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { FileText, Plus, Search, Calendar, Eye } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { useContractRequest } from "@/hooks/contractRequest/useContractRequests";

import type { ContractRequestCreate, UIContractRequest } from "@/types/contractRequest";
import { ContractRequestForm } from "@/components/contractRequest/ContractRequestForm";
import { AttachmentSection } from "@/components/contractRequest/AttachmentSection";

import {
  CONTRACT_REQUEST_DIRECTORY_CODE as DIRECTORY_CODE,
  CONTRACT_REQUEST_ENTITY_TYPE as ENTITY_TYPE,
} from "@/features/constants";

import type { ReusableDocumentManagerHandle } from "@/components/ReusableDocumentManager";
import { parseApiError } from '@/lib/error-handling';

export default function ContractRequestPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, employeeDetails } = useAuth();

  const ctxCreatedBy = Number.isFinite(Number(employeeDetails?.employeeID))
    ? Number(employeeDetails?.employeeID)
    : (Number.isFinite(Number(user?.id)) ? Number(user?.id) : 0);

  const cr = useContractRequest(DIRECTORY_CODE);
  const { contracts, listQ, createMut, directoryUi } = cr;

  const accept = directoryUi.accept ?? "*/*";
  const maxSizeMB = directoryUi.maxSizeMB ?? 20;
  const relativePath = directoryUi.relativePath ?? "";

  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selected, setSelected] = useState<UIContractRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Create form
  const [form, setForm] = useState<ContractRequestCreate>({
    workModalityId: null,
    departmentId: null,
    numberOfPeopleToHire: 1, // ✅ inicia en 1
    numberHour: 0,
    observation: "",
    status: null, // ✅ se asigna por defecto desde catálogo ("GENERADO")
    createdBy: ctxCreatedBy,
  });

  // ✅ Estado por defecto: "GENERADO" (desde catálogo CONTRACT_REQUEST_STATUS)
  useEffect(() => {
    // no sobreescribir si el usuario ya seleccionó algo
    if (form.status != null) return;

    const generated = cr.statuses.find(
      (s) => (s.name ?? "").trim().toUpperCase() === "GENERADO"
    );

    if (generated?.id) {
      setForm((prev) => ({ ...prev, status: generated.id }));
    }
  }, [cr.statuses, form.status]);

  const [attachEnabled, setAttachEnabled] = useState(false);
  const createDocsRef = useRef<ReusableDocumentManagerHandle | null>(null);
  const detailDocsRef = useRef<ReusableDocumentManagerHandle | null>(null);

  const resetForm = () => {
    setForm({
      workModalityId: null,
      departmentId: null,
      numberOfPeopleToHire: 1,
      numberHour: 0,
      observation: "",
      status: null, // ✅ vuelve a default por efecto ("GENERADO")
      createdBy: ctxCreatedBy,
    });
    setAttachEnabled(false);
    createDocsRef.current?.clearSelected();
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return contracts;

    return contracts.filter((c) => {
      const modalityName = c.workModalityId
        ? (cr.workModalityNameById.get(c.workModalityId) ?? "")
        : "";
      const deptName = c.departmentId
        ? (cr.departmentNameById.get(c.departmentId) ?? "")
        : "";

      const hay = [
        `#${c.requestId}`,
        modalityName,
        deptName,
        String(c.numberOfPeopleToHire),
        String(c.numberHour),
        String(c.totalPeopleHired),
        c.statusText,
        c.observation ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [contracts, searchTerm, cr.workModalityNameById, cr.departmentNameById]);

  const openDetails = (c: UIContractRequest) => {
    setSelected(c);
    setIsDetailOpen(true);
    setTimeout(() => detailDocsRef.current?.refresh(c.requestId), 0);
  };

  const handleCreate = async () => {
    if (!ctxCreatedBy || ctxCreatedBy <= 0) {
      toast({
        title: "❌ Usuario inválido",
        description: "No se pudo determinar el solicitante.",
        variant: "destructive",
      });
      return;
    }

    if (!form.workModalityId) {
      toast({
        title: "❌ Campo requerido",
        description: "Seleccione la modalidad de trabajo.",
        variant: "destructive",
      });
      return;
    }

    if (!form.departmentId) {
      toast({
        title: "❌ Campo requerido",
        description: "Seleccione el departamento.",
        variant: "destructive",
      });
      return;
    }

    if (form.status == null) {
      toast({
        title: "❌ Campo requerido",
        description: "Seleccione el estado.",
        variant: "destructive",
      });
      return;
    }

    if (Number(form.numberOfPeopleToHire) < 1) {
      toast({
        title: "❌ Valor inválido",
        description: "El número de personas debe ser ≥ 1.",
        variant: "destructive",
      });
      return;
    }

    if (Number(form.numberHour) < 0) {
      toast({
        title: "❌ Valor inválido",
        description: "Las horas no pueden ser negativas.",
        variant: "destructive",
      });
      return;
    }

    const payload: ContractRequestCreate = {
      ...form,
      createdBy: ctxCreatedBy,
      numberOfPeopleToHire: Math.max(1, Number(form.numberOfPeopleToHire || 1)),
      numberHour: Math.max(0, Number(form.numberHour || 0)),
      observation: (form.observation ?? "").trim() || undefined,
    };

    try {
      const { id, resp } = await createMut.mutateAsync(payload);

      if (resp.status !== "success") {
        toast({
          title: "❌ Error",
          description: resp.error.message,
          variant: "destructive",
        });
        return;
      }

      qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });

      // Adjuntos opcionales: crear -> subir
      const count = createDocsRef.current?.getSelectedCount() ?? 0;
      if (attachEnabled && id && count > 0) {
        const up = await createDocsRef.current?.uploadAll(id);
        if (!up || (up as any).status === "error") {
          toast({
            title: "⚠️ Creado con advertencia",
            description: "Se creó la solicitud pero falló la subida. Puedes reintentar en Detalles.",
            variant: "destructive",
          });
        }
      }

      toast({ title: "✅ Solicitud creada", description: "Se guardó correctamente." });
      setIsFormOpen(false);
      resetForm();
    } catch (e: unknown) {
      toast({ title: "❌ Error", description: parseApiError(e).message, variant: "destructive" });
    }
  };

  const handleUploadDetail = async () => {
    if (!selected) return;

    const count = detailDocsRef.current?.getSelectedCount() ?? 0;
    if (count <= 0) {
      toast({ title: "Sin archivos", description: "No hay archivos seleccionados para subir." });
      return;
    }

    const up = await detailDocsRef.current?.uploadAll(selected.requestId);
    if (!up || (up as any).status === "error") {
      toast({ title: "❌ Error", description: "No se pudieron subir los documentos.", variant: "destructive" });
      return;
    }

    toast({ title: "✅ Documentos subidos", description: "Se subieron correctamente." });
    await detailDocsRef.current?.refresh(selected.requestId);
  };

  if (listQ.isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <Card>
          <CardContent className="pt-6">Cargando...</CardContent>
        </Card>
      </div>
    );
  }

  if (listQ.error || listQ.data?.status === "error") {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            Error al cargar. {listQ.data?.status === "error" ? listQ.data.error.message : "Intente nuevamente."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const formDisabled = createMut.isPending;

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            Solicitud de Contrato
          </h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">Gestión de solicitudes</p>
        </div>

        <Dialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 w-full lg:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Solicitud
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Solicitud</DialogTitle>
              <DialogDescription>Campos alineados a HR.tbl_contractRequest.</DialogDescription>
            </DialogHeader>

            <ContractRequestForm
              value={form}
              onChange={setForm}
              workModalities={cr.workModalities}
              departments={cr.departments}
              statuses={cr.statuses}
              disabled={formDisabled}
            />

            <div className="mt-6">
              <AttachmentSection
                ref={createDocsRef}
                enabled={attachEnabled}
                onEnabledChange={setAttachEnabled}
                label="Documentos de la Solicitud"
                directoryCode={DIRECTORY_CODE}
                entityType={ENTITY_TYPE}
                entityReady={false}
                accept={accept}
                maxSizeMB={maxSizeMB}
                relativePath={relativePath}
                disabled={formDisabled || cr.directoryQ.isLoading}
                showUploadButton={false}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 justify-end">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={formDisabled}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={formDisabled} className="bg-primary hover:bg-primary/90">
                {formDisabled ? "Guardando..." : "Guardar Solicitud"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, modalidad, departamento, observación o estado..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
          <CardDescription>{filtered.length} mostradas</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Personas</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Contratadas</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((c) => {
                  const modality = c.workModalityId
                    ? (cr.workModalityNameById.get(c.workModalityId) ?? `#${c.workModalityId}`)
                    : "—";

                  const dept = c.departmentId
                    ? (cr.departmentNameById.get(c.departmentId) ?? `#${c.departmentId}`)
                    : "—";

                  return (
                    <TableRow key={c.requestId}>
                      <TableCell className="font-mono">#{c.requestId}</TableCell>
                      <TableCell>{modality}</TableCell>
                      <TableCell>{dept}</TableCell>
                      <TableCell>{c.numberOfPeopleToHire}</TableCell>
                      <TableCell>{Number(c.numberHour).toFixed(2)}</TableCell>
                      <TableCell>{c.totalPeopleHired}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.statusVariant}>{c.statusText}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openDetails(c)}>
                          <Eye className="h-3 w-3 mr-1" /> Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="text-center py-10 text-sm text-muted-foreground">
                        No hay solicitudes para mostrar.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles</DialogTitle>
            <DialogDescription>Información + documentos</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-2 text-sm">
                  <div>
                    <b>ID:</b> #{selected.requestId}
                  </div>
                  <div>
                    <b>Modalidad:</b>{" "}
                    {selected.workModalityId
                      ? (cr.workModalityNameById.get(selected.workModalityId) ?? `#${selected.workModalityId}`)
                      : "—"}
                  </div>
                  <div>
                    <b>Departamento:</b>{" "}
                    {selected.departmentId
                      ? (cr.departmentNameById.get(selected.departmentId) ?? `#${selected.departmentId}`)
                      : "—"}
                  </div>
                  <div>
                    <b>Personas a contratar:</b> {selected.numberOfPeopleToHire}
                  </div>
                  <div>
                    <b>Horas:</b> {Number(selected.numberHour).toFixed(2)}
                  </div>
                  <div>
                    <b>Observación:</b> {selected.observation ?? "—"}
                  </div>
                  <div>
                    <b>Estado:</b> <Badge variant={selected.statusVariant}>{selected.statusText}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">Documentos</CardTitle>
                      <CardDescription className="text-xs">directoryCode: {DIRECTORY_CODE}</CardDescription>
                    </div>
                    <Button variant="outline" onClick={handleUploadDetail}>
                      Subir seleccionados
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <AttachmentSection
                    ref={detailDocsRef}
                    enabled={true}
                    onEnabledChange={() => void 0}
                    label="Documentos"
                    directoryCode={DIRECTORY_CODE}
                    entityType={ENTITY_TYPE}
                    entityId={selected.requestId}
                    entityReady={true}
                    accept={accept}
                    maxSizeMB={maxSizeMB}
                    relativePath={relativePath}
                    disabled={cr.directoryQ.isLoading}
                    showUploadButton={false}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
