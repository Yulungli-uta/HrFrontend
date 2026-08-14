import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  TiposReferenciaAPI,
  UserAccessScopesAPI,
  VwDepartmentWithTypeAPI,
  VistaDetallesEmpleadosAPI,
} from "@/lib/api";
import type { VwDepartmentWithType } from "@/lib/api/services/views";
import type { ReferenceType } from "@/types/department";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";

interface AssignAccessScopeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface EligibleEmployee {
  employeeID: number;
  firstName: string;
  lastName: string;
  email?: string | null;
}

const SCOPE_GLOBAL = "GLOBAL";

function parseEligibleDepartmentIds(metadata?: string | null): number[] | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    return Array.isArray(parsed?.eligibleDepartmentIds) ? parsed.eligibleDepartmentIds : null;
  } catch {
    return null;
  }
}

/** Expande un conjunto de departamentos a sí mismos + todos sus hijos recursivos. */
function expandDepartmentTree(rootIds: number[], allDepts: VwDepartmentWithType[]): Set<number> {
  const childrenByParent = new Map<number, number[]>();
  for (const d of allDepts) {
    if (d.parentID == null) continue;
    const list = childrenByParent.get(d.parentID) ?? [];
    list.push(d.departmentID);
    childrenByParent.set(d.parentID, list);
  }

  const result = new Set<number>(rootIds);
  const queue = [...rootIds];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }
  return result;
}

export default function AssignAccessScopeForm({ onSuccess, onCancel }: AssignAccessScopeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [employeeId, setEmployeeId] = useState("");
  const [moduleTypeId, setModuleTypeId] = useState("");
  const [scopeTypeId, setScopeTypeId] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");

  const { data: allDeptsResp } = useQuery({
    queryKey: ["vw-departments-all"],
    queryFn: () => VwDepartmentWithTypeAPI.getActive(),
  });
  const { data: moduleTypesResp, isLoading: moduleTypesLoading } = useQuery({
    queryKey: ["reftypes", REF_TYPE_CATEGORIES.ACCESS_MODULE_TYPE],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.ACCESS_MODULE_TYPE),
  });
  const { data: scopeTypesResp, isLoading: scopeTypesLoading } = useQuery({
    queryKey: ["reftypes", REF_TYPE_CATEGORIES.ACCESS_SCOPE_TYPE],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.ACCESS_SCOPE_TYPE),
  });

  const allDepts: VwDepartmentWithType[] = allDeptsResp?.status === "success" ? (allDeptsResp.data ?? []) : [];

  const moduleTypes: ReferenceType[] = moduleTypesResp?.status === "success" ? (moduleTypesResp.data ?? []) : [];
  const scopeTypes: ReferenceType[] = scopeTypesResp?.status === "success" ? (scopeTypesResp.data ?? []) : [];

  const selectedModule = moduleTypes.find((m) => String(m.typeId) === moduleTypeId);
  const selectedScope = scopeTypes.find((s) => String(s.typeId) === scopeTypeId);
  const isGlobalScope = selectedScope?.name === SCOPE_GLOBAL;

  // Departamentos elegibles para el módulo (raíz + hijos recursivos), como IDs —
  // se consulta directamente por DepartmentID, sin pasar por nombres (evita ambigüedad
  // de tildes/espacios y es más preciso si hubiera nombres duplicados).
  const eligibleDepartmentIds = useMemo(() => {
    const rootIds = parseEligibleDepartmentIds(selectedModule?.metadata);
    if (!rootIds || allDepts.length === 0) return null;

    return Array.from(expandDepartmentTree(rootIds, allDepts));
  }, [selectedModule, allDepts]);

  // Empleados elegibles: directamente los empleados (HrBackend) de los departamentos
  // configurados en el módulo. No se cruza con usuarios del sistema (RepositoryUta) —
  // el acceso se otorga al empleado, y en runtime se valida con su EmployeeId (JWT).
  const { data: eligibleEmployeesResp, isLoading: eligibleEmployeesLoading } = useQuery({
    queryKey: ["employees-by-department-ids", eligibleDepartmentIds],
    queryFn: async () => {
      const results = await Promise.all(
        (eligibleDepartmentIds ?? []).map((id) => VistaDetallesEmpleadosAPI.byDepartmentId(id))
      );
      return results.flatMap((r) => (r.status === "success" ? (r.data as EligibleEmployee[] ?? []) : []));
    },
    enabled: !!eligibleDepartmentIds && eligibleDepartmentIds.length > 0,
  });

  const eligibleEmployees: EligibleEmployee[] = eligibleEmployeesResp ?? [];

  // Si el empleado seleccionado deja de ser elegible al cambiar de módulo, se limpia.
  useEffect(() => {
    if (employeeId && !eligibleEmployees.some((e) => String(e.employeeID) === employeeId)) setEmployeeId("");
  }, [eligibleEmployees, employeeId]);

  useEffect(() => {
    if (isGlobalScope) setDepartmentId(null);
  }, [isGlobalScope]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await UserAccessScopesAPI.create({
        employeeId: Number(employeeId),
        moduleTypeId: Number(moduleTypeId),
        scopeTypeId: Number(scopeTypeId),
        departmentId: isGlobalScope ? null : departmentId,
        expiresAt: expiresAt || null,
        reason: reason || null,
      });
      if (res.status !== "success") {
        throw new Error(res.error?.message || "No se pudo asignar el acceso.");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-access-scopes"] });
      toast({ title: "Acceso asignado", description: "El alcance se asignó correctamente." });
      onSuccess();
    },
    onError: (error: unknown) => {
      toast({
        title: "Error al asignar acceso",
        description: error instanceof Error ? error.message : "No se pudo asignar el acceso.",
        variant: "destructive",
      });
    },
  });

  const isLoading =
    assignMutation.isPending || moduleTypesLoading || scopeTypesLoading || eligibleEmployeesLoading;
  const canSubmit =
    !!employeeId && !!moduleTypeId && !!scopeTypeId && (isGlobalScope || departmentId !== null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        assignMutation.mutate();
      }}
      className="space-y-5"
    >
      {/* Módulo: se elige primero porque determina qué empleados son elegibles */}
      <div className="space-y-2">
        <Label>
          Módulo / Trámite <span className="text-destructive">*</span>
        </Label>
        <Select value={moduleTypeId} onValueChange={setModuleTypeId} disabled={moduleTypesLoading}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione un módulo…" />
          </SelectTrigger>
          <SelectContent>
            {moduleTypes.map((m) => (
              <SelectItem key={m.typeId} value={String(m.typeId)}>
                {m.name === "CONTRACTS" ? "Contratos" : m.name === "PERSONNEL_ACTIONS" ? "Acciones de Personal" : m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>
          Empleado <span className="text-destructive">*</span>
        </Label>
        <Select
          value={employeeId}
          onValueChange={setEmployeeId}
          disabled={!moduleTypeId || eligibleEmployeesLoading}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                !moduleTypeId
                  ? "Primero seleccione un módulo…"
                  : eligibleEmployeesLoading
                    ? "Buscando empleados elegibles…"
                    : "Seleccione un empleado…"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {eligibleEmployees.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground w-full max-w-full whitespace-normal break-words">
                No hay empleados en los departamentos configurados para este módulo
              </div>
            ) : (
              eligibleEmployees.map((e) => (
                <SelectItem key={e.employeeID} value={String(e.employeeID)}>
                  {e.lastName} {e.firstName} {e.email && `· ${e.email}`}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Tipo de alcance <span className="text-destructive">*</span>
          </Label>
          <Select value={scopeTypeId} onValueChange={setScopeTypeId} disabled={scopeTypesLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione…" />
            </SelectTrigger>
            <SelectContent>
              {scopeTypes.map((s) => (
                <SelectItem key={s.typeId} value={String(s.typeId)}>
                  {s.name === "GLOBAL"
                    ? "Global (ve todo)"
                    : s.name === "DEPARTMENT_TREE"
                      ? "Departamento + hijos"
                      : s.name === "DEPARTMENT_ONLY"
                        ? "Solo ese departamento"
                        : s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Departamento {!isGlobalScope && <span className="text-destructive">*</span>}
          </Label>
          <DepartmentSelect
            value={departmentId}
            onChange={(value) => setDepartmentId(value)}
            disabled={isGlobalScope || !scopeTypeId}
            placeholder={isGlobalScope ? "No aplica (Global)" : "Seleccionar departamento…"}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Fecha de expiración (opcional)</Label>
        <Input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
        />
        <p className="text-sm text-muted-foreground">Si no se especifica, el acceso no expirará.</p>
      </div>

      <div className="space-y-2">
        <Label>Motivo (opcional)</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo por el cual se asigna este acceso"
          rows={3}
        />
      </div>

      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 dark:bg-primary/15">
        <p className="text-sm text-primary">
          <strong>Nota:</strong> "Departamento + hijos" otorga acceso a ese departamento y a todos los
          que estén debajo en la jerarquía (ej. una Facultad completa con sus escuelas).
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !canSubmit} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
          {isLoading ? "Asignando…" : "Asignar acceso"}
        </Button>
      </div>
    </form>
  );
}
