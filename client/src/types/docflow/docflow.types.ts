import { z } from "zod";

export interface DocflowUser {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
}

export interface ProcessHierarchy {
  processId: number;
  parentProcessId: number | null;
  processName: string;
  description: string | null;
  processCode?: string;
  responsibleDepartmentId?: number;
  isActive?: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  children?: ProcessHierarchy[];
}

export interface DocumentRule {
  ruleId: number;
  processId: number;
  docTypeName: string;
  isMandatory: boolean;
  minFiles: number;
  maxFiles: number;
  defaultVisibility?: 1 | 2;
  allowVisibilityOverride?: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
}

export interface WorkflowInstance {
  instanceId: string | number;
  processId: number;
  rootProcessId?: number;              // NUEVO
  instanceName?: string;                // NUEVO
  currentStatus: string;
  currentDepartmentId?: number;
  assignedToUserId?: number | null;
  dynamicMetadata: Record<string, any> | null;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  processName?: string;
  createdByName?: string;
  totalFiles?: number;
  currentDepartmentName?: string;
}

export interface CreateInstanceRequest {
  initialProcessId: number;       // Cambiar de processId a initialProcessId
  instanceName?: string;          // NUEVO CAMPO
  dynamicMetadata?: string;
  assignedToUserId?: number;
}

export type DocumentVisibility = "PUBLIC_WITHIN_CASE" | "PRIVATE_TO_UPLOADER_DEPT";

export interface DocflowDocument {
  documentId: string | number;
  instanceId: string | number;
  ruleId: number | null;
  title: string;
  internalDescription: string | null;
  currentVersion: number;
  isDeleted: boolean;
  visibility: DocumentVisibility;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  versions?: FileVersion[];
  ruleName?: string;
  uploaderDeptName?: string;
}

export interface FileVersion {
  versionId: string | number;
  documentId: string | number;
  versionNumber: number;
  storagePath: string;
  fileExtension: string | null;
  fileSizeInBytes: number | null;
  checksumHash: string | null;
  changeLog: string | null;
  createdBy: number | null;
  createdAt: string;
  createdByName?: string;
}

export interface WorkflowMovement {
  movementId: string | number;
  instanceId: string | number;
  fromStatus: string | null;
  toStatus: string | null;
  movementType: string;
  comments: string | null;
  assignedToUserId: number | null;
  createdBy: number | null;
  createdAt: string;
  createdByName?: string;
  assignedToName?: string;
  processName?: string;
  departmentName?: string;
}

export interface GroupedRuleCompletion {
  processId: number;
  processName: string;
  isCurrentProcess: boolean;
  rules: {
    rule: DocumentRule;
    uploaded: number;
    isComplete: boolean;
    docs: DocflowDocument[];
  }[];
}

export interface MandatoryCompletion {
  allComplete: boolean;
  pending: number;
  total: number;
  pendingNames: string[];
}

export type DynamicFieldType = "string" | "number" | "boolean" | "date";

export interface DynamicFieldSchema {
  name: string;
  type: DynamicFieldType;
  value?: any;
  required: boolean;
}

export interface ProcessDynamicFields {
  processId: number;
  dynamicFieldMetadata: DynamicFieldSchema[];
}

export type InstanceStatus = "Borrador" | "Pendiente" | "En Revision" | "Aprobado" | "Retornado" | "Finalizado";
export type MovementType = "FORWARD" | "RETURN";

export interface InstancePermissions {
  canAdvance: boolean;
  canReturn: boolean;
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  reason?: string;
}

export const instanceStatusColors: Record<string, string> = {
  "Borrador": "bg-muted text-muted-foreground",
  "Pendiente": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "En Revision": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Aprobado": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "Retornado": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Finalizado": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export const insertDocumentRuleSchema = z.object({
  processId: z.number().min(1),
  docTypeName: z.string().min(1, "El nombre del tipo de documento es requerido"),
  isMandatory: z.boolean().default(true),
  minFiles: z.number().min(0).default(1),
  maxFiles: z.number().min(1).default(5),
});

// export const insertWorkflowInstanceSchema = z.object({
//   processId: z.number().min(1),
//   currentStatus: z.string().default("Borrador"),
//   dynamicMetadata: z.record(z.any()).optional(),
//   assignedToUserId: z.number().optional(),
// });
export const insertWorkflowInstanceSchema = z.object({
  processId: z.number().min(1),
  instanceName: z.string().optional(),           // NUEVO
  dynamicMetadata: z.record(z.any()).optional(),
  assignedToUserId: z.number().optional(),
});

export const insertDocumentSchema = z.object({
  instanceId: z.union([z.string(), z.number()]),
  ruleId: z.number().nullable().optional(),
  title: z.string().min(1, "El titulo es requerido"),
  internalDescription: z.string().optional(),
  visibility: z.enum(["PUBLIC_WITHIN_CASE", "PRIVATE_TO_UPLOADER_DEPT"]).default("PUBLIC_WITHIN_CASE"),
});

export const insertMovementSchema = z.object({
  instanceId: z.union([z.string(), z.number()]),
  fromStatus: z.string().optional(),
  toStatus: z.string().min(1),
  movementType: z.enum(["FORWARD", "RETURN"]),
  comments: z.string().optional(),
  assignedToUserId: z.number().optional(),
});

export type NotificationType = "RETURN" | "PENDING_MANDATORY";

export interface DocflowNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  instanceId: string | number;
  processName?: string;
  isRead: boolean;
  createdAt: string;
}

export const insertProcessSchema = z.object({
  processName: z.string().min(1, "El nombre del proceso es requerido"),
  parentProcessId: z.number().nullable().default(null),
  responsibleDepartmentId: z.number().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type InsertProcess = z.infer<typeof insertProcessSchema>;
export type InsertDocumentRule = z.infer<typeof insertDocumentRuleSchema>;
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertMovement = z.infer<typeof insertMovementSchema>;
