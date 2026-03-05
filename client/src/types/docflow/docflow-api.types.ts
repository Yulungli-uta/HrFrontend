import type { ProcessHierarchy, DocumentRule, WorkflowInstance, DocflowDocument, FileVersion, WorkflowMovement } from "@/types/docflow/docflow.types";

export interface ProcessDto {
  processId: number;
  parentId: number | null;
  processCode: string;
  processName: string;
  responsibleDepartmentId: number;
  isActive: boolean;
}

export interface DocumentRuleDto {
  ruleId: number;
  processId: number;
  documentType: string;
  isRequired: boolean;
  minFiles?: number;
  maxFiles?: number;
  defaultVisibility: 1 | 2;
  allowVisibilityOverride: boolean;
}

export interface PagedResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface InstanceListItemDto {
  instanceId: string;
  processId: number;
  currentStatus: string;
  currentDepartmentId: number;
  assignedToUserId: number | null;
  createdAt: string;
}

export interface InstanceDetailDto {
  instanceId: string;
  processId: number;
  currentStatus: string;
  currentDepartmentId: number;
  assignedToUserId: number | null;
  dynamicMetadata: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface DocumentDto {
  documentId: string;
  instanceId: string;
  ruleId: number | null;
  documentName: string;
  createdByDepartmentId: number;
  visibility: 1 | 2;
  currentVersion: number;
  createdAt: string;
}

export interface FileVersionDto {
  versionId: string;
  documentId: string;
  versionNumber: number;
  fileExtension?: string | null;
  fileSizeInBytes?: number | null;
  createdAt: string;
}

export interface CreateInstanceRequest {
  initialProcessId: number;
  instanceName?: string;          // NUEVO CAMPO
  dynamicMetadataJson?: string;
}

export interface CreateDocumentRequest {
  ruleId?: number | null;
  documentName: string;
  visibility?: 1 | 2 | null;
}

export interface CreateMovementRequest {
  movementType: "FORWARD" | "RETURN";
  comments?: string | null;
  assignedToUserId?: number | null;
}

export interface CreateMovementResponse {
  ok: boolean;
}

export interface ReturnAuditItemDto {
  movementId: string;
  instanceId: string;
  createdAt: string;
  comments: string | null;
  createdBy: number | null;
  fromProcessId: number | null;
  toProcessId: number | null;
  fromDepartmentId: number | null;
  toDepartmentId: number | null;
}

export interface InstanceSearchParams {
  page?: number;
  pageSize?: number;
  status?: string;
  processId?: number;
  q?: string;
  from?: string;
  to?: string;
}

export interface AuditSearchParams {
  from?: string;
  to?: string;
  processId?: number;
  userId?: number;
}

export interface DynamicFieldSchemaDto {
  name: string;
  type: string;
  value?: any;
  required: boolean;
}

export interface ProcessDynamicFieldsDto {
  processId: number;
  dynamicFieldMetadata: DynamicFieldSchemaDto[];
}

export interface UpdateProcessDynamicFieldsRequest {
  dynamicFieldMetadata: DynamicFieldSchemaDto[];
}

export interface CreateProcessRequest {
  processName: string;
  parentId: number | null;
  responsibleDepartmentId?: number
  description?: string;
  isActive?: boolean;
}

export interface UpdateProcessRequest {
  processName?: string;
  parentId?: number | null;
  responsibleDepartmentId?: number
  description?: string;
  isActive?: boolean;
}

export interface CreateRuleRequest {
  documentType: string;
  isRequired: boolean;
  minFiles?: number;
  maxFiles?: number;
  defaultVisibility?: 1 | 2;
  allowVisibilityOverride?: boolean;
}

export interface UpdateRuleRequest {
  documentType?: string;
  isRequired?: boolean;
  minFiles?: number;
  maxFiles?: number;
  defaultVisibility?: 1 | 2;
  allowVisibilityOverride?: boolean;
}

export interface DownloadResult {
  blob: Blob;
  filename: string;
  contentType: string;
}

export const VISIBILITY_MAP = {
  1: "PUBLIC_WITHIN_CASE" as const,
  2: "PRIVATE_TO_UPLOADER_DEPT" as const,
};

export const VISIBILITY_REVERSE_MAP = {
  "PUBLIC_WITHIN_CASE": 1 as const,
  "PRIVATE_TO_UPLOADER_DEPT": 2 as const,
};

export function mapVisibilityToFrontend(v: 1 | 2): "PUBLIC_WITHIN_CASE" | "PRIVATE_TO_UPLOADER_DEPT" {
  return VISIBILITY_MAP[v] || "PUBLIC_WITHIN_CASE";
}

export function mapVisibilityToBackend(v: string): 1 | 2 {
  return VISIBILITY_REVERSE_MAP[v as keyof typeof VISIBILITY_REVERSE_MAP] || 1;
}

export function mapProcessesToHierarchy(flat: ProcessDto[]): ProcessHierarchy[] {
  const roots: ProcessHierarchy[] = [];
  const map = new Map<number, ProcessHierarchy>();

  for (const p of flat) {
    const node: ProcessHierarchy = {
      processId: p.processId,
      parentProcessId: p.parentId,
      processName: p.processName,
      description: null,
      processCode: p.processCode,
      responsibleDepartmentId: p.responsibleDepartmentId,
      isActive: p.isActive,
      createdBy: null,
      createdAt: "",
      updatedBy: null,
      updatedAt: null,
      children: [],
    };
    map.set(p.processId, node);
  }

  for (const p of flat) {
    const node = map.get(p.processId)!;
    if (p.parentId === null || !map.has(p.parentId)) {
      roots.push(node);
    } else {
      const parent = map.get(p.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    }
  }

  return roots;
}

export function mapRuleDtoToFrontend(dto: DocumentRuleDto): DocumentRule {
  return {
    ruleId: dto.ruleId,
    processId: dto.processId,
    docTypeName: dto.documentType,
    isMandatory: dto.isRequired,
    minFiles: dto.minFiles ?? (dto.isRequired ? 1 : 0),
    maxFiles: dto.maxFiles ?? 5,
    createdBy: null,
    createdAt: "",
    updatedBy: null,
    updatedAt: null,
  };
}

export function mapInstanceListItemToFrontend(
  dto: InstanceListItemDto,
  processMap: Map<number, ProcessDto>
): WorkflowInstance {
  const process = processMap.get(dto.processId);
  return {
    instanceId: dto.instanceId,
    processId: dto.processId,
    currentStatus: dto.currentStatus,
    currentDepartmentId: dto.currentDepartmentId,
    dynamicMetadata: null,
    createdBy: null,
    createdAt: dto.createdAt,
    updatedBy: null,
    updatedAt: null,
    processName: process?.processName,
  };
}

export function mapInstanceDetailToFrontend(
  dto: InstanceDetailDto,
  processMap: Map<number, ProcessDto>
): WorkflowInstance {
  const process = processMap.get(dto.processId);
  let metadata: Record<string, any> | null = null;
  if (dto.dynamicMetadata) {
    try { metadata = JSON.parse(dto.dynamicMetadata); } catch { metadata = null; }
  }
  return {
    instanceId: dto.instanceId,
    processId: dto.processId,
    currentStatus: dto.currentStatus,
    currentDepartmentId: dto.currentDepartmentId,
    dynamicMetadata: metadata,
    createdBy: null,
    createdAt: dto.createdAt,
    updatedBy: null,
    updatedAt: dto.updatedAt,
    processName: process?.processName,
  };
}

export function mapDocumentDtoToFrontend(dto: DocumentDto): DocflowDocument {
  return {
    documentId: dto.documentId,
    instanceId: dto.instanceId,
    ruleId: dto.ruleId,
    title: dto.documentName,
    internalDescription: null,
    currentVersion: dto.currentVersion,
    isDeleted: false,
    visibility: mapVisibilityToFrontend(dto.visibility),
    createdBy: null,
    createdAt: dto.createdAt,
    updatedBy: null,
    updatedAt: null,
  };
}

export function mapFileVersionDtoToFrontend(dto: FileVersionDto): FileVersion {
  return {
    versionId: dto.versionId,
    documentId: dto.documentId,
    versionNumber: dto.versionNumber,
    storagePath: "",
    fileExtension: dto.fileExtension || null,
    fileSizeInBytes: dto.fileSizeInBytes || null,
    checksumHash: null,
    changeLog: null,
    createdBy: null,
    createdAt: dto.createdAt,
  };
}

export function mapReturnAuditToMovement(dto: ReturnAuditItemDto): WorkflowMovement {
  return {
    movementId: dto.movementId,
    instanceId: dto.instanceId,
    fromStatus: null,
    toStatus: null,
    movementType: "RETURN",
    comments: dto.comments,
    assignedToUserId: null,
    createdBy: dto.createdBy,
    createdAt: dto.createdAt,
  };
}

export function extractFilenameFromContentDisposition(header: string | null, fallbackId: string, fallbackExt?: string): string {
  if (header) {
    const filenameMatch = header.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
    if (filenameMatch?.[1]) {
      return decodeURIComponent(filenameMatch[1].replace(/"/g, ""));
    }
  }
  return fallbackExt ? `${fallbackId}${fallbackExt}` : fallbackId;
}
