import type {
  DocflowUser,
  ProcessHierarchy,
  DocumentRule,
  WorkflowInstance,
  DocflowDocument,
  FileVersion,
  WorkflowMovement,
  InsertProcess,
  InsertDocumentRule,
  InsertWorkflowInstance,
  InsertDocument,
  InsertMovement,
  InstancePermissions,
  GroupedRuleCompletion,
  DynamicFieldSchema,
  ProcessDynamicFields,
  DocflowNotification,
} from "@/types/docflow/docflow.types";

export interface DashboardStats {
  totalInstances: number;
  byStatus: Record<string, number>;
  totalDocuments: number;
  totalMovements: number;
  recentReturns: number;
}

export interface IDocflowService {
  getUsers(): DocflowUser[];
  getUserById(id: number): DocflowUser | undefined;

  getProcesses(): ProcessHierarchy[];
  getProcessById(id: number): ProcessHierarchy | undefined;
  createProcess(data: InsertProcess): ProcessHierarchy | Promise<ProcessHierarchy>;
  updateProcess(id: number, data: Partial<InsertProcess>): ProcessHierarchy | Promise<ProcessHierarchy>;

  getRulesByProcess(processId: number): DocumentRule[];
  createRule(data: InsertDocumentRule): DocumentRule | Promise<DocumentRule>;
  updateRule(ruleId: number, data: Partial<InsertDocumentRule>): DocumentRule | Promise<DocumentRule>;
  deleteRule(ruleId: number, processId?: number): void | Promise<void>;

  getInstances(): WorkflowInstance[];
  getInstanceById(id: string | number): WorkflowInstance | undefined;
  createInstance(data: InsertWorkflowInstance): WorkflowInstance | Promise<WorkflowInstance>;

  getDocumentsByInstance(instanceId: string | number): DocflowDocument[];
  ensureDocumentsLoaded(instanceId: string | number): Promise<DocflowDocument[]>;
  createDocument(data: InsertDocument): DocflowDocument | Promise<DocflowDocument>;

  getVersionsByDocument(documentId: string | number): FileVersion[];

  getMovementsByInstance(instanceId: string | number): WorkflowMovement[];
  getReturnMovements(): WorkflowMovement[];
  createMovement(data: InsertMovement): WorkflowMovement | Promise<WorkflowMovement>;

  getDashboardStats(): DashboardStats;
  getRecentInstances(limit: number): WorkflowInstance[];
  getRecentMovements(limit: number): WorkflowMovement[];

  getInstancePermissions(instanceId: string | number): InstancePermissions;
  downloadVersion(versionId: string | number): Promise<Blob>;
  previewVersion(versionId: string | number): Promise<string>;

  getVisibleProcessIds(processId: number): number[];
  getGroupedRuleCompletion(instanceId: string | number, processId: number): GroupedRuleCompletion[];

  getDynamicFields(processId: number): ProcessDynamicFields;
  loadDynamicFields(processId: number): Promise<ProcessDynamicFields>;
  saveDynamicFields(processId: number, fields: DynamicFieldSchema[]): Promise<void>;

  getNotifications(): DocflowNotification[];
  markNotificationRead(id: string): void;
}
