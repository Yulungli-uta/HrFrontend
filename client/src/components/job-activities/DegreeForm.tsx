// src/components/job-activities/DegreeForm.tsx

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import type { Degree } from "@/types/Job-activities";

interface DegreeFormProps {
  degree: Degree;
  saving: boolean;
  onSave: (data: {
    degreeId?: number;
    description: string;
    isActive: boolean;
  }) => void;
  onCancel: () => void;
}

export function DegreeForm({
  degree,
  saving,
  onSave,
  onCancel,
}: DegreeFormProps) {
  const [description, setDescription] = useState(degree.description ?? "");
  const [isActive, setIsActive] = useState<boolean>(degree.isActive);

  // Sincronizar cuando cambie el grado recibido (ej. al abrir otro para editar)
  useEffect(() => {
    setDescription(degree.description ?? "");
    setIsActive(degree.isActive);
  }, [degree.degreeId, degree.description, degree.isActive]);

  const handleSubmit = () => {
    onSave({
      // si es nuevo, degreeId vendrá undefined
      degreeId: degree.degreeId || undefined,
      description: description.trim(),
      isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Descripción del grado *</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Tercer nivel, Cuarto nivel..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`degree-active-${degree.degreeId ?? "nuevo"}`}
          type="checkbox"
          className="h-4 w-4"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <Label
          htmlFor={`degree-active-${degree.degreeId ?? "nuevo"}`}
          className="text-sm"
        >
          Grado activo
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Guardar grado
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
