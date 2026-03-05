import type {
  ProcessDto,
  DocumentRuleDto,
  PagedResultDto,
  InstanceListItemDto,
  InstanceDetailDto,
  DocumentDto,
  FileVersionDto,
  CreateInstanceRequest,
  CreateDocumentRequest,
  CreateMovementRequest,
  CreateMovementResponse,
  ReturnAuditItemDto,
  InstanceSearchParams,
  AuditSearchParams,
  DownloadResult,
  ProcessDynamicFieldsDto,
  UpdateProcessDynamicFieldsRequest,
  CreateProcessRequest,
  UpdateProcessRequest,
  CreateRuleRequest,
  UpdateRuleRequest,
} from "@/types/docflow/docflow-api.types";
import { apiFetch } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import { createApiError, getErrorMessage } from "@/lib/error-handling";
import { logger } from "@/lib/logger";

const DOCFLOW_PREFIX = "/api/v1/docflow";

async function docflowFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const fullPath = `${DOCFLOW_PREFIX}${path}`;
  const method = (init.method || "GET").toUpperCase();

  logger.api.request(method, fullPath, undefined);

  const result = await apiFetch<T>(fullPath, init);

  if (result.status === "error") {
    const err = result.error;

    if (err.code === 401) {
      logger.auth.warn("Token expirado o invalido - se requiere re-autenticacion");
    }

    logger.api.response(method, fullPath, err.code, 0);

    throw createApiError(
      err.code,
      err.details?.message || err.message || getErrorMessage(err.code),
      `ERR_${err.code}`
    );
  }

  return result.data;
}

export { DOCFLOW_PREFIX as API_BASE };

export const DocflowAPI = {
  processes: {
    getAll: () => docflowFetch<ProcessDto[]>("/processes"),
    getById: (id: number) => docflowFetch<ProcessDto>(`/processes/${id}`),
    getRules: (processId: number) => docflowFetch<DocumentRuleDto[]>(`/processes/${processId}/rules`),
    create: (data: CreateProcessRequest) =>
      docflowFetch<ProcessDto>("/processes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: UpdateProcessRequest) =>
      docflowFetch<ProcessDto>(`/processes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    createRule: (processId: number, data: CreateRuleRequest) =>
      docflowFetch<DocumentRuleDto>(`/processes/${processId}/rules`, { method: "POST", body: JSON.stringify(data) }),
    updateRule: (processId: number, ruleId: number, data: UpdateRuleRequest) =>
      docflowFetch<DocumentRuleDto>(`/processes/${processId}/rules/${ruleId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteRule: (processId: number, ruleId: number) =>
      docflowFetch<{ ok: boolean }>(`/processes/${processId}/rules/${ruleId}`, { method: "DELETE" }),
    getDynamicFields: (processId: number) => docflowFetch<ProcessDynamicFieldsDto>(`/processes/${processId}/dynamic-fields`),
    updateDynamicFields: (processId: number, data: UpdateProcessDynamicFieldsRequest) =>
      docflowFetch<{ ok: boolean }>(`/processes/${processId}/dynamic-fields`, { method: "PUT", body: JSON.stringify(data) }),
  },

  instances: {
    search: (params?: InstanceSearchParams) => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", String(params.page));
      if (params?.pageSize) query.set("pageSize", String(params.pageSize));
      if (params?.status) query.set("status", params.status);
      if (params?.processId) query.set("processId", String(params.processId));
      if (params?.q) query.set("q", params.q);
      if (params?.from) query.set("from", params.from);
      if (params?.to) query.set("to", params.to);
      const qs = query.toString();
      return docflowFetch<PagedResultDto<InstanceListItemDto>>(`/instances${qs ? `?${qs}` : ""}`);
    },
    getById: (id: string) => docflowFetch<InstanceDetailDto>(`/instances/${id}`),
    create: (data: CreateInstanceRequest) =>
      docflowFetch<{ instanceId: string }>("/instances", { method: "POST", body: JSON.stringify(data) }),
    getDocuments: (instanceId: string) =>
      docflowFetch<DocumentDto[]>(`/instances/${instanceId}/documents`),
    createDocument: (instanceId: string, data: CreateDocumentRequest) =>
      docflowFetch<DocumentDto>(`/instances/${instanceId}/documents`, { method: "POST", body: JSON.stringify(data) }),
    createMovement: (instanceId: string, data: CreateMovementRequest) =>
      docflowFetch<CreateMovementResponse>(`/instances/${instanceId}/movements`, { method: "POST", body: JSON.stringify(data) }),
  },

  documents: {
    getVersions: (documentId: string) =>
      docflowFetch<FileVersionDto[]>(`/documents/${documentId}/versions`),
    upload: async (documentId: string, file: File): Promise<FileVersionDto> => {
      const fullPath = `${DOCFLOW_PREFIX}/documents/${documentId}/upload`;

      logger.api.request("POST", fullPath, `[File: ${file.name}, ${file.size} bytes]`);

      const formData = new FormData();
      formData.append("file", file);

      const result = await apiFetch<FileVersionDto>(fullPath, {
        method: "POST",
        body: formData,
      });

      if (result.status === "error") {
        const err = result.error;
        throw createApiError(err.code, err.message || getErrorMessage(err.code), `ERR_${err.code}`);
      }

      return result.data;
    },
  },

  versions: {
    download: async (versionId: string): Promise<DownloadResult> => {
      const fullPath = `${DOCFLOW_PREFIX}/versions/${versionId}/download`;
      logger.api.request("GET", fullPath);

      const result = await apiFetch<Blob>(fullPath);

      if (result.status === "error") {
        throw createApiError(result.error.code, getErrorMessage(result.error.code), `ERR_${result.error.code}`);
      }

      const blob = result.data;
      const contentType = blob.type || "application/octet-stream";
      let filename = `file_${versionId}`;

      return { blob, filename, contentType };
    },
  },

  directory: {
    getParameters: (type: string) =>
      docflowFetch<any[]>(`/directory/${type}`),
  },

  audit: {
    getReturns: (params?: AuditSearchParams) => {
      const query = new URLSearchParams();
      if (params?.from) query.set("from", params.from);
      if (params?.to) query.set("to", params.to);
      if (params?.processId) query.set("processId", String(params.processId));
      if (params?.userId) query.set("userId", String(params.userId));
      const qs = query.toString();
      return docflowFetch<ReturnAuditItemDto[]>(`/audit/returns${qs ? `?${qs}` : ""}`);
    },
  },
};
