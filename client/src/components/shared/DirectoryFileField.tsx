// src/components/shared/DirectoryFileField.tsx
import { useRef, useState, type ReactNode } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDirectoryParams } from "@/hooks/directoryParams/useDirectoryParams";

interface DirectoryFileFieldProps {
  /** Código del directorio de archivos (HR.TBL_DirectoryParameters): de él salen los tipos permitidos y el tamaño máximo. */
  directoryCode: string;
  label: string;
  /** Archivo elegido (se envía junto con el formulario; este campo no sube nada por sí solo). */
  value: File | null;
  onChange: (file: File | null) => void;
  /** Mensaje de error del formulario (p. ej. el de Zod). */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Archivo ya guardado (edición), p. ej. un enlace para verlo. */
  existing?: ReactNode;
  id?: string;
  /** Si el directorio no se puede consultar, tipos permitidos de respaldo. */
  fallbackAccept?: string;
  fallbackMaxSizeMB?: number;
}

const toLabel = (accept: string) =>
  accept === "*/*" ? "cualquier archivo" : accept.split(",").map((e) => e.replace(".", "").toUpperCase()).join(", ");

/**
 * Campo de archivo compacto de UNA fila (botón + nombre truncado + quitar), para formularios con varios archivos.
 * A diferencia de ReusableFileUpload (tarjeta con zona de arrastre y subida propia), aquí el archivo solo se
 * selecciona y se valida contra el directorio configurado; quien lo usa lo envía con el formulario.
 */
export function DirectoryFileField({
  directoryCode,
  label,
  value,
  onChange,
  error,
  required,
  disabled,
  existing,
  id,
  fallbackAccept = ".pdf",
  fallbackMaxSizeMB = 15,
}: DirectoryFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { directory, params } = useDirectoryParams(directoryCode);
  const [localError, setLocalError] = useState<string | null>(null);

  const accept = directory ? params.accept : fallbackAccept;
  const maxSizeMB = directory ? params.maxSizeMB : fallbackMaxSizeMB;
  const inputId = id ?? `file-${directoryCode}-${label}`.replace(/\s+/g, "-");

  const handleSelect = (file: File | null) => {
    setLocalError(null);
    if (!file) return;

    if (accept !== "*/*") {
      const allowed = accept.split(",").map((e) => e.trim().toLowerCase());
      const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      if (!allowed.includes(ext)) {
        setLocalError(`Solo se permite: ${toLabel(accept)}.`);
        return;
      }
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`El archivo supera el máximo de ${maxSizeMB} MB.`);
      return;
    }
    onChange(file);
  };

  const shownError = localError ?? error;

  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={inputId}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>

      <div className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 ${shownError ? "border-destructive" : ""}`}>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            handleSelect(e.target.files?.[0] ?? null);
            e.target.value = ""; // permite volver a elegir el mismo archivo
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <Paperclip className="mr-1.5 h-4 w-4" />
          {value ? "Cambiar" : "Seleccionar"}
        </Button>
        <span className={`min-w-0 flex-1 truncate text-sm ${value ? "" : "text-muted-foreground"}`} title={value?.name}>
          {value ? value.name : "Ningún archivo"}
        </span>
        {value && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Quitar archivo" disabled={disabled} onClick={() => { setLocalError(null); onChange(null); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {toLabel(accept)} · máx. {maxSizeMB} MB
      </p>
      {existing}
      {shownError && <p className="text-sm text-destructive">{shownError}</p>}
    </div>
  );
}
