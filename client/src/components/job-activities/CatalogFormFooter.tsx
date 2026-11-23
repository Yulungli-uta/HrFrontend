// src/components/job-activities/CatalogFormFooter.tsx
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  saving: boolean;
  /** Texto del botón principal (p. ej. "Guardar grado"). */
  saveLabel: string;
  onCancel: () => void;
}

/** Pie común de los diálogos de catálogo: cancelar y guardar, con el estado "Guardando...". */
export function CatalogFormFooter({ saving, saveLabel, onCancel }: Props) {
  return (
    <div className="flex justify-end gap-2 border-t pt-3 flex-wrap">
      <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
        <XCircle className="mr-1 h-4 w-4" />
        Cancelar
      </Button>
      <Button type="submit" disabled={saving}>
        {saving ? (
          <>
            <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-1 h-4 w-4" />
            {saveLabel}
          </>
        )}
      </Button>
    </div>
  );
}
