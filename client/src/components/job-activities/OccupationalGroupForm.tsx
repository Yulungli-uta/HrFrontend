// src/components/job-activities/OccupationalGroupForm.tsx

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import type { OccupationalGroup, Degree } from "@/types/Job-activities";

interface OccupationalGroupFormProps {
  group: OccupationalGroup;
  degrees: Degree[];
  saving: boolean;
  onSave: (data: {
    groupId?: number;
    description: string;
    degreeId: number;
    rmu: number;
    isActive: boolean;
  }) => void;
  onCancel: () => void;
}

export function OccupationalGroupForm({
  group,
  degrees,
  saving,
  onSave,
  onCancel,
}: OccupationalGroupFormProps) {
  const [description, setDescription] = useState(group.description ?? "");
  const [degreeId, setDegreeId] = useState<string>(
    group.degreeId
      ? String(group.degreeId)
      : degrees[0]?.degreeId?.toString() ?? ""
  );
  const [rmu, setRmu] = useState<string>(
    group.rmu != null ? group.rmu.toString() : "0"
  );
  const [isActive, setIsActive] = useState<boolean>(group.isActive);

  // Sincronizar cuando cambie el grupo a editar o cambie el listado de grados
  useEffect(() => {
    setDescription(group.description ?? "");
    setDegreeId(
      group.degreeId
        ? String(group.degreeId)
        : degrees[0]?.degreeId?.toString() ?? ""
    );
    setRmu(group.rmu != null ? group.rmu.toString() : "0");
    setIsActive(group.isActive);
  }, [
    group.groupId]);
  //   group.description,
  //   group.degreeId,
  //   group.rmu,
  //   group.isActive,
  //   degrees,
  // ]);

  const handleSubmit = () => {
    onSave({
      groupId: group.groupId || undefined,
      description: description.trim(),
      degreeId: degreeId ? Number(degreeId) : 0,
      rmu: Number(rmu) || 0,
      isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">
          Descripción del grupo ocupacional *
        </Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Técnico 1, Administrativo 3..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Grado asociado *</Label>
          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            value={degreeId}
            onChange={(e) => setDegreeId(e.target.value)}
          >
            <option key="degree-none" value="">
              Seleccione...
            </option>
            {degrees.map((d) => (
              <option key={d.degreeId} value={d.degreeId}>
                {d.description}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-sm font-medium">RMU *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={rmu}
            onChange={(e) => setRmu(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`group-active-${group.groupId ?? "nuevo"}`}
          type="checkbox"
          className="h-4 w-4"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <Label
          htmlFor={`group-active-${group.groupId ?? "nuevo"}`}
          className="text-sm"
        >
          Grupo activo
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
              Guardar grupo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
