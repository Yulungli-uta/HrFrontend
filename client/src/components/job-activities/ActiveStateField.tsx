// src/components/job-activities/ActiveStateField.tsx
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Props {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Nombre del registro, para el texto de ayuda (p. ej. "grado", "grupo"). */
  noun: string;
}

/** Interruptor de estado activo/inactivo con su explicación, igual en todos los diálogos de catálogo. */
export function ActiveStateField({ id, checked, onChange, noun }: Props) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {checked ? "Activo" : "Inactivo"}
        </Label>
        <p className="text-xs text-muted-foreground">
          {checked ? `El ${noun} se ofrece al asignar cargos.` : `El ${noun} deja de ofrecerse, sin borrar su historial.`}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
