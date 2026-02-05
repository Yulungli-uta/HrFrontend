// src/services/contractRequest/contractRequestService.ts
import {
  ContractRequestAPI,
  DepartamentosAPI,
  DirectoryParametersAPI,
  TiposReferenciaAPI,
  type ApiResponse,
} from "@/lib/api";

import type { ContractRequestCreate, ContractRequestDto } from "@/types/contractRequest";
import type { DirectoryParameter } from "@/types/directoryParameter";

export type SelectItem = { id: number; name: string };

export type DirectoryUiParams = {
  accept: string;
  maxSizeMB: number;
  relativePath: string;
};

function toAcceptFromExtension(ext?: string): string {
  if (!ext) return "*/*";
  const parts = ext
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith(".") ? s : `.${s}`));
  return parts.length ? parts.join(",") : "*/*";
}

function getTypeId(x: any): number {
  return Number(x?.typeID ?? x?.typeId ?? x?.typeid ?? x?.id ?? x?.Id);
}

function getName(x: any): string {
  return String(x?.name ?? x?.Name ?? x?.description ?? x?.Description ?? "").trim();
}

function isActive(x: any): boolean {
  const v = x?.isActive ?? x?.IsActive;
  return v === undefined ? true : Boolean(v);
}

function normalizeRefList(list: any[] | undefined | null): SelectItem[] {
  return (list ?? [])
    .filter((x) => isActive(x))
    .map((x) => ({ id: getTypeId(x), name: getName(x) }))
    .filter((x) => Number.isFinite(x.id) && x.id > 0 && x.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function extractRequestId(resp: any): number | null {
  const id =
    resp?.data?.requestId ??
    resp?.data?.RequestId ??
    resp?.data?.requestID ??
    resp?.data?.RequestID ??
    resp?.data?.id ??
    resp?.data?.Id;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Sanitiza para evitar negativos/ceros y normaliza strings */
export function normalizeCreatePayload(input: ContractRequestCreate): ContractRequestCreate {
  const people = Math.max(1, Number(input.numberOfPeopleToHire || 1));
  const hours = Math.max(0, Number(input.numberHour || 0));

  return {
    ...input,
    workModalityId: input.workModalityId ?? null,
    departmentId: input.departmentId ?? null,
    status: input.status ?? null,
    numberOfPeopleToHire: people,
    numberHour: hours,
    observation: (input.observation ?? "").trim() || undefined,
  };
}

export const contractRequestService = {
  /** ===== CRUD principal ===== */
  async list(): Promise<ApiResponse<ContractRequestDto[]>> {
    return ContractRequestAPI.list();
  },

  async createAndGetId(payload: ContractRequestCreate): Promise<{ id: number; resp: ApiResponse<any> }> {
    const safe = normalizeCreatePayload(payload);
    const resp = await ContractRequestAPI.create(safe as any);

    if (resp.status !== "success") return { id: 0, resp };

    const id = extractRequestId(resp);
    return { id: id ?? 0, resp };
  },

  /** ===== Catálogos (combos) ===== */
  async listWorkModalities(): Promise<ApiResponse<SelectItem[]>> {
    const resp = await TiposReferenciaAPI.byCategory("WORK_MODALITY");
    if (resp.status !== "success") return resp as any;
    return { status: "success", data: normalizeRefList(resp.data) };
  },

  async listContractRequestStatuses(): Promise<ApiResponse<SelectItem[]>> {
    const resp = await TiposReferenciaAPI.byCategory("CONTRACT_REQUEST_STATUS");
    if (resp.status !== "success") return resp as any;
    return { status: "success", data: normalizeRefList(resp.data) };
  },

  async listDepartments(): Promise<ApiResponse<SelectItem[]>> {
    // si tu lib expone DepartamentosAPI.list(), úsalo directamente
    const resp = await (DepartamentosAPI as any).list();
    if (resp.status !== "success") return resp as any;

    // Dedupe por departmentId (evita repetidos)
    const byId = new Map<number, SelectItem>();

    for (const d of resp.data ?? []) {
      const id = Number(
        d?.departmentId ??
          d?.departmentID ??
          d?.DepartmentId ??
          d?.DepartmentID ??
          d?.id ??
          d?.Id
      );

      const name = String(d?.name ?? d?.Name ?? "").trim();

      if (!Number.isFinite(id) || id <= 0 || !name) continue;

      if (!byId.has(id)) byId.set(id, { id, name });
    }

    const items = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { status: "success", data: items };
  },

  /** ===== Parámetros de directorio para adjuntos ===== */
  async getDirectoryParamsByCode(code: string): Promise<ApiResponse<DirectoryParameter>> {
    return DirectoryParametersAPI.getByCode(code);
  },

  normalizeDirectoryParams(param?: DirectoryParameter | null): DirectoryUiParams {
    return {
      accept: toAcceptFromExtension(param?.extension),
      maxSizeMB: Number.isFinite(Number(param?.maxSizeMb)) ? Number(param?.maxSizeMb) : 20,
      relativePath: param?.relativePath ?? "",
    };
  },
};
