import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DB_FIELD_LIMITS } from "@/features/dbFieldLimits";

interface OrcidEntryFieldsProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  /** Nombre que publica ORCID cuando no coincide con el de la persona: se pide confirmar antes de guardar. */
  confirmName: string | null;
  disabled?: boolean;
}

/** Campo del ORCID con su error y el aviso de confirmación de nombre. Lo usan la tarjeta, la ventana de aviso y el diálogo de sincronización. */
export function OrcidEntryFields({ id, value, onChange, error, confirmName, disabled }: OrcidEntryFieldsProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>ORCID</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        maxLength={DB_FIELD_LIMITS.researcher.orcid + 24}
        placeholder="0000-0002-1825-0097"
        onChange={(e) => onChange(e.target.value)}
      />
      {confirmName !== null && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Este ORCID pertenece a <strong>{confirmName}</strong>, y no coincide con el nombre registrado de la persona. Si es la
            misma persona, pulse «Confirmar y guardar»; si no, revise el número.
          </span>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
