// src/components/contracts/contracts.utils.ts
export type ContractLike = {
  contractID?: number;
  ContractID?: number;
  id?: number;
  rowVersion?: string | null;

  certificationID?: number | null;
  parentID?: number | null;

  contractCode?: string;

  personID?: number;
  contractTypeID?: number;
  departmentID?: number;
  jobID?: number | null;

  startDate?: string;
  endDate?: string;

  status?: number;
  contractDescription?: string | null;
};

/**
 * Convierte IDs heterogéneos (number/string/object) a number.
 * Se usa para lookups (Personas/Departamentos/etc.) donde getEntityId puede variar.
 */
export function extractNumericId(obj: unknown): number | undefined {
  const raw: any = obj;
  if (raw == null) return undefined;

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return undefined;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
    const m = s.match(/\d+/);
    if (m) {
      const n2 = Number(m[0]);
      if (Number.isFinite(n2)) return n2;
    }
    return undefined;
  }

  if (typeof raw === "object") {
    const candidates = [
      raw.id,
      raw.value,
      raw.typeID,
      raw.TypeID,
      raw.personID,
      raw.PersonID,
      raw.departmentID,
      raw.DepartmentID,
      raw.jobID,
      raw.JobID,
      raw.certificationID,
      raw.CertificationID,
      raw.contractTypeID,
      raw.ContractTypeID,
    ];
    for (const c of candidates) {
      const n = extractNumericId(c);
      if (typeof n === "number") return n;
    }
  }

  return undefined;
}

export type SearchItem = { value: string; label: string };

export function toSearchItems(items: any[], getId: (x: any) => unknown, getLabel: (x: any) => unknown): SearchItem[] {
  const seen = new Set<number>();
  const out: SearchItem[] = [];

  for (const x of items ?? []) {
    const id = extractNumericId(getId(x));
    if (!id || !Number.isFinite(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ value: String(id), label: String(getLabel(x) ?? id) });
  }

  return out;
}

export function getContractId(x?: ContractLike | null): number | undefined {
  const v = x?.contractID ?? x?.ContractID ?? x?.id;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export type ContractsCreateDto = {
  certificationID?: number | null;
  parentID?: number | null;

  contractCode: string;

  personID: number;
  contractTypeID: number;
  departmentID: number;
  jobID?: number | null;

  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd

  // StatusTypeID (RefTypes TypeID)
  status: number;

  contractDescription?: string | null;
};

export type ContractsUpdateDto = ContractsCreateDto & {
  contractID: number;
  rowVersion?: string | null;
};

export function buildEmptyForm(initial?: Partial<ContractsCreateDto>): ContractsCreateDto {
  return {
    contractCode: "",
    personID: 0,
    contractTypeID: 0,
    departmentID: 0,
    jobID: null,
    certificationID: null,
    parentID: null,
    startDate: "",
    endDate: "",
    status: 0,
    contractDescription: null,
    ...initial,
  };
}

export function buildFormFromSelected(
  selected?: ContractLike | null,
  initial?: Partial<ContractsCreateDto>
): ContractsCreateDto {
  return {
    certificationID: selected?.certificationID ?? null,
    parentID: selected?.parentID ?? null,
    contractCode: selected?.contractCode ?? "",
    personID: selected?.personID ?? 0,
    contractTypeID: selected?.contractTypeID ?? 0,
    departmentID: selected?.departmentID ?? 0,
    jobID: selected?.jobID ?? null,
    startDate: (selected?.startDate ?? "").slice(0, 10),
    endDate: (selected?.endDate ?? "").slice(0, 10),
    status: selected?.status ?? 0,
    contractDescription: selected?.contractDescription ?? null,
    ...initial,
  };
}

export function validateContractForm(form: ContractsCreateDto): string | null {
  if (!form.contractCode?.trim()) return "ContractCode es obligatorio.";
  if (!form.personID || form.personID <= 0) return "PersonID es obligatorio.";
  if (!form.contractTypeID || form.contractTypeID <= 0) return "ContractTypeID es obligatorio.";
  if (!form.departmentID || form.departmentID <= 0) return "DepartmentID es obligatorio.";
  if (!form.startDate) return "StartDate es obligatorio.";
  if (!form.endDate) return "EndDate es obligatorio.";

  // Validación contractual mínima
  const a = new Date(form.startDate);
  const b = new Date(form.endDate);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "Fechas inválidas.";
  if (a.getTime() > b.getTime()) return "La fecha de inicio no puede ser mayor que la fecha fin.";

  return null;
}
