// src/components/job-activities/OccupationalGroupForm.tsx

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import type { OccupationalGroup, Degree } from "@/types/Job-activities";
import { TiposReferenciaAPI, type ApiResponse } from "@/lib/api";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";

interface OccupationalGroupFormProps {
  group: OccupationalGroup;
  degrees: Degree[];
  saving: boolean;
  onSave: (data: {
    groupId?: number;
    description: string;
    degreeId: number;
    rmu: number;
    uepScaleTypeId: number | null;
    isActive: boolean;
  }) => void;
  onCancel: () => void;
}

interface RefType {
  typeId: number;
  category?: string;
  code?: string;
  name: string;
  description: string;
  isActive?: boolean;
}

function ensureSuccess<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (res.status === "error") {
    throw new Error(res.error.message || defaultMessage);
  }
  return res.data;
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
  const [uepScaleTypeId, setUepScaleTypeId] = useState<string>(
    group.uepScaleTypeId ? String(group.uepScaleTypeId) : ""
  );

  // ===========================
  // CARGA ESCALA UEP (ref_Types / UEP_SCALE_TYPE)
  // ===========================

  const {
    data: uepScaleTypes,
    isLoading: loadingUepScaleTypes,
    error: uepScaleTypesError,
  } = useQuery<RefType[]>({
    queryKey: ["/api/v1/rh/ref/types", "UEP_SCALE_TYPE"],
    queryFn: async () => {
      const res = await TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.UEP_SCALE_TYPE);
      return ensureSuccess(res, "Error al cargar escala UEP");
    },
  });

  const activeUepScaleTypes = (uepScaleTypes ?? []).filter((t) => t.isActive !== false);

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
    setUepScaleTypeId(group.uepScaleTypeId ? String(group.uepScaleTypeId) : "");
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
      uepScaleTypeId: uepScaleTypeId ? Number(uepScaleTypeId) : null,
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
            className="border border-input rounded-md px-3 py-2 text-sm w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

      {/* Escala UEP (ref_Types UEP_SCALE_TYPE) — clasificación adicional opcional, no reemplaza RMU/Grado */}
      <div>
        <Label className="text-sm font-medium">Escala UEP (opcional)</Label>

        {uepScaleTypesError && (
          <p className="text-xs text-destructive mb-1">
            Error al cargar escala UEP. Intente refrescar la página.
          </p>
        )}

        <select
          className="border border-input rounded-md px-3 py-2 text-sm w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={uepScaleTypeId}
          onChange={(e) => setUepScaleTypeId(e.target.value)}
          disabled={loadingUepScaleTypes || !!uepScaleTypesError}
        >
          {loadingUepScaleTypes && (
            <option key="loading" value="">
              Cargando escala UEP...
            </option>
          )}

          {!loadingUepScaleTypes && (
            <>
              <option key="no-uep" value="">
                (sin clasificar)
              </option>
              {activeUepScaleTypes.map((t) => (
                <option key={t.typeId} value={t.typeId}>
                  {t.name}
                </option>
              ))}
            </>
          )}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Solo si este grupo ocupacional también se identifica bajo la nomenclatura UEP. No reemplaza el RMU/Grado.
        </p>
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
