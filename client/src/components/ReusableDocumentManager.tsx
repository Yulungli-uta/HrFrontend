// src/components/ReusableDocumentManager.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { DocumentsAPI, handleApiError, TiposReferenciaAPI } from "@/lib/api";
import type { StoredFileDto, DocumentUploadResultDto } from "@/types/documents";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Loader2,
  Upload,
  X,
  File as FileIcon,
  Eye,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";

/**
 * ✅ Default interno para no repetir strings en todos los módulos.
 */
export const DEFAULT_DOCUMENT_TYPE_CATEGORY = "DOCUMENT_TYPE";

type RoleConfig = {
  canUpload?: boolean;
  canDelete?: boolean;
  canDownload?: boolean;
  canPreview?: boolean;
};

type RefTypeItem = {
  id?: number | string;
  refTypeId?: number | string;
  typeId?: number | string;
  valueId?: number | string;
  name?: string;
  description?: string;
  code?: string;
};

function getRefTypeId(rt: RefTypeItem): string {
  const id = rt.id ?? rt.refTypeId ?? rt.typeId ?? rt.valueId;
  return id == null ? "" : String(id);
}
function getRefTypeLabel(rt: RefTypeItem): string {
  return (rt.name ?? rt.description ?? rt.code ?? "").toString() || `ID ${getRefTypeId(rt)}`;
}

type Props = {
  directoryCode: string;
  entityType: string;

  entityId?: string | number;
  relativePath?: string;

  label?: string;
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;

  disabled?: boolean;
  roles?: RoleConfig;

  entityReady?: boolean;
  allowSelectWhenNotReady?: boolean;

  showInternalUploadButton?: boolean;

  /**
   * ✅ Tipo de Documento
   */
  documentType?: {
    enabled: boolean;
    category?: string; // default: DOCUMENT_TYPE
    label?: string;
    required?: boolean;
    defaultValue?: string;
    clearOnSuccess?: boolean;
  };

  onUploaded?: (result: DocumentUploadResultDto) => void;
};

export type ReusableDocumentManagerHandle = {
  refresh: (entityIdOverride?: string | number) => Promise<void>;

  uploadAll: (entityIdOverride?: string | number) => Promise<DocumentUploadResultDto | null>;
  clearSelected: () => void;
  getSelectedCount: () => number;

  // opcional
  getSelectedDocumentTypeId: () => string | null;
  setSelectedDocumentTypeId: (id: string | null) => void;
};

function isPdfName(name: string) {
  return name.toLowerCase().endsWith(".pdf");
}
function isImageName(name: string) {
  const n = name.toLowerCase();
  return (
    n.endsWith(".png") ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".gif") ||
    n.endsWith(".webp") ||
    n.endsWith(".bmp")
  );
}
function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}
function makeStableKey(it: StoredFileDto, idx: number) {
  const anyIt = it as any;
  return (
    it.fileGuid ||
    String(anyIt.fileId ?? "") ||
    `${it.storedFileName ?? it.originalFileName ?? "file"}-${it.createdAt ?? "na"}-${idx}`
  );
}

type DocTypeMode = "BATCH" | "PER_FILE";

type SelectedItem = {
  file: File;
  documentTypeId: string | null; // solo usado si modo PER_FILE
};

export const ReusableDocumentManager = forwardRef<ReusableDocumentManagerHandle, Props>(
  (
    {
      directoryCode,
      entityType,
      entityId,
      relativePath,
      label = "Documentos",
      accept = "*/*",
      maxSizeMB = 20,
      maxFiles,
      disabled,
      roles,
      entityReady = true,
      allowSelectWhenNotReady = true,
      showInternalUploadButton = true,
      documentType,
      onUploaded,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    // ✅ ahora guardamos selected como items (para soportar tipo por archivo)
    const [selected, setSelected] = useState<SelectedItem[]>([]);
    const [dragOver, setDragOver] = useState(false);

    const [items, setItems] = useState<StoredFileDto[]>([]);
    const [loadingList, setLoadingList] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<DocumentUploadResultDto | null>(null);
    const [errorText, setErrorText] = useState<string | null>(null);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState<StoredFileDto | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const canUpload = roles?.canUpload ?? true;
    const canDelete = roles?.canDelete ?? true;
    const canDownload = roles?.canDownload ?? true;
    const canPreview = roles?.canPreview ?? true;

    const sizeLimitBytes = useMemo(() => maxSizeMB * 1024 * 1024, [maxSizeMB]);

    // -----------------------------
    // ✅ Tipo de Documento
    // -----------------------------
    const docTypeEnabled = !!documentType?.enabled;
    const docTypeRequired = !!documentType?.required;
    const docTypeCategory = documentType?.category ?? DEFAULT_DOCUMENT_TYPE_CATEGORY;

    // selector de modo (en el componente)
    const [docTypeMode, setDocTypeMode] = useState<DocTypeMode>("BATCH");

    // tipo por lote (solo si modo BATCH)
    const [selectedDocTypeId, setSelectedDocTypeId] = useState<string | null>(
      documentType?.defaultValue ?? null
    );

    // si cambia defaultValue desde props
    useEffect(() => {
      if (!docTypeEnabled) return;
      if (documentType?.defaultValue != null) setSelectedDocTypeId(documentType.defaultValue);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [docTypeEnabled, documentType?.defaultValue]);

    const {
      data: refTypesResponse,
      isLoading: isLoadingRefTypes,
      isFetching: isFetchingRefTypes,
      error: refTypesError,
      refetch: refetchRefTypes,
    } = useQuery({
      enabled: docTypeEnabled && !!docTypeCategory,
      queryKey: ["refTypes", docTypeCategory],
      queryFn: () => TiposReferenciaAPI.byCategory(docTypeCategory) as any,
      staleTime: 5 * 60 * 1000,
    });

    const refTypes: RefTypeItem[] =
      refTypesResponse?.status === "success" ? refTypesResponse.data : [];

    const docTypeMap = useMemo(() => {
      const m = new Map<string, string>();
      refTypes.forEach((rt) => {
        const id = getRefTypeId(rt);
        if (!id) return;
        m.set(id, getRefTypeLabel(rt));
      });
      return m;
    }, [refTypes]);

    const pickFiles = () => inputRef.current?.click();

    // -----------------------------
    // ✅ Validaciones
    // -----------------------------
    const validateFiles = useCallback(
      (files: File[]) => {
        if (!files || files.length === 0) return "No se seleccionaron archivos.";
        if (maxFiles && files.length > maxFiles) return `Máximo ${maxFiles} archivos.`;
        for (const f of files) {
          if (f.size > sizeLimitBytes) return `El archivo "${f.name}" excede ${maxSizeMB} MB.`;
        }
        return null;
      },
      [maxFiles, sizeLimitBytes, maxSizeMB]
    );

    const validateBeforeUpload = useCallback(() => {
      if (!docTypeEnabled) return null;

      // modo batch: solo validar selectedDocTypeId (si required)
      if (docTypeMode === "BATCH") {
        if (docTypeRequired && (!selectedDocTypeId || selectedDocTypeId.trim() === "")) {
          return "Debe seleccionar un tipo de documento (para el lote).";
        }
        return null;
      }

      // modo per-file: validar cada archivo (si required)
      if (docTypeRequired) {
        const missing = selected.find((s) => !s.documentTypeId || s.documentTypeId.trim() === "");
        if (missing) return "Debe seleccionar el tipo de documento para cada archivo.";
      }
      return null;
    }, [docTypeEnabled, docTypeMode, docTypeRequired, selectedDocTypeId, selected]);

    // -----------------------------
    // ✅ Agregar archivos (validando total)
    // -----------------------------
    const addFiles = useCallback(
      (newFiles: File[]) => {
        if (!newFiles || newFiles.length === 0) return;

        const combined = [...selected.map((s) => s.file), ...newFiles];
        const err = validateFiles(combined);
        if (err) {
          setErrorText(err);
          return;
        }

        setErrorText(null);

        setSelected((prev) => [
          ...prev,
          ...newFiles.map((f) => ({
            file: f,
            // si estamos en PER_FILE y ya hay un tipo batch seleccionado, lo prellenamos
            documentTypeId: docTypeMode === "PER_FILE" ? (selectedDocTypeId ?? null) : null,
          })),
        ]);
      },
      [selected, validateFiles, docTypeMode, selectedDocTypeId]
    );

    const onSelect: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const fs = Array.from(e.target.files || []);
      if (fs.length) addFiles(fs);
      if (inputRef.current) inputRef.current.value = "";
    };

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      if (disabled || uploading || !canUpload) return;
      if (!entityReady && !allowSelectWhenNotReady) return;

      addFiles(Array.from(e.dataTransfer.files || []));
    };

    const onDragOver = (e: React.DragEvent) => {
      if (disabled || uploading || !canUpload) return;
      if (!entityReady && !allowSelectWhenNotReady) return;

      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
      if (disabled || uploading || !canUpload) return;
      if (!entityReady && !allowSelectWhenNotReady) return;

      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
    };

    const clearSelected = () => setSelected([]);

    // -----------------------------
    // ✅ refresh
    // -----------------------------
    const refresh = useCallback(
      async (entityIdOverride?: string | number) => {
        setErrorText(null);

        if (!directoryCode || !entityType) return;

        if (!entityReady) {
          setItems([]);
          return;
        }

        const effectiveEntityId = entityIdOverride ?? entityId;
        if (effectiveEntityId === undefined || effectiveEntityId === null || String(effectiveEntityId).trim() === "") {
          setItems([]);
          return;
        }

        setLoadingList(true);

        const resp = await DocumentsAPI.listByEntity({
          directoryCode,
          entityType,
          entityId: String(effectiveEntityId),
          status: 1,
        });

        if (resp.status === "success") {
          setItems(resp.data || []);
        } else {
          setErrorText(handleApiError(resp.error, "Error listando documentos."));
        }

        setLoadingList(false);
      },
      [directoryCode, entityType, entityId, entityReady]
    );

    useEffect(() => {
      refresh();
    }, [refresh]);

    // -----------------------------
    // ✅ uploadAll (3 modos)
    // -----------------------------
    const uploadAll = useCallback(
      async (entityIdOverride?: string | number): Promise<DocumentUploadResultDto | null> => {
        setErrorText(null);
        setUploadResult(null);

        if (!canUpload) {
          setErrorText("No tienes permisos para subir archivos.");
          return null;
        }
        if (uploading) return null;

        if (!directoryCode || !entityType) {
          setErrorText("Faltan parámetros del módulo (directoryCode/entityType).");
          return null;
        }

        const effectiveEntityId = entityIdOverride ?? entityId;
        if (effectiveEntityId === undefined || effectiveEntityId === null || String(effectiveEntityId).trim() === "") {
          setErrorText("Falta entityId real para subir.");
          return null;
        }

        if (!selected.length) {
          setErrorText("No hay archivos para subir.");
          return null;
        }

        const errFiles = validateFiles(selected.map((s) => s.file));
        if (errFiles) {
          setErrorText(errFiles);
          return null;
        }

        const errDocType = validateBeforeUpload();
        if (errDocType) {
          setErrorText(errDocType);
          return null;
        }

        setUploading(true);

        let resp: any = null;

        // (A) MODO BATCH: 1 tipo para todos
        if (!docTypeEnabled || docTypeMode === "BATCH") {
          resp = await DocumentsAPI.upload({
            directoryCode,
            entityType,
            entityId: String(effectiveEntityId),
            relativePath,
            files: selected.map((s) => s.file),
            documentTypeId: docTypeEnabled ? (selectedDocTypeId ?? undefined) : undefined,
          } as any);
        } else {
          // (B) MODO PER_FILE: tipo por archivo
          if (selected.length === 1) {
            // usar uploadSingle
            resp = await DocumentsAPI.uploadSingle({
              directoryCode,
              entityType,
              entityId: String(effectiveEntityId),
              relativePath,
              file: selected[0].file,
              documentTypeId: selected[0].documentTypeId ?? undefined,
            } as any);
          } else {
            // usar uploadMapped
            resp = await DocumentsAPI.uploadMapped({
              directoryCode,
              entityType,
              entityId: String(effectiveEntityId),
              relativePath,
              items: selected.map((s) => ({
                file: s.file,
                documentTypeId: s.documentTypeId ?? "",
              })),
            } as any);
          }
        }

        if (resp.status === "success") {
          setUploadResult(resp.data);
          onUploaded?.(resp.data);

          await refresh(effectiveEntityId);

          if (resp.data?.uploaded > 0) {
            setSelected([]);
            if (documentType?.clearOnSuccess) {
              setSelectedDocTypeId(null);
            }
          }

          setUploading(false);
          return resp.data;
        }

        setErrorText(handleApiError(resp.error, "Error subiendo documentos."));
        const details = resp.error.details as any;
        if (details && typeof details === "object" && "items" in details) {
          setUploadResult(details as DocumentUploadResultDto);
        }

        setUploading(false);
        return null;
      },
      [
        canUpload,
        uploading,
        directoryCode,
        entityType,
        entityId,
        relativePath,
        selected,
        validateFiles,
        validateBeforeUpload,
        docTypeEnabled,
        docTypeMode,
        selectedDocTypeId,
        documentType?.clearOnSuccess,
        onUploaded,
        refresh,
      ]
    );

    useImperativeHandle(
      ref,
      () => ({
        refresh,
        uploadAll,
        clearSelected,
        getSelectedCount: () => selected.length,
        getSelectedDocumentTypeId: () => selectedDocTypeId,
        setSelectedDocumentTypeId: (id: string | null) => setSelectedDocTypeId(id),
      }),
      [refresh, uploadAll, selected.length, selectedDocTypeId]
    );

    // -----------------------------
    // ✅ Preview/Download/Delete
    // -----------------------------
    const download = async (it: StoredFileDto) => {
      if (!canDownload) {
        setErrorText("No tienes permisos para descargar.");
        return;
      }

      const resp = await DocumentsAPI.download(it.fileGuid);
      if (resp.status === "error") {
        setErrorText(handleApiError(resp.error, "Error descargando."));
        return;
      }

      const blob = resp.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = it.originalFileName || it.storedFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    };

    const openPreview = async (it: StoredFileDto) => {
      if (!canPreview) {
        setErrorText("No tienes permisos para previsualizar.");
        return;
      }

      if (previewUrl) window.URL.revokeObjectURL(previewUrl);

      setPreviewItem(it);
      setPreviewOpen(true);
      setPreviewLoading(true);

      const resp = await DocumentsAPI.download(it.fileGuid);
      if (resp.status === "error") {
        setErrorText(handleApiError(resp.error, "Error cargando vista previa."));
        setPreviewUrl(null);
        setPreviewLoading(false);
        return;
      }

      const url = window.URL.createObjectURL(resp.data);
      setPreviewUrl(url);
      setPreviewLoading(false);
    };

    useEffect(() => {
      return () => {
        if (previewUrl) window.URL.revokeObjectURL(previewUrl);
      };
    }, [previewUrl]);

    const removeServer = async (it: StoredFileDto) => {
      if (!canDelete) {
        setErrorText("No tienes permisos para eliminar.");
        return;
      }

      const resp = await DocumentsAPI.remove(it.fileGuid, false);
      if (resp.status === "error") {
        setErrorText(handleApiError(resp.error, "Error eliminando."));
        return;
      }

      await refresh();
    };

    const canInteractSelect = !disabled && !uploading && canUpload && (entityReady || allowSelectWhenNotReady);

    const canSubmitNow =
      !uploading &&
      !disabled &&
      canUpload &&
      entityReady &&
      selected.length > 0 &&
      (!docTypeEnabled || validateBeforeUpload() == null);

    // -----------------------------
    // ✅ Cambio de modo docType (prellenar)
    // -----------------------------
    const onChangeDocTypeMode = (mode: DocTypeMode) => {
      setDocTypeMode(mode);
      setErrorText(null);

      // si pasa a PER_FILE: prellenar con el tipo batch actual
      if (mode === "PER_FILE") {
        setSelected((prev) =>
          prev.map((s) => ({
            ...s,
            documentTypeId: s.documentTypeId ?? selectedDocTypeId ?? null,
          }))
        );
      }
    };

    return (
      <>
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>{label}</span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refresh()}
                  disabled={loadingList || uploading || !entityReady}
                  title={!entityReady ? "Guarda primero para habilitar la lista" : "Actualizar lista"}
                >
                  {loadingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Actualizar</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ✅ Selector modo + tipo */}
            {docTypeEnabled && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Aplicación del tipo</Label>

                  <Select value={docTypeMode} onValueChange={(v) => onChangeDocTypeMode(v as DocTypeMode)} disabled={disabled || uploading}>
                    <SelectTrigger className="w-full sm:w-[320px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BATCH">Mismo tipo para todos</SelectItem>
                      <SelectItem value="PER_FILE">Tipo por archivo</SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-muted-foreground">
                    Define si el tipo se aplica al lote completo o individualmente por archivo.
                  </p>
                </div>

                {/* Tipo por lote */}
                {docTypeMode === "BATCH" && (
                  <div className="space-y-2">
                    <Label>{documentType?.label ?? "Tipo de documento (lote)"}</Label>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <div className="flex-1 min-w-0">
                        <Select
                          value={selectedDocTypeId ?? ""}
                          onValueChange={(v) => {
                            setSelectedDocTypeId(v || null);
                            setErrorText(null);
                          }}
                          disabled={disabled || uploading || !canUpload || isLoadingRefTypes}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingRefTypes ? "Cargando tipos..." : "Seleccione un tipo"} />
                          </SelectTrigger>
                          <SelectContent>
                            {refTypes.map((rt) => {
                              const id = getRefTypeId(rt);
                              if (!id) return null;
                              return (
                                <SelectItem key={id} value={id}>
                                  {getRefTypeLabel(rt)}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        {(isLoadingRefTypes || isFetchingRefTypes) && (
                          <p className="text-xs text-muted-foreground mt-1">Cargando catálogo...</p>
                        )}

                        {refTypesError && (
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-destructive">Error al cargar catálogo.</p>
                            <Button type="button" variant="ghost" size="sm" onClick={() => refetchRefTypes()} disabled={disabled || uploading}>
                              Reintentar
                            </Button>
                          </div>
                        )}

                        {docTypeRequired && <p className="text-xs text-muted-foreground mt-1">Campo obligatorio para subir.</p>}
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => refetchRefTypes()}
                        disabled={disabled || uploading || isLoadingRefTypes}
                        className="w-full sm:w-auto"
                        title="Actualizar catálogo"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tipos
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selector archivos */}
            <div className="space-y-2">
              <Label>Subir archivos</Label>

              <input
                ref={inputRef}
                type="file"
                multiple
                accept={accept}
                disabled={!canInteractSelect}
                onChange={onSelect}
                className="hidden"
              />

              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => canInteractSelect && pickFiles()}
                className={[
                  "rounded-xl border p-4 sm:p-5 border-dashed",
                  "flex items-start gap-3 cursor-pointer",
                  dragOver ? "ring-2 ring-offset-2" : "",
                  !canInteractSelect ? "opacity-60 pointer-events-none" : "",
                ].join(" ")}
                role="button"
                tabIndex={0}
              >
                <Upload className="h-6 w-6" />
                <div className="min-w-0">
                  <p className="text-sm">
                    Arrastra y suelta o <span className="underline">haz clic</span> para seleccionar.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tipos: <code>{accept}</code> · Máx por archivo: {maxSizeMB} MB
                    {maxFiles ? ` · Máx archivos: ${maxFiles}` : ""}
                  </p>

                  {!entityReady && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Aún no se ha creado la entidad. Puedes seleccionar archivos, pero se subirán cuando presiones Guardar.
                    </p>
                  )}
                </div>
              </div>

              {/* Lista seleccionados */}
              {selected.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Seleccionados: <b>{selected.length}</b>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={clearSelected}
                        disabled={uploading}
                        className="w-full sm:w-auto"
                      >
                        Limpiar
                      </Button>

                      {showInternalUploadButton && (
                        <Button
                          size="sm"
                          onClick={() => uploadAll()}
                          disabled={!canSubmitNow}
                          title={!entityReady ? "Guarda primero para subir" : "Subir ahora"}
                          className="w-full sm:w-auto"
                        >
                          {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Subir
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-auto space-y-2">
                    {selected.map((s, i) => (
                      <div
                        key={`${s.file.name}-${s.file.size}-${s.file.lastModified}-${i}`}
                        className="border rounded-lg p-2 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <FileIcon className="h-4 w-4" />
                            <div className="min-w-0">
                              <p className="text-sm truncate">{s.file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatBytes(s.file.size)}</p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelected((prev) => prev.filter((_, idx) => idx !== i))}
                            disabled={uploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* ✅ Tipo por archivo */}
                        {docTypeEnabled && docTypeMode === "PER_FILE" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Tipo de documento</Label>
                            <Select
                              value={s.documentTypeId ?? ""}
                              onValueChange={(v) => {
                                setSelected((prev) =>
                                  prev.map((p, idx) => (idx === i ? { ...p, documentTypeId: v || null } : p))
                                );
                                setErrorText(null);
                              }}
                              disabled={disabled || uploading || isLoadingRefTypes}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingRefTypes ? "Cargando..." : "Seleccione un tipo"} />
                              </SelectTrigger>
                              <SelectContent>
                                {refTypes.map((rt) => {
                                  const id = getRefTypeId(rt);
                                  if (!id) return null;
                                  return (
                                    <SelectItem key={id} value={id}>
                                      {getRefTypeLabel(rt)}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            {docTypeRequired && <p className="text-xs text-muted-foreground">Obligatorio.</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Subiendo…</p>
                  <Progress value={undefined as any} className="h-2" />
                </div>
              )}

              {uploadResult && (
                <div className="border rounded-lg p-3 text-sm">
                  <p className="font-medium">{uploadResult.message}</p>
                  <p className="text-muted-foreground">
                    Total: {uploadResult.total} · OK: {uploadResult.uploaded} · Fallidos: {uploadResult.failed}
                  </p>
                </div>
              )}
            </div>

            {errorText && <p className="text-sm text-destructive">{errorText}</p>}

            {/* Lista items */}
            <div className="space-y-2">
              <Label>Archivos cargados</Label>

              {!entityReady ? (
                <p className="text-sm text-muted-foreground">No hay documentos (la entidad aún no está creada).</p>
              ) : loadingList ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay documentos.</p>
              ) : (
                <div className="max-h-72 overflow-auto space-y-2">
                  {items.map((it, idx) => {
                    const displayName = it.originalFileName || it.storedFileName;
                    const canShowPreview = canPreview && (isPdfName(displayName) || isImageName(displayName));
                    const rowKey = makeStableKey(it, idx);

                    const typeLabel =
                      it.documentTypeId != null ? (docTypeMap.get(String(it.documentTypeId)) ?? `ID ${it.documentTypeId}`) : null;

                    return (
                      <div key={rowKey} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(it.sizeBytes)} · {it.createdAt}
                            {typeLabel ? ` · Tipo: ${typeLabel}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            {canShowPreview && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openPreview(it);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Vista previa</TooltipContent>
                              </Tooltip>
                            )}

                            {canDownload && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => download(it)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Descargar</TooltipContent>
                              </Tooltip>
                            )}

                            {canDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => removeServer(it)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* {(relativePath || directoryCode) && (
              <p className="text-xs text-muted-foreground break-words">
                DirectoryCode: <code>{directoryCode}</code> · Entity:{" "}
                <code>{entityType}:{entityReady && entityId != null ? String(entityId) : "PENDING"}</code>
                {relativePath ? (
                  <>
                    {" "}
                    · Base folder: <code>{relativePath}</code>
                  </>
                ) : null}
              </p>
            )} */}
          </CardContent>
        </Card>

        {/* Preview dialog */}
        <Dialog
          modal={false}
          open={previewOpen}
          onOpenChange={(v) => {
            setPreviewOpen(v);
            if (!v) {
              setPreviewItem(null);
              if (previewUrl) window.URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }
          }}
        >
          {/* <DialogContent className="max-w-4xl h-[90vh] flex flex-col"> */}
          <DialogContent className="w-[95vw] sm:max-w-4xl h-[90vh] flex flex-col"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Vista previa</DialogTitle>
              <DialogDescription>
                {previewItem ? previewItem.originalFileName || previewItem.storedFileName : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex items-center justify-center">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                </div>
              ) : previewUrl && previewItem ? (
                isPdfName(previewItem.originalFileName || previewItem.storedFileName) ? (
                  <iframe className="w-full h-full" src={previewUrl} title="preview-pdf" />
                ) : isImageName(previewItem.originalFileName || previewItem.storedFileName) ? (
                  <img className="max-h-full max-w-full object-contain" src={previewUrl} alt="preview-img" />
                ) : (
                  <div className="text-sm text-muted-foreground p-4">No hay vista previa para este tipo. Usa Descargar.</div>
                )
              ) : (
                <div className="text-sm text-muted-foreground p-4">Sin contenido.</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              {previewItem && canDownload && (
                <Button variant="outline" onClick={() => download(previewItem)}>
                  <Download className="h-4 w-4 mr-2" /> Descargar
                </Button>
              )}
              <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

ReusableDocumentManager.displayName = "ReusableDocumentManager";
