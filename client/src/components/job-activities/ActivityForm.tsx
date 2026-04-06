// src/components/job-activities/ActivityForm.tsx

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import type { Activity } from "@/types/Job-activities";

interface ActivityFormProps {
  activity: Activity;
  saving: boolean;
  onSave: (data: {
    activitiesID?: number;
    description: string;
    activitiesType: "LABORAL" | "ADICIONAL";
    isActive: boolean;
  }) => void;
  onCancel: () => void;
}

export function ActivityForm({
  activity,
  saving,
  onSave,
  onCancel,
}: ActivityFormProps) {
  const [description, setDescription] = useState(activity.description ?? "");
  const [isActive, setIsActive] = useState<boolean>(activity.isActive);

  useEffect(() => {
    setDescription(activity.description ?? "");
    setIsActive(activity.isActive);
  }, [activity.activitiesID, activity.description, activity.isActive]);

  const handleSubmit = () => {
    onSave({
      activitiesID: activity.activitiesID || undefined,
      description: description.trim(),
      activitiesType: activity.activitiesType,
      isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Tipo de actividad</Label>
        <div className="flex gap-2 text-xs">
          <Badge
            variant="outline"
            className={
              activity.activitiesType === "LABORAL"
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary/10 text-secondary-foreground border-warning/30"
            }
          >
            {activity.activitiesType === "LABORAL" ? "Laboral" : "Adicional"}
          </Badge>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Descripción *</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Detalle la actividad que realizará el servidor..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`activity-active-${activity.activitiesID || "nuevo"}`}
          type="checkbox"
          className="h-4 w-4"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <Label
          htmlFor={`activity-active-${activity.activitiesID || "nuevo"}`}
          className="text-sm"
        >
          Actividad activa
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
              Guardar actividad
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
