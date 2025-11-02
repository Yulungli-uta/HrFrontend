// src/components/ReusableFileUpload.tsx
import React, { useMemo, useRef, useState, useCallback } from "react";
import { FileManagementAPI, handleApiError, type ApiResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, X, File as FileIcon } from "lucide-react";

type ReusableFileUploadProps = {
  /** Código del directorio configurado (obligatorio) */
  directoryCode: string;
  /** Ruta relativa base (ej: /contracts/) */
  relativePath?: string;
  /** Nombre de archivo preferido (si se omite, usa el nombre del archivo seleccionado) */
  defaultFileName?: string;
  /** Aceptados para el input (ej: ".pdf,.docx,image/*") */
  accept?: string;
  /** Tamaño máximo en MB (por defecto 20 MB) */
  maxSizeMB?: number;
  /** Deshabilitar el control */
  disabled?: boolean;
  /** Etiqueta visible del control */
  label?: string;
  /** Clase contenedora opcional */
  className?: string;
  /** Permitir arrastrar y soltar */
  enableDropzone?: boolean;

  /** Callback éxito (respuesta del servidor) */
  onUploaded?: (serverResponse: any) => void;
  /** Callback error (mensaje amigable) */
  onError?: (message: string) => void;
};

function getSafeFilename(name: string) {
  // Limpia espacios extremos y evita rutas
  return name.replace(/^\.?[/\\]+/, "").replace(/[/\\]+/g, "_").trim();
}

export const ReusableFileUpload: React.FC<ReusableFileUploadProps> = ({
  directoryCode,
  relativePath,
  defaultFileName = "",
  accept = "*/*",
  maxSizeMB = 20,
  disabled,
  label = "Subir archivo",
  className,
  enableDropzone = true,
  onUploaded,
  onError
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState<string>(defaultFileName);
  const [isUploading, setIsUploading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const sizeLimitBytes = useMemo(() => maxSizeMB * 1024 * 1024, [maxSizeMB]);

  const pickFile = () => inputRef.current?.click();

  const validateFile = useCallback(
    (f: File | null) => {
      if (!f) return "Selecciona un archivo.";
      if (f.size > sizeLimitBytes) return `El archivo excede ${maxSizeMB} MB.`;
      return null;
    },
    [sizeLimitBytes, maxSizeMB]
  );

  const applyFile = (f: File | null) => {
    const err = validateFile(f);
    if (err) {
      setErrorText(err);
      onError?.(err);
      setFile(null);
      return;
    }
    setErrorText(null);
    setFile(f);
    if (f && !customName) setCustomName(f.name);
  };

  const onSelect: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] ?? null;
    applyFile(f);
  };

  // Drag & Drop
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!enableDropzone || disabled || isUploading) return;
    const f = e.dataTransfer?.files?.[0];
    applyFile(f ?? null);
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!enableDropzone || disabled || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (!enableDropzone || disabled || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const clearSelection = () => {
    setFile(null);
    setCustomName(defaultFileName || "");
    if (inputRef.current) inputRef.current.value = "";
  };

  const doUpload = async () => {
    setErrorText(null);

    if (!directoryCode?.trim()) {
      const msg = "Falta el DirectoryCode.";
      setErrorText(msg);
      onError?.(msg);
      return;
    }
    if (!file) {
      const msg = "Selecciona un archivo.";
      setErrorText(msg);
      onError?.(msg);
      return;
    }
    const err = validateFile(file);
    if (err) {
      setErrorText(err);
      onError?.(err);
      return;
    }

    // Respeta nombres del Swagger
    const form = new FormData();
    form.append("DirectoryCode", directoryCode);
    if (relativePath) form.append("RelativePath", relativePath);
    const filename = getSafeFilename((customName || file.name).trim());
    if (filename) form.append("FileName", filename);
    form.append("File", file);

    setIsUploading(true);
    try {
      const resp: ApiResponse<any> = await FileManagementAPI.uploadFile(form);
      if (resp.status === "success") {
        onUploaded?.(resp.data);
        // Reset
        clearSelection();
      } else {
        const msg = handleApiError(resp.error, "No se pudo subir el archivo.");
        setErrorText(msg);
        onError?.(msg);
      }
    } catch (e: any) {
      const msg = e?.message ?? "Error de red";
      setErrorText(msg);
      onError?.(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className={`w-full ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {/* Zona seleccion/drag — responsive */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          role={enableDropzone ? "button" : undefined}
          aria-disabled={disabled || isUploading}
          tabIndex={enableDropzone ? 0 : -1}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && enableDropzone && !disabled && !isUploading) {
              pickFile();
            }
          }}
          className={[
            "rounded-xl border p-4 sm:p-5",
            "flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4",
            dragOver ? "border-dashed ring-2 ring-offset-2" : "border-dashed",
            disabled ? "opacity-60 pointer-events-none" : "cursor-pointer",
          ].join(" ")}
          onClick={() => !disabled && !isUploading && pickFile()}
        >
          <div className="shrink-0">
            <Upload className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              {enableDropzone ? (
                <>
                  Arrastra y suelta tu archivo aquí o{" "}
                  <span className="underline">haz clic para seleccionar</span>.
                </>
              ) : (
                <>Haz clic para seleccionar un archivo.</>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tipos permitidos: <code>{accept}</code> · Máx: {maxSizeMB} MB
            </p>
          </div>

          {file ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <FileIcon className="h-4 w-4" />
              <span className="text-sm truncate max-w-[220px] sm:max-w-[260px]">
                {file.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                aria-label="Quitar archivo"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        {/* Nombre de archivo */}
        <div className="grid gap-2">
          <Label htmlFor="filename">Nombre a guardar</Label>
          <Input
            id="filename"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Ej: contrato_001.pdf"
            disabled={disabled || isUploading}
            inputMode="text"
          />
        </div>

        {/* Info ruta */}
        {(relativePath || directoryCode) && (
          <p className="text-xs text-muted-foreground break-words">
            Se guardará en <code>{relativePath || "/"}</code> dentro de{" "}
            <code>{directoryCode}</code>.
          </p>
        )}

        {/* Errores */}
        {errorText && (
          <p className="text-sm text-destructive">{errorText}</p>
        )}

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={clearSelection}
            disabled={disabled || isUploading || (!file && !customName)}
          >
            Limpiar
          </Button>
          <Button
            type="button"
            onClick={doUpload}
            disabled={disabled || isUploading || !directoryCode}
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Subiendo…" : "Subir"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReusableFileUpload;
