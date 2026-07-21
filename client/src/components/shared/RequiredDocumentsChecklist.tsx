// src/components/shared/RequiredDocumentsChecklist.tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Loader2, Upload, Download, Trash2, X, File as FileIcon } from "lucide-react";

import { TramiteRequirementsAPI, DocumentsAPI, handleApiError } from "@/lib/api";
import type { TramiteRequirementDto } from "@/lib/api";
import type { StoredFileDto, DocumentUploadResultDto } from "@/types/documents";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefTypeDescriptionHint } from "@/components/shared/RefTypeDescriptionHint";

/**
 * Checklist genérico de documentos requeridos, dirigido por HR.tbl_TramiteRequirements
 * (backend: TramiteRequirementsController.GetApplicable). Muestra un renglón por cada
 * documento aplicable a `moduleTypeId` (+ `specificTypeId` opcional, p.ej. un tipo de
 * contrato), con su propio selector de archivo(s) y campos Número/Fecha de referencia.
 *
 * Reutilizable en cualquier trámite (Contratos, Acciones de Personal, etc.) — no depende
 * de nada específico de un módulo. No comparte código con ReusableDocumentManager
 * (evita el riesgo de romper las pantallas que ya lo usan).
 *
 * Si `entityReady` es false (entidad aún no existe, p.ej. wizard de creación), los archivos
 * quedan en memoria y se suben recién cuando el padre llama `uploadAll(entityId)` tras crear
 * la entidad — mismo patrón que ReusableDocumentManagerHandle.
 */

type StagedFile = {
  file: File;
  referenceNumber: string;
  referenceDate: string;
};

type Props = {
  moduleTypeId: number;
  specificTypeId?: number | null;

  directoryCode: string;
  entityType: string;
  entityId?: string | number;
  entityReady?: boolean;
  relativePath?: string;

  maxSizeMB?: number;
  disabled?: boolean;
  canDelete?: boolean;

  className?: string;
};

export type RequiredDocumentsChecklistHandle = {
  uploadAll: (entityIdOverride?: string | number) => Promise<DocumentUploadResultDto | null>;
  getSelectedCount: () => number;
  clearSelected: () => void;
  refresh: (entityIdOverride?: string | number) => Promise<void>;
  /** Documento obligatorio faltante + número/fecha faltantes + fecha futura, en mensajes listos para mostrar. */
  getValidationErrors: () => string[];
};

function todayLocalDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const RequiredDocumentsChecklist = forwardRef<RequiredDocumentsChecklistHandle, Props>(
  (
    {
      moduleTypeId,
      specificTypeId,
      directoryCode,
      entityType,
      entityId,
      entityReady = false,
      relativePath,
      maxSizeMB = 20,
      disabled = false,
      canDelete = true,
      className,
    },
    ref
  ) => {
    const [requirements, setRequirements] = useState<TramiteRequirementDto[]>([]);
    const [isLoadingRequirements, setIsLoadingRequirements] = useState(true);
    const [existingFiles, setExistingFiles] = useState<StoredFileDto[]>([]);
    const [staged, setStaged] = useState<Record<number, StagedFile[]>>({});
    const [isUploading, setIsUploading] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);
    // Errores de selección de archivo (p.ej. tamaño excedido) por tarjeta — se muestran junto
    // a la tarjeta correspondiente, no solo arriba de la lista, para que no pasen inadvertidos
    // si el usuario está desplazado hacia una tarjeta más abajo.
    const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

    // Un mismo tipo de documento puede tener un requisito general (SpecificTypeId=NULL) y otro
    // propio del tipo específico elegido — GetApplicable devuelve ambas filas. Se agrupan por
    // documentTypeId (obligatorio si CUALQUIERA de las dos lo marca) para no duplicar la tarjeta
    // ni colisionar los ids del input de archivo.
    const groupedRequirements = useMemo(() => {
      const byDocType = new Map<number, TramiteRequirementDto>();
      for (const r of requirements) {
        const existing = byDocType.get(r.documentTypeId);
        if (!existing) {
          byDocType.set(r.documentTypeId, r);
        } else if (r.isRequired && !existing.isRequired) {
          byDocType.set(r.documentTypeId, r);
        }
      }
      return Array.from(byDocType.values());
    }, [requirements]);

    const loadRequirements = useCallback(async () => {
      if (!moduleTypeId) return;
      setIsLoadingRequirements(true);
      try {
        const res = await TramiteRequirementsAPI.getApplicable(moduleTypeId, specificTypeId ?? null);
        setRequirements(res.status === "success" ? res.data ?? [] : []);
      } finally {
        setIsLoadingRequirements(false);
      }
    }, [moduleTypeId, specificTypeId]);

    const loadExistingFiles = useCallback(
      async (entityIdOverride?: string | number) => {
        const idToUse = entityIdOverride ?? entityId;
        if (!entityReady || idToUse == null) {
          setExistingFiles([]);
          return;
        }
        const res = await DocumentsAPI.listByEntity({ directoryCode, entityType, entityId: idToUse, status: 1 });
        setExistingFiles(res.status === "success" ? res.data ?? [] : []);
      },
      [directoryCode, entityType, entityId, entityReady]
    );

    useEffect(() => {
      loadRequirements();
    }, [loadRequirements]);

    useEffect(() => {
      loadExistingFiles();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityReady, entityId]);

    function addFiles(documentTypeId: number, fileList: FileList | null) {
      if (!fileList || fileList.length === 0) return;
      // Capturar los File en un arreglo plano DE INMEDIATO: FileList es una referencia viva
      // al <input>, y el onChange resetea `input.value = ""` justo después de esta llamada
      // (para poder re-seleccionar el mismo archivo más tarde) — eso vacía la FileList antes
      // de que el actualizador de setStaged llegara a leerla si se releía perezosamente ahí.
      const files = Array.from(fileList);

      const tooLarge = files.find((f) => f.size > maxSizeMB * 1024 * 1024);
      if (tooLarge) {
        setRowErrors((prev) => ({ ...prev, [documentTypeId]: `"${tooLarge.name}" supera el máximo de ${maxSizeMB}MB.` }));
        return;
      }
      setRowErrors((prev) => {
        const { [documentTypeId]: _removed, ...rest } = prev;
        return rest;
      });
      setStaged((prev) => ({
        ...prev,
        [documentTypeId]: [
          ...(prev[documentTypeId] ?? []),
          ...files.map((file) => ({ file, referenceNumber: "", referenceDate: "" })),
        ],
      }));
    }

    function removeStaged(documentTypeId: number, index: number) {
      setStaged((prev) => ({
        ...prev,
        [documentTypeId]: (prev[documentTypeId] ?? []).filter((_, i) => i !== index),
      }));
    }

    function updateStagedField(documentTypeId: number, index: number, field: "referenceNumber" | "referenceDate", value: string) {
      setStaged((prev) => ({
        ...prev,
        [documentTypeId]: (prev[documentTypeId] ?? []).map((s, i) => (i === index ? { ...s, [field]: value } : s)),
      }));
    }

    async function handleDownload(it: StoredFileDto) {
      const resp = await DocumentsAPI.download(it.fileGuid);
      if (resp.status === "error") {
        setErrorText(handleApiError(resp.error, "Error descargando."));
        return;
      }
      const url = window.URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = it.originalFileName || it.storedFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }

    async function handleDeleteExisting(it: StoredFileDto) {
      const resp = await DocumentsAPI.remove(it.fileGuid);
      if (resp.status === "error") {
        setErrorText(handleApiError(resp.error, "Error eliminando el documento."));
        return;
      }
      await loadExistingFiles();
    }

    useImperativeHandle(ref, () => ({
      getSelectedCount: () =>
        Object.values(staged).reduce((sum, arr) => sum + arr.length, 0),

      clearSelected: () => setStaged({}),

      refresh: async (entityIdOverride?: string | number) => {
        await loadExistingFiles(entityIdOverride);
      },

      getValidationErrors: () => {
        const uploadedTypeIds = new Set(existingFiles.map((f) => f.documentTypeId).filter((v): v is number => v != null));
        const today = todayLocalDateStr();
        const errors: string[] = [];

        for (const req of groupedRequirements) {
          const name = req.documentTypeName ?? `ID ${req.documentTypeId}`;
          const rows = staged[req.documentTypeId] ?? [];

          if (req.isRequired && !uploadedTypeIds.has(req.documentTypeId) && rows.length === 0) {
            errors.push(`Falta el documento obligatorio: ${name}.`);
          }

          rows.forEach((s) => {
            if (!s.referenceNumber.trim()) errors.push(`${name}: falta el número de documento.`);
            if (!s.referenceDate) errors.push(`${name}: falta la fecha de documento.`);
            else if (s.referenceDate > today) errors.push(`${name}: la fecha de documento no puede ser una fecha futura.`);
          });
        }

        return errors;
      },

      uploadAll: async (entityIdOverride?: string | number) => {
        const idToUse = entityIdOverride ?? entityId;
        const items = Object.entries(staged).flatMap(([docTypeId, files]) =>
          files.map((s) => ({
            file: s.file,
            documentTypeId: docTypeId,
            documentReferenceNumber: s.referenceNumber || undefined,
            documentReferenceDate: s.referenceDate || undefined,
          }))
        );
        if (items.length === 0 || idToUse == null) return null;

        setIsUploading(true);
        try {
          const res = await DocumentsAPI.uploadMapped({
            directoryCode,
            entityType,
            entityId: idToUse,
            relativePath,
            items,
          });
          if (res.status !== "success") {
            setErrorText(handleApiError(res.error, "Error subiendo documentos."));
            return null;
          }
          setStaged({});
          await loadExistingFiles(idToUse);
          return res.data;
        } finally {
          setIsUploading(false);
        }
      },
    }));

    if (isLoadingRequirements) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando requisitos documentales...
        </div>
      );
    }

    if (groupedRequirements.length === 0) return null;

    return (
      <div className={className ?? "space-y-3"}>
        {errorText && (
          <p className="text-sm text-destructive">{errorText}</p>
        )}
        {groupedRequirements.map((req) => {
          const filesForType = existingFiles.filter((f) => f.documentTypeId === req.documentTypeId);
          const stagedForType = staged[req.documentTypeId] ?? [];
          const inputId = `req-doc-${req.documentTypeId}`;

          return (
            <Card key={req.documentTypeId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium">{req.documentTypeName ?? `ID ${req.documentTypeId}`}</CardTitle>
                  <Badge variant={req.isRequired ? "default" : "secondary"}>
                    {req.isRequired ? "Obligatorio" : "Opcional"}
                  </Badge>
                </div>
                <RefTypeDescriptionHint
                  category={REF_TYPE_CATEGORIES.DOCUMENT_TYPE}
                  name={req.documentTypeName}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {filesForType.map((f) => (
                  <div key={f.fileGuid} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{f.originalFileName || f.storedFileName}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button type="button" variant="outline" className="h-7 w-7 p-0" onClick={() => handleDownload(f)}>
                        <Download className="h-3 w-3" />
                      </Button>
                      {canDelete && !disabled && (
                        <Button type="button" variant="outline" className="h-7 w-7 p-0" onClick={() => handleDeleteExisting(f)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {stagedForType.map((s, idx) => (
                  <div key={idx} className="space-y-2 rounded-md border px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{s.file.name}</span>
                      </div>
                      {!disabled && (
                        <Button type="button" variant="outline" className="h-7 w-7 p-0 shrink-0" onClick={() => removeStaged(req.documentTypeId, idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Número de documento *</Label>
                        <Input
                          className="h-8"
                          value={s.referenceNumber}
                          disabled={disabled}
                          onChange={(e) => updateStagedField(req.documentTypeId, idx, "referenceNumber", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fecha de documento *</Label>
                        <Input
                          type="date"
                          className="h-8"
                          max={todayLocalDateStr()}
                          value={s.referenceDate}
                          disabled={disabled}
                          onChange={(e) => updateStagedField(req.documentTypeId, idx, "referenceDate", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {!disabled && (
                  <div>
                    <input
                      id={inputId}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addFiles(req.documentTypeId, e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <Label htmlFor={inputId} className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
                      <Upload className="h-3.5 w-3.5" />
                      {isUploading ? "Subiendo..." : "Adjuntar archivo"}
                    </Label>
                    {rowErrors[req.documentTypeId] && (
                      <p className="text-xs text-destructive mt-1">{rowErrors[req.documentTypeId]}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }
);

RequiredDocumentsChecklist.displayName = "RequiredDocumentsChecklist";
