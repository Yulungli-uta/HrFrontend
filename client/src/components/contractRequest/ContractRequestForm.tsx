// src/components/contractRequest/ContractRequestForm.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";

import type { ContractRequestCreate } from "@/types/contractRequest";
import type { SelectItem as CatalogItem } from "@/services/contractRequest/contractRequestService";

type Props = {
  value: ContractRequestCreate;
  onChange: (v: ContractRequestCreate) => void;

  workModalities: CatalogItem[];
  statuses: CatalogItem[];

  disabled?: boolean;
  /** Oculta el selector de estado (modo creación o edición donde el estado no es editable por el usuario) */
  hideStatus?: boolean;
};

export function ContractRequestForm({
  value,
  onChange,
  workModalities,
  statuses,
  disabled,
  hideStatus,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div>
        <Label>Modalidad de trabajo *</Label>
        <Select
          value={value.workModalityId ? String(value.workModalityId) : ""}
          onValueChange={(v) => onChange({ ...value, workModalityId: v ? Number(v) : null })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione una modalidad" />
          </SelectTrigger>
          <SelectContent>
            {workModalities.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Departamento solicitante *</Label>
        <DepartmentSelect
          value={value.departmentId ?? null}
          onChange={(id) => onChange({ ...value, departmentId: id })}
          disabled={disabled}
          placeholder="Seleccione un departamento"
        />
      </div>

      <div>
        <Label>Número de personas a contratar *</Label>
        <Input
          type="number"
          min={1}
          step={1}
          value={value.numberOfPeopleToHire}
          disabled={disabled}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange({ ...value, numberOfPeopleToHire: Number.isFinite(n) && n > 0 ? n : 1 });
          }}
          placeholder="Ej: 1"
        />
        <p className="text-xs text-muted-foreground mt-1">Solo enteros mayores a 0. No se permiten decimales.</p>
      </div>

      <div>
        <Label>Número de horas *</Label>
        <Input
          type="number"
          min={0.01}
          step="0.01"
          value={value.numberHour}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({ ...value, numberHour: Number.isFinite(n) ? n : 0 });
          }}
          placeholder="Ej: 20.00"
        />
        <p className="text-xs text-muted-foreground mt-1">Debe ser mayor a 0.</p>
      </div>

      {!hideStatus && (
        <div>
          <Label>Estado *</Label>
          <Select
            value={value.status != null ? String(value.status) : ""}
            onValueChange={(v) => onChange({ ...value, status: v ? Number(v) : null })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un estado" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="md:col-span-2">
        <Label>Observación</Label>
        <Textarea
          value={value.observation ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, observation: e.target.value })}
          placeholder="Observación (máx. 1000 caracteres)"
        />
      </div>
    </div>
  );
}
