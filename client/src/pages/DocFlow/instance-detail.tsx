import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/docflow/status-badge";
import {
  ArrowLeft,
  FileText,
  Upload,
  ArrowRightLeft,
  RotateCcw,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  History,
  Send,
  Undo2,
  Info,
  User,
  Calendar,
  Hash,
  AlertCircle,
  Globe,
  Lock,
  Eye,
  Loader2,
  ShieldAlert,
  Building2,
  GitBranch,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import type { IDocflowService } from "@/services/docflow/docflow-service.interface";
import { formatDate, formatDateTime, formatFileSize, formatExpedienteCode } from "@/lib/docflow/formatters";
import { DirectorySelect } from "@/components/docflow/directory-select";
import { DocumentThumbnail } from "@/components/docflow/document-thumbnail";
import { useToast } from "@/hooks/use-toast";
import type { DocflowDocument, WorkflowInstance, InstancePermissions, DynamicFieldSchema } from "@/types/docflow/docflow.types";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatFieldValue(value: any, fieldSchema?: DynamicFieldSchema): string {
  if (value === null || value === undefined) return "—";

  const type = fieldSchema?.type;

  if (type === "boolean" || typeof value === "boolean") {
    return value === true || value === "true" ? "Sí" : "No";
  }

  if (type === "date") {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    }
  }

  if (type === "number" || typeof value === "number") {
    const num = typeof value === "number" ? value : Number(value);
    if (!isNaN(num)) return num.toLocaleString("es-ES");
  }

  return String(value);
}

function MetadataDisplay({ metadata, schema }: { metadata: Record<string, any> | null; schema?: DynamicFieldSchema[] }) {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  const schemaMap = new Map(schema?.map((f) => [f.name, f]) || []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Object.entries(metadata).map(([key, value]) => {
        const fieldSchema = schemaMap.get(key);
        return (
          <div key={key} className="flex flex-col gap-1 p-3 rounded-md bg-muted/50">
            <span className="text-xs text-muted-foreground">
              {formatFieldLabel(key)}
            </span>
            <span className="text-sm font-medium" data-testid={`text-meta-${key}`}>
              {formatFieldValue(value, fieldSchema)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VisibilityBadge({ visibility, deptName }: { visibility: import("@/types/docflow/docflow.types").DocumentVisibility; deptName?: string }) {
  const isPublic = visibility === "PUBLIC_WITHIN_CASE";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`text-xs gap-1 ${
            isPublic
              ? "border-success/40 text-success dark:border-success/60 dark:text-success/80"
              : "border-amber-300 text-warning dark:border-amber-700 dark:text-amber-400"
          }`}
          data-testid={`badge-visibility-${isPublic ? "public" : "private"}`}
        >
          {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          <span className="hidden sm:inline">{isPublic ? "Publico" : "Privado"}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {isPublic
          ? "Visible para todos los participantes del expediente"
          : `Visible solo para ${deptName || "el departamento que lo cargo"}`}
      </TooltipContent>
    </Tooltip>
  );
}

function DocumentsTab({ instanceId, processId, service, permissions }: { instanceId: string | number; processId: number; service: IDocflowService; permissions: InstancePermissions }) {
  const [selectedDoc, setSelectedDoc] = useState<DocflowDocument | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingRuleId, setUploadingRuleId] = useState<number | null>(null);

  const handleDownload = async (doc: DocflowDocument) => {
    const versions = service.getVersionsByDocument(doc.documentId);
    const latestVersion = versions[0];
    if (!latestVersion) {
      toast({ title: "Sin versiones", description: "Este documento no tiene archivos disponibles", variant: "destructive" });
      return;
    }
    setDownloadingId(String(doc.documentId));
    try {
      const blob = await service.downloadVersion(latestVersion.versionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title}${latestVersion.fileExtension || ""}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Error de descarga", description: "No se pudo descargar el archivo", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (doc: DocflowDocument) => {
    const versions = service.getVersionsByDocument(doc.documentId);
    const latestVersion = versions[0];
    if (!latestVersion) {
      toast({ title: "Sin versiones", description: "Este documento no tiene archivos disponibles", variant: "destructive" });
      return;
    }
    try {
      const previewUrl = await service.previewVersion(latestVersion.versionId);
      window.open(previewUrl, "_blank");
    } catch {
      toast({ title: "Error de preview", description: "No se pudo abrir la vista previa", variant: "destructive" });
    }
  };

  const handleUploadForRule = (ruleId: number) => {
    setUploadingRuleId(ruleId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingRuleId === null) return;

    const groupedCompletion = service.getGroupedRuleCompletion(instanceId, processId);
    const allRuleData = groupedCompletion.flatMap(g => g.rules);
    const ruleData = allRuleData.find(r => r.rule.ruleId === uploadingRuleId);
    if (!ruleData) return;

    const docName = file.name.replace(/\.[^/.]+$/, "");

    try {
      await Promise.resolve(
        service.createDocument({
          instanceId,
          ruleId: uploadingRuleId,
          title: ruleData.docs.length > 0
            ? `${ruleData.rule.docTypeName} v${ruleData.uploaded + 1}`
            : docName,
          visibility: ruleData.rule.defaultVisibility === 2 ? "PRIVATE_TO_UPLOADER_DEPT" : "PUBLIC_WITHIN_CASE",
        })
      );
      toast({
        title: ruleData.docs.length > 0 ? "Nueva version subida" : "Documento subido",
        description: `Archivo registrado en "${ruleData.rule.docTypeName}" (${ruleData.uploaded + 1}/${ruleData.rule.maxFiles})`,
      });
    } catch {
      toast({ title: "Error al subir", description: "No se pudo registrar el documento", variant: "destructive" });
    } finally {
      setUploadingRuleId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const groupedCompletion = service.getGroupedRuleCompletion(instanceId, processId);
  const hasMultipleGroups = groupedCompletion.length > 1;

  const allRules = groupedCompletion.flatMap(g => g.rules);
  const mandatoryRules = allRules.filter(r => r.rule.isMandatory);
  const mandatoryComplete = mandatoryRules.filter(r => r.isComplete).length;
  const totalComplete = allRules.filter(r => r.isComplete).length;
  const totalRules = allRules.length;
  const progressPercent = totalRules > 0 ? Math.round((totalComplete / totalRules) * 100) : 0;
  const allMandatoryDone = mandatoryRules.length === mandatoryComplete;

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
        data-testid="input-hidden-file-upload"
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Documentos del Expediente
              {hasMultipleGroups && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                  {groupedCompletion.length} subprocesos
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {allMandatoryDone ? (
                <Badge className="bg-success/15 text-success border-success/40 dark:text-success/80 dark:border-success/60" data-testid="badge-mandatory-status">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Obligatorios completos
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1" data-testid="badge-mandatory-status">
                  <AlertCircle className="h-3 w-3" />
                  {mandatoryRules.length - mandatoryComplete} obligatorio{mandatoryRules.length - mandatoryComplete !== 1 ? "s" : ""} pendiente{mandatoryRules.length - mandatoryComplete !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
          {totalRules > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>{totalComplete} de {totalRules} requisitos cumplidos</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden" data-testid="progress-bar-rules">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPercent === 100
                      ? "bg-success"
                      : progressPercent >= 50
                        ? "bg-amber-500 dark:bg-amber-400"
                        : "bg-destructive"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {totalRules === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3" />
              <p className="text-base font-medium">Sin requisitos</p>
              <p className="text-sm mt-1">Este proceso no tiene reglas documentales configuradas</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groupedCompletion.map((group) => {
                const groupMandatory = group.rules.filter(r => r.rule.isMandatory);
                const groupMandatoryDone = groupMandatory.filter(r => r.isComplete).length;
                const groupComplete = group.rules.filter(r => r.isComplete).length;
                const groupTotal = group.rules.length;

                return (
                  <div key={group.processId} data-testid={`process-group-${group.processId}`}>
                    {hasMultipleGroups && (
                      <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${
                        group.isCurrentProcess ? "border-primary/30" : "border-border"
                      }`}>
                        <div className={`flex h-6 w-6 items-center justify-center rounded ${
                          group.isCurrentProcess
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <GitBranch className="h-3.5 w-3.5" />
                        </div>
                        <span className={`text-sm font-medium ${
                          group.isCurrentProcess ? "text-primary" : ""
                        }`}>
                          {group.processName}
                        </span>
                        {group.isCurrentProcess && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary">
                            Actual
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {groupComplete}/{groupTotal}
                          {groupMandatory.length > 0 && (
                            <span className={groupMandatoryDone === groupMandatory.length
                              ? " text-success dark:text-success/80"
                              : " text-destructive dark:text-destructive/80"
                            }>
                              {" "}({groupMandatoryDone}/{groupMandatory.length} oblig.)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      {group.rules.map(({ rule, uploaded, isComplete, docs }) => {
                        const canUploadHere = permissions.canUploadDocuments && group.isCurrentProcess && uploaded < rule.maxFiles;

                        return (
                          <div
                            key={rule.ruleId}
                            className={`group/rule relative rounded-lg border transition-colors ${
                              isComplete
                                ? "border-success/30 bg-success/10/50"
                                : rule.isMandatory
                                  ? "border-destructive/30 bg-destructive/10/50 dark:border-red-800/40"
                                  : "border-warning/30 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20"
                            }`}
                            data-testid={`rule-completion-${rule.ruleId}`}
                          >
                            <div className="flex items-start gap-3 p-3">
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5 ${
                                isComplete
                                  ? "bg-success dark:bg-success"
                                  : rule.isMandatory
                                    ? "bg-destructive/15 dark:bg-red-900/40 border-2 border-destructive/40"
                                    : "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-600"
                              }`}>
                                {isComplete ? (
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                ) : rule.isMandatory ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-destructive dark:text-destructive/80" />
                                ) : (
                                  <Circle className="h-3.5 w-3.5 text-warning dark:text-amber-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-medium ${
                                    isComplete ? "text-success" : ""
                                  }`}>
                                    {rule.docTypeName}
                                  </span>
                                  {rule.isMandatory ? (
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 font-semibold ${
                                      isComplete
                                        ? "border-success/40 text-success dark:border-success/60 dark:text-success/80"
                                        : "border-destructive/40 text-destructive dark:border-destructive/60 dark:text-destructive/80"
                                    }`}>
                                      Obligatorio
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                                      Opcional
                                    </Badge>
                                  )}
                                  {!group.isCurrentProcess && isComplete && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-300 text-primary dark:border-blue-700 dark:text-primary/70">
                                      Otro subproceso
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {uploaded} de {rule.minFiles} min. — max. {rule.maxFiles} archivo{rule.maxFiles !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/rule:opacity-100 transition-opacity shrink-0">
                                {canUploadHere && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleUploadForRule(rule.ruleId)}
                                        data-testid={`button-upload-rule-${rule.ruleId}`}
                                      >
                                        {uploadingRuleId === rule.ruleId ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Upload className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {docs.length > 0 ? "Subir nueva version" : "Subir archivo"}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>

                            {docs.length > 0 && (
                              <div className="px-3 pb-3 pt-0 ml-10 flex flex-col gap-1.5 border-t border-inherit mt-0 pt-2">
                                {docs.map((doc) => {
                                  const docVersions = service.getVersionsByDocument(doc.documentId);
                                  const latestExt = docVersions[0]?.fileExtension || null;

                                  return (
                                  <div
                                    key={doc.documentId}
                                    className="group/doc flex items-start gap-3 p-2 rounded-md hover:bg-black/5 dark:hover:bg-card/5 transition-colors"
                                    data-testid={`card-document-${doc.documentId}`}
                                  >
                                    <DocumentThumbnail
                                      documentId={doc.documentId}
                                      fileExtension={latestExt}
                                      title={doc.title}
                                      onClick={() => handlePreview(doc)}
                                    />
                                    <div className="flex-1 min-w-0 pt-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium truncate">{doc.title}</span>
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5 text-muted-foreground shrink-0">
                                          v{doc.currentVersion}
                                        </Badge>
                                        <VisibilityBadge visibility={doc.visibility} deptName={doc.uploaderDeptName} />
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        <p className="text-[11px] text-muted-foreground">{formatDate(doc.createdAt)}</p>
                                        {latestExt && (
                                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 uppercase">
                                            {latestExt.replace(/^\./, "")}
                                          </Badge>
                                        )}
                                        {doc.visibility === "PRIVATE_TO_UPLOADER_DEPT" && doc.uploaderDeptName && (
                                          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0 rounded bg-amber-100/80 text-warning dark:bg-amber-900/30 dark:text-amber-400" data-testid={`text-dept-doc-${doc.documentId}`}>
                                            <Building2 className="h-2.5 w-2.5" />
                                            Solo {doc.uploaderDeptName}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/doc:opacity-100 transition-opacity shrink-0">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => setSelectedDoc(doc)}
                                            data-testid={`button-versions-doc-${doc.documentId}`}
                                          >
                                            <History className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Ver historial de versiones</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handlePreview(doc)}
                                            data-testid={`button-preview-doc-${doc.documentId}`}
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Previsualizar documento</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            disabled={String(downloadingId) === String(doc.documentId)}
                                            onClick={() => handleDownload(doc)}
                                            data-testid={`button-download-doc-${doc.documentId}`}
                                          >
                                            {String(downloadingId) === String(doc.documentId) ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                              <Download className="h-3.5 w-3.5" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Descargar archivo</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            )}

                            {!isComplete && uploaded === 0 && (
                              <div className="px-3 pb-3 ml-10">
                                <p className={`text-xs flex items-center gap-1 ${
                                  rule.isMandatory ? "text-destructive dark:text-destructive/80" : "text-warning dark:text-amber-400"
                                }`}>
                                  <Upload className="h-3 w-3" />
                                  Pendiente de carga
                                  {canUploadHere && (
                                    <span className="text-muted-foreground ml-1">— pasa el cursor para subir</span>
                                  )}
                                </p>
                              </div>
                            )}
                            {!isComplete && uploaded > 0 && (
                              <div className="px-3 pb-3 ml-10">
                                <p className="text-xs text-warning dark:text-amber-400 flex items-center gap-1">
                                  <Upload className="h-3 w-3" />
                                  Faltan {rule.minFiles - uploaded} archivo{(rule.minFiles - uploaded) !== 1 ? "s" : ""}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.title}</DialogTitle>
            <DialogDescription>
              {selectedDoc?.internalDescription || "Historial de versiones del documento"}
            </DialogDescription>
          </DialogHeader>
          {selectedDoc && <VersionHistory documentId={selectedDoc.documentId} service={service} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VersionHistory({ documentId, service }: { documentId: string | number; service: IDocflowService }) {
  const versions = service.getVersionsByDocument(documentId);

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Sin versiones registradas
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
      {versions.map((v, idx) => (
        <div
          key={v.versionId}
          className={`flex items-start gap-3 p-3 rounded-md ${idx === 0 ? "bg-primary/5 border border-primary/20" : "border border-border"}`}
          data-testid={`version-${v.versionId}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <span className="text-xs font-semibold">v{v.versionNumber}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">
                Version {v.versionNumber}
              </span>
              {idx === 0 && (
                <Badge variant="secondary" className="text-xs">Actual</Badge>
              )}
              {v.fileExtension && (
                <Badge variant="outline" className="text-xs">
                  {v.fileExtension}
                </Badge>
              )}
            </div>
            {v.changeLog && (
              <p className="text-xs text-muted-foreground mt-1">{v.changeLog}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{v.createdByName}</span>
              <span>{formatDateTime(v.createdAt)}</span>
              {v.fileSizeInBytes && <span>{formatFileSize(v.fileSizeInBytes)}</span>}
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-download-version-${v.versionId}`}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Descargar version</TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ instanceId, service }: { instanceId: string | number; service: IDocflowService }) {
  const movements = service.getMovementsByInstance(instanceId);

  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ArrowRightLeft className="h-12 w-12 mb-3" />
        <p className="text-base font-medium">Sin movimientos</p>
        <p className="text-sm mt-1">Este expediente aun no tiene movimientos registrados</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
      <div className="flex flex-col gap-0">
        {movements.map((mov, idx) => (
          <div
            key={mov.movementId}
            className="relative flex gap-4 pb-6"
            data-testid={`timeline-movement-${mov.movementId}`}
          >
            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
              mov.movementType === "RETURN"
                ? "border-destructive/40 bg-destructive/15 dark:border-destructive/60"
                : idx === movements.length - 1
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}>
              {mov.movementType === "RETURN" ? (
                <RotateCcw className="h-4 w-4 text-destructive dark:text-destructive/80" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {mov.movementType === "RETURN" ? "Retorno" : "Avance"}
                </span>
                <Badge variant="outline" className="text-xs border-transparent">
                  {mov.fromStatus} &rarr; {mov.toStatus}
                </Badge>
              </div>

              {(mov.processName || mov.departmentName) && (
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {mov.processName && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary" data-testid={`timeline-process-${mov.movementId}`}>
                      <GitBranch className="h-3 w-3" />
                      {mov.processName}
                    </span>
                  )}
                  {mov.departmentName && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground" data-testid={`timeline-dept-${mov.movementId}`}>
                      <Building2 className="h-3 w-3" />
                      {mov.departmentName}
                    </span>
                  )}
                </div>
              )}

              {mov.comments && (
                <p className="text-sm text-muted-foreground mt-1">
                  {mov.comments}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {mov.createdByName}
                </span>
                {mov.assignedToName && (
                  <span className="flex items-center gap-1">
                    &rarr; {mov.assignedToName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateTime(mov.createdAt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MandatoryBlockingAlert({ instance, service }: { instance: WorkflowInstance; service: IDocflowService }) {
  const groupedCompletion = service.getGroupedRuleCompletion(instance.instanceId, instance.processId);
  const allRules = groupedCompletion.flatMap(g => g.rules);
  const pendingMandatory = allRules.filter(r => r.rule.isMandatory && !r.isComplete);

  if (pendingMandatory.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-4 rounded-md bg-destructive/10 border border-destructive/30 dark:bg-red-900/20 dark:border-red-800" data-testid="alert-mandatory-blocking">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive dark:text-destructive/80 shrink-0" />
        <p className="text-sm font-medium text-destructive dark:text-red-300">
          No es posible avanzar el expediente
        </p>
      </div>
      <p className="text-xs text-destructive dark:text-destructive/80 ml-7">
        Los siguientes documentos obligatorios estan pendientes de carga:
      </p>
      <ul className="ml-7 flex flex-col gap-1.5 mt-1">
        {pendingMandatory.map(({ rule, uploaded }) => {
          const group = groupedCompletion.find(g => g.rules.some(r => r.rule.ruleId === rule.ruleId));
          return (
            <li key={rule.ruleId} className="flex items-center gap-2 text-xs" data-testid={`pending-mandatory-${rule.ruleId}`}>
              <AlertCircle className="h-3.5 w-3.5 text-destructive dark:text-destructive/80 shrink-0" />
              <span className="text-destructive dark:text-red-300 font-medium">{rule.docTypeName}</span>
              {group && !group.isCurrentProcess && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-destructive/40 text-destructive dark:border-destructive/60 dark:text-destructive/80">
                  {group.processName}
                </Badge>
              )}
              <span className="text-destructive dark:text-destructive/80">
                ({uploaded}/{rule.minFiles} archivos)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ActionsTab({ instance, service, permissions }: { instance: WorkflowInstance; service: IDocflowService; permissions: InstancePermissions }) {
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [assignedUser, setAssignedUser] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canAdvance = permissions.canAdvance;
  const canReturn = permissions.canReturn;
  const hasAnyPermission = canAdvance || canReturn;

  const handleAction = async (type: "FORWARD" | "RETURN") => {
    setActionError(null);

    if (type === "RETURN" && !comment.trim()) {
      setActionError("El comentario es obligatorio para retornar un expediente");
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.resolve(
        service.createMovement({
          instanceId: instance.instanceId,
          fromStatus: instance.currentStatus,
          toStatus: type === "FORWARD" ? "Pendiente" : "Retornado",
          movementType: type,
          comments: comment || undefined,
          assignedToUserId: assignedUser ? parseInt(assignedUser) : undefined,
        })
      );

      toast({
        title: type === "FORWARD" ? "Expediente avanzado" : "Expediente retornado",
        description: type === "FORWARD"
          ? "El expediente ha sido enviado al siguiente paso"
          : "El expediente ha sido devuelto para correccion",
      });

      setComment("");
      setAssignedUser("");
    } catch {
      setActionError("No se pudo completar la accion. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!canAdvance && (
        <MandatoryBlockingAlert instance={instance} service={service} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Acciones del Expediente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!hasAnyPermission && permissions.reason && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 border border-warning/30 dark:bg-amber-900/20 dark:border-amber-800" role="status" data-testid="warning-no-permissions">
              <ShieldAlert className="h-4 w-4 text-warning dark:text-amber-400 shrink-0" />
              <p className="text-sm text-warning dark:text-amber-300">{permissions.reason}</p>
            </div>
          )}

          {actionError && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20" role="alert" data-testid="error-action">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{actionError}</p>
            </div>
          )}

          {instance.currentDepartmentName && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border" data-testid="info-department-visibility">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">Departamento: {instance.currentDepartmentName}</p>
                <p className="text-xs text-muted-foreground">
                  Los documentos privados de este expediente solo son visibles para miembros de {instance.currentDepartmentName}. Los documentos publicos son visibles para todos los participantes.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-sm text-muted-foreground">Asignar a</Label>
            <DirectorySelect
              directoryType="users"
              value={assignedUser}
              onValueChange={setAssignedUser}
              placeholder="Selecciona un usuario (opcional)"
              searchable
              data-testid="select-assigned-user"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm text-muted-foreground">
              Comentarios / Motivo {canReturn && "(obligatorio para retorno)"}
            </Label>
            <Textarea
              placeholder="Escribe un comentario sobre esta accion..."
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (actionError) setActionError(null);
              }}
              className="resize-none"
              rows={3}
              data-testid="input-action-comment"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {canAdvance && (
              <Button className="flex-1" onClick={() => handleAction("FORWARD")} disabled={isSubmitting} data-testid="button-advance-instance">
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? "Procesando..." : "Avanzar Expediente"}
              </Button>
            )}
            {canReturn && (
              <Button variant="destructive" className="flex-1" onClick={() => handleAction("RETURN")} disabled={isSubmitting} data-testid="button-return-instance">
                <Undo2 className="h-4 w-4 mr-2" />
                {isSubmitting ? "Procesando..." : "Retornar Expediente"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InstanceDetail() {
  const service = useDocflowService();
  const params = useParams<{ id: string }>();
  const instanceId = params.id || "";
  const instance = service.getInstanceById(instanceId);
  const permissions = service.getInstancePermissions(instanceId);
  const [dynamicFieldSchema, setDynamicFieldSchema] = useState<DynamicFieldSchema[]>([]);

  useEffect(() => {
    if (instance?.processId) {
      service.loadDynamicFields(instance.processId).then((result) => {
        setDynamicFieldSchema(result.dynamicFieldMetadata);
      }).catch(() => {});
    }
  }, [instance?.processId, service]);

  if (!instance) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground p-4">
        <FileText className="h-16 w-16 mb-4" />
        <p className="text-lg font-medium">Expediente no encontrado</p>
        <p className="text-sm mt-1">El expediente solicitado no existe</p>
        <Link href="/Docflow/expedientes">
          <Button variant="outline" className="mt-4" data-testid="button-back-to-list">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la lista
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="page-instance-detail">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/Docflow/expedientes">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Volver a expedientes</TooltipContent>
          </Tooltip>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-instance-id">
              {formatExpedienteCode(instance.instanceId)}
            </h1>
            <StatusBadge status={instance.currentStatus} />
            {instance.currentDepartmentName && (
              <Badge
                variant="outline"
                className="gap-1 text-xs"
                data-testid="badge-department"
              >
                <Building2 className="h-3 w-3" />
                {instance.currentDepartmentName}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {instance.processName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 p-3 rounded-md bg-card border border-card-border">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Proceso
          </span>
          <span className="text-sm font-medium">{instance.processName}</span>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-md bg-card border border-card-border">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            Creado por
          </span>
          <span className="text-sm font-medium truncate">{instance.createdByName}</span>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-md bg-card border border-card-border">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Fecha
          </span>
          <span className="text-sm font-medium">{formatDate(instance.createdAt)}</span>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-md bg-card border border-card-border">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Archivos
          </span>
          <span className="text-sm font-medium">{instance.totalFiles}</span>
        </div>
      </div>

      {instance.currentDepartmentName && (
        <div className="flex items-center gap-3 p-3 rounded-md bg-card border border-card-border" data-testid="card-department-context">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium">{instance.currentDepartmentName}</span>
            <span className="text-xs text-muted-foreground">Departamento responsable del expediente</span>
          </div>
        </div>
      )}

      {instance.dynamicMetadata && Object.keys(instance.dynamicMetadata).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Metadatos del Expediente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MetadataDisplay metadata={instance.dynamicMetadata} schema={dynamicFieldSchema} />
          </CardContent>
        </Card>
      )}

      {!permissions.canAdvance && (
        <MandatoryBlockingAlert instance={instance} service={service} />
      )}

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="documents" className="flex-1 sm:flex-none gap-1" data-testid="tab-documents">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1 sm:flex-none gap-1" data-testid="tab-timeline">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
            <span className="sm:hidden">Hist.</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex-1 sm:flex-none gap-1" data-testid="tab-actions">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Acciones</span>
            <span className="sm:hidden">Acc.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab instanceId={instanceId} processId={instance.processId} service={service} permissions={permissions} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Historial de Movimientos
                </CardTitle>
                <Link href={`/Docflow/expedientes/${instanceId}/historial`}>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" data-testid="link-full-history">
                    <History className="h-3 w-3" />
                    Ver historial completo
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <TimelineTab instanceId={instanceId} service={service} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <ActionsTab instance={instance} service={service} permissions={permissions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
