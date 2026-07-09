// src/components/certification-finance/FinancialCertificationFieldsForm.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FinancialCertificationFieldsState = {
  certCode?: string;
  certNumber?: string | null;
  budget?: string | null;
  certBudgetDate?: string; // "YYYY-MM-DD"
  rmuHour?: number | null;
  rmuCon?: number | null;
};

type Props = {
  value: FinancialCertificationFieldsState;
  onChange: (v: FinancialCertificationFieldsState) => void;
  disabled?: boolean;
};

/**
 * Campos puros de una certificación financiera (sin selector de Request ID,
 * sin documentos, sin panel de aprobar/rechazar). Se usa tanto en el modal
 * dedicado de Certificación Financiera como embebido en Solicitud de Contratos.
 */
export function FinancialCertificationFieldsForm({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="certCode">Código *</Label>
        <Input
          id="certCode"
          value={value.certCode ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, certCode: e.target.value })}
          placeholder="Ej: CERT-2025-001"
        />
      </div>

      <div>
        <Label htmlFor="certNumber">Número *</Label>
        <Input
          id="certNumber"
          value={value.certNumber ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, certNumber: e.target.value })}
          placeholder="Ej: 1100"
        />
      </div>

      <div>
        <Label htmlFor="budget">Presupuesto *</Label>
        <Input
          id="budget"
          value={value.budget ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, budget: e.target.value })}
          placeholder="Ej: Cert. 1100 / POA 2025"
        />
      </div>

      <div>
        <Label htmlFor="certBudgetDate">Fecha de Certificación *</Label>
        <Input
          id="certBudgetDate"
          type="date"
          disabled={disabled}
          value={value.certBudgetDate ?? ""}
          onChange={(e) => onChange({ ...value, certBudgetDate: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="rmuHour">RMU por Hora</Label>
        <Input
          id="rmuHour"
          type="number"
          step="0.01"
          disabled={disabled}
          value={value.rmuHour ?? 0}
          onChange={(e) => onChange({ ...value, rmuHour: Number(e.target.value) })}
        />
      </div>

      <div>
        <Label htmlFor="rmuCon">RMU por Contrato</Label>
        <Input
          id="rmuCon"
          type="number"
          step="0.01"
          disabled={disabled}
          value={value.rmuCon ?? 0}
          onChange={(e) => onChange({ ...value, rmuCon: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
