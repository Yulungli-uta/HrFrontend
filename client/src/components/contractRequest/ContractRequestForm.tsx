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

import type { ContractRequestCreate } from "@/types/contractRequest";
import type { SelectItem as CatalogItem } from "@/services/contractRequest/contractRequestService";

type Props = {
  value: ContractRequestCreate;
  onChange: (v: ContractRequestCreate) => void;

  workModalities: CatalogItem[];
  departments: CatalogItem[];
  statuses: CatalogItem[];

  disabled?: boolean;
};

export function ContractRequestForm({
  value,
  onChange,
  workModalities,
  departments,
  statuses,
  disabled,
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
        <Select
          value={value.departmentId ? String(value.departmentId) : ""}
          onValueChange={(v) => onChange({ ...value, departmentId: v ? Number(v) : null })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione un departamento" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Número de personas a contratar *</Label>
        <Input
          type="number"
          min={1}
          value={value.numberOfPeopleToHire}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({ ...value, numberOfPeopleToHire: Number.isFinite(n) ? Math.max(1, n) : 1 });
          }}
          placeholder="Ej: 1"
        />
        <p className="text-xs text-muted-foreground mt-1">No se permite 0 ni negativos.</p>
      </div>

      <div>
        <Label>Número de horas</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={value.numberHour}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({ ...value, numberHour: Number.isFinite(n) ? Math.max(0, n) : 0 });
          }}
          placeholder="Ej: 20.00"
        />
      </div>

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
