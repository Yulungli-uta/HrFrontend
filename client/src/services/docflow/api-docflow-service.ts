import type {
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
  DocflowUser,
  InstancePermissions,
  GroupedRuleCompletion,
  DynamicFieldSchema,
  ProcessDynamicFields,
  DocflowNotification,
} from "@/types/docflow/docflow.types";
import type { IDocflowService, DashboardStats } from "./docflow-service.interface";
import { DocflowAPI } from "@/lib/docflow/docflow-api";
import type {
  ProcessDto,
  ReturnAuditItemDto,
} from "@/types/docflow/docflow-api.types";
import {
  mapProcessesToHierarchy,
  mapRuleDtoToFrontend,
  mapInstanceListItemToFrontend,
  mapInstanceDetailToFrontend,
  mapDocumentDtoToFrontend,
  mapFileVersionDtoToFrontend,
  mapReturnAuditToMovement,
  mapVisibilityToBackend,
} from "@/types/docflow/docflow-api.types";
import { logger } from "@/lib/logger";
import { computeVisibleProcessIds, computeGroupedRuleCompletion, computeMandatoryCompletion } from "@/lib/docflow/process-visibility";

interface CachedData {
  processes: ProcessHierarchy[];
  processMap: Map<number, ProcessDto>;
  rules: Map<number, DocumentRule[]>;
  instances: WorkflowInstance[];
  documents: Map<string, DocflowDocument[]>;
  versions: Map<string, FileVersion[]>;
  movements: Map<string, WorkflowMovement[]>;
  returnMovements: WorkflowMovement[];
  dashboardStats: DashboardStats | null;
  permissions: Map<string, InstancePermissions>;
  documentLoadPromises: Map<string, Promise<DocflowDocument[]>>;
}

const DEFAULT_PERMISSIONS: InstancePermissions = {
  canAdvance: false,
  canReturn: false,
  canUploadDocuments: false,
  canDeleteDocuments: false,
  reason: "Cargando permisos...",
};

export class ApiDocflowService implements IDocflowService {
  private cache: CachedData = {
    processes: [],
    processMap: new Map(),
    rules: new Map(),
    instances: [],
    documents: new Map(),
    versions: new Map(),
    movements: new Map(),
    returnMovements: [],
    dashboardStats: null,
    permissions: new Map(),
    documentLoadPromises: new Map(),
  };

  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  get initialized(): boolean {
    return this._initialized;
  }

  async init(): Promise<void> {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._loadInitialData();
    await this._initPromise;
  }

  private async _loadInitialData(): Promise<void> {
    try {
      logger.info("ApiDocflowService", "Iniciando carga de datos desde API...");

      const [processDtos, instancesResult, auditReturns] = await Promise.all([
        DocflowAPI.processes.getAll().catch(() => [] as ProcessDto[]),
        DocflowAPI.instances.search({ pageSize: 100 }).catch(() => ({ items: [], page: 1, pageSize: 100, total: 0 })),
        DocflowAPI.audit.getReturns().catch(() => [] as ReturnAuditItemDto[]),
      ]);

      const processMap = new Map<number, ProcessDto>();
      for (const p of processDtos) {
        processMap.set(p.processId, p);
      }
      this.cache.processMap = processMap;
      this.cache.processes = mapProcessesToHierarchy(processDtos);

      this.cache.instances = instancesResult.items.map((dto) =>
        mapInstanceListItemToFrontend(dto, processMap)
      );

      this.cache.returnMovements = auditReturns.map(mapReturnAuditToMovement);

      const processIds = this._extractAllProcessIds(this.cache.processes);
      const ruleResults = await Promise.all(
        processIds.map((pid) =>
          DocflowAPI.processes
            .getRules(pid)
            .then((dtos) => ({ pid, rules: dtos.map(mapRuleDtoToFrontend) }))
            .catch(() => ({ pid, rules: [] as DocumentRule[] }))
        )
      );
      for (const { pid, rules } of ruleResults) {
        this.cache.rules.set(pid, rules);
      }

      await this._preloadDocumentsForInstances();

      this._initialized = true;
      logger.info("ApiDocflowService", `Datos cargados: ${processDtos.length} procesos, ${this.cache.instances.length} expedientes`);
    } catch (error) {
      logger.error("ApiDocflowService", "Error critico en carga inicial:", error);
      this._initialized = true;
    }
  }

  private async _preloadDocumentsForInstances(): Promise<void> {
    const instances = this.cache.instances;
    if (instances.length === 0) return;

    logger.info("ApiDocflowService", `Precargando documentos para ${instances.length} expedientes...`);

    const docResults = await Promise.all(
      instances.map((inst) => {
        const key = String(inst.instanceId);
        return DocflowAPI.instances
          .getDocuments(key)
          .then((dtos) => ({ key, docs: dtos.map(mapDocumentDtoToFrontend) }))
          .catch(() => ({ key, docs: [] as DocflowDocument[] }));
      })
    );

    for (const { key, docs } of docResults) {
      this.cache.documents.set(key, docs);
    }

    logger.info("ApiDocflowService", `Documentos precargados para ${docResults.length} expedientes`);
  }

  private _loadDocumentsForInstance(instanceId: string): Promise<DocflowDocument[]> {
    const existing = this.cache.documentLoadPromises.get(instanceId);
    if (existing) return existing;

    const promise = DocflowAPI.instances
      .getDocuments(instanceId)
      .then((dtos) => {
        const docs = dtos.map(mapDocumentDtoToFrontend);
        this.cache.documents.set(instanceId, docs);
        this.cache.documentLoadPromises.delete(instanceId);
        return docs;
      })
      .catch(() => {
        this.cache.documentLoadPromises.delete(instanceId);
        return [] as DocflowDocument[];
      });

    this.cache.documentLoadPromises.set(instanceId, promise);
    return promise;
  }

  private _extractAllProcessIds(processes: ProcessHierarchy[]): number[] {
    const ids: number[] = [];
    for (const p of processes) {
      ids.push(p.processId);
      if (p.children) {
        ids.push(...this._extractAllProcessIds(p.children));
      }
    }
    return ids;
  }

  getUsers(): DocflowUser[] {
    return [];
  }

  getUserById(_id: number): DocflowUser | undefined {
    return undefined;
  }

  getProcesses(): ProcessHierarchy[] {
    return this.cache.processes;
  }

  getProcessById(id: number): ProcessHierarchy | undefined {
    return this._findProcess(this.cache.processes, id);
  }

  private _findProcess(processes: ProcessHierarchy[], id: number): ProcessHierarchy | undefined {
    for (const p of processes) {
      if (p.processId === id) return p;
      if (p.children) {
        const child = this._findProcess(p.children, id);
        if (child) return child;
      }
    }
    return undefined;
  }

  async createProcess(data: InsertProcess): Promise<ProcessHierarchy> {
    const dto = await DocflowAPI.processes.create({
      processName: data.processName,
      parentId: data.parentProcessId,
      responsibleDepartmentId: data.responsibleDepartmentId,
      description: data.description,
      isActive: data.isActive,
    });

    const processDtos = await DocflowAPI.processes.getAll().catch(() => []);
    const processMap = new Map(processDtos.map((p) => [p.processId, p]));
    this.cache.processMap = processMap;
    this.cache.processes = mapProcessesToHierarchy(processDtos);

    return this._findProcess(this.cache.processes, dto.processId) || {
      processId: dto.processId,
      parentProcessId: data.parentProcessId,
      processName: data.processName,
      description: data.description || null,
      isActive: data.isActive ?? true,
      createdBy: null,
      createdAt: new Date().toISOString(),
      updatedBy: null,
      updatedAt: null,
      children: [],
    };
  }

  async updateProcess(id: number, data: Partial<InsertProcess>): Promise<ProcessHierarchy> {
    await DocflowAPI.processes.update(id, {
      processName: data.processName,
      parentId: data.parentProcessId,
      responsibleDepartmentId: data.responsibleDepartmentId,
      description: data.description,
      isActive: data.isActive,
    });

    const processDtos = await DocflowAPI.processes.getAll().catch(() => []);
    const processMap = new Map(processDtos.map((p) => [p.processId, p]));
    this.cache.processMap = processMap;
    this.cache.processes = mapProcessesToHierarchy(processDtos);

    const updated = this._findProcess(this.cache.processes, id);
    if (!updated) throw new Error(`Proceso ${id} no encontrado despues de actualizar`);
    return updated;
  }

  getRulesByProcess(processId: number): DocumentRule[] {
    const cached = this.cache.rules.get(processId);
    if (cached) return cached;

    DocflowAPI.processes.getRules(processId).then((dtos) => {
      this.cache.rules.set(processId, dtos.map(mapRuleDtoToFrontend));
    }).catch(() => {});

    return [];
  }

  async createRule(data: InsertDocumentRule): Promise<DocumentRule> {
    const dto = await DocflowAPI.processes.createRule(data.processId, {
      documentType: data.docTypeName,
      isRequired: data.isMandatory ?? true,
      minFiles: data.minFiles,
      maxFiles: data.maxFiles,
    });

    const rule = mapRuleDtoToFrontend(dto);
    const existing = this.cache.rules.get(data.processId) || [];
    existing.push(rule);
    this.cache.rules.set(data.processId, existing);
    return rule;
  }

  async updateRule(ruleId: number, data: Partial<InsertDocumentRule>): Promise<DocumentRule> {
    const processId = data.processId || this._findRuleProcessId(ruleId);
    if (!processId) throw new Error(`No se pudo determinar el proceso para la regla ${ruleId}`);

    const dto = await DocflowAPI.processes.updateRule(processId, ruleId, {
      documentType: data.docTypeName,
      isRequired: data.isMandatory,
      minFiles: data.minFiles,
      maxFiles: data.maxFiles,
    });

    const rule = mapRuleDtoToFrontend(dto);
    const rules = this.cache.rules.get(processId) || [];
    const idx = rules.findIndex((r) => r.ruleId === ruleId);
    if (idx !== -1) rules[idx] = rule;
    else rules.push(rule);
    this.cache.rules.set(processId, rules);
    return rule;
  }

  async deleteRule(ruleId: number, passedProcessId?: number): Promise<void> {
    const processId = passedProcessId || this._findRuleProcessId(ruleId);
    if (!processId) throw new Error(`No se pudo determinar el proceso para la regla ${ruleId}`);

    await DocflowAPI.processes.deleteRule(processId, ruleId);

    const rules = this.cache.rules.get(processId) || [];
    this.cache.rules.set(processId, rules.filter((r) => r.ruleId !== ruleId));
  }

  private _findRuleProcessId(ruleId: number): number | undefined {
    for (const [processId, rules] of this.cache.rules) {
      if (rules.some((r) => r.ruleId === ruleId)) return processId;
    }
    return undefined;
  }

  getInstances(): WorkflowInstance[] {
    return this.cache.instances;
  }

  getInstanceById(id: string | number): WorkflowInstance | undefined {
    return this.cache.instances.find((i) => String(i.instanceId) === String(id));
  }

  async createInstance(data: InsertWorkflowInstance): Promise<WorkflowInstance> {
  const result = await DocflowAPI.instances.create({
    initialProcessId: data.processId,
    instanceName: data.instanceName,              // NUEVO
    dynamicMetadata: data.dynamicMetadata ? JSON.stringify(data.dynamicMetadata) : null,
    assignedToUserId: data.assignedToUserId,
  });

  const detail = await DocflowAPI.instances.getById(result.instanceId);
  const instance = mapInstanceDetailToFrontend(detail, this.cache.processMap);
  this.cache.instances.push(instance);
  this.cache.dashboardStats = null;
  this.notificationsCache = null;
  return instance;
}

  getDocumentsByInstance(instanceId: string | number): DocflowDocument[] {
    const key = String(instanceId);
    const cached = this.cache.documents.get(key);
    if (cached !== undefined) return cached;

    this._loadDocumentsForInstance(key);

    return [];
  }

  async ensureDocumentsLoaded(instanceId: string | number): Promise<DocflowDocument[]> {
    const key = String(instanceId);
    const cached = this.cache.documents.get(key);
    if (cached !== undefined) return cached;

    return this._loadDocumentsForInstance(key);
  }

  async createDocument(data: InsertDocument): Promise<DocflowDocument> {
    const instanceId = String(data.instanceId);
    const dto = await DocflowAPI.instances.createDocument(instanceId, {
      ruleId: data.ruleId,
      documentName: data.title,
      visibility: data.visibility ? mapVisibilityToBackend(data.visibility) : undefined,
    });
    const doc = mapDocumentDtoToFrontend(dto);
    const existing = this.cache.documents.get(instanceId) || [];
    existing.push(doc);
    this.cache.documents.set(instanceId, existing);
    this._invalidateSiblingPermissions(data.instanceId);
    this.notificationsCache = null;
    return doc;
  }

  getVersionsByDocument(documentId: string | number): FileVersion[] {
    const key = String(documentId);
    const cached = this.cache.versions.get(key);
    if (cached !== undefined) return cached;

    DocflowAPI.documents.getVersions(key).then((dtos) => {
      this.cache.versions.set(
        key,
        dtos.map(mapFileVersionDtoToFrontend).sort((a, b) => b.versionNumber - a.versionNumber)
      );
    }).catch(() => {});

    return [];
  }

  getMovementsByInstance(instanceId: string | number): WorkflowMovement[] {
    const key = String(instanceId);
    const cached = this.cache.movements.get(key);
    if (cached !== undefined) return cached;

    this.cache.movements.set(key, []);
    logger.warn("ApiDocflowService", `GET movimientos por instancia no disponible en backend (instanceId: ${key})`);

    return [];
  }

  getReturnMovements(): WorkflowMovement[] {
    return this.cache.returnMovements;
  }

  async createMovement(data: InsertMovement): Promise<WorkflowMovement> {
    const instanceId = String(data.instanceId);
    await DocflowAPI.instances.createMovement(instanceId, {
      movementType: data.movementType as "FORWARD" | "RETURN",
      comments: data.comments || null,
      assignedToUserId: data.assignedToUserId || null,
    });

    const movement: WorkflowMovement = {
      movementId: `local-${Date.now()}`,
      instanceId: data.instanceId,
      fromStatus: data.fromStatus || null,
      toStatus: data.toStatus,
      movementType: data.movementType,
      comments: data.comments || null,
      assignedToUserId: data.assignedToUserId || null,
      createdBy: null,
      createdAt: new Date().toISOString(),
    };

    const existingMovements = this.cache.movements.get(instanceId) || [];
    existingMovements.push(movement);
    this.cache.movements.set(instanceId, existingMovements);

    if (data.movementType === "RETURN") {
      this.cache.returnMovements.unshift(movement);
    }

    const instance = this.cache.instances.find((i) => String(i.instanceId) === instanceId);
    if (instance) {
      instance.currentStatus = data.toStatus;
    }

    this.cache.dashboardStats = null;
    this.notificationsCache = null;
    return movement;
  }

  getDashboardStats(): DashboardStats {
    if (this.cache.dashboardStats) return this.cache.dashboardStats;

    const instances = this.cache.instances;
    return {
      totalInstances: instances.length,
      byStatus: {
        Borrador: instances.filter((i) => i.currentStatus === "Borrador").length,
        Pendiente: instances.filter((i) => i.currentStatus === "Pendiente").length,
        "En Revision": instances.filter((i) => i.currentStatus === "En Revision").length,
        Aprobado: instances.filter((i) => i.currentStatus === "Aprobado").length,
        Retornado: instances.filter((i) => i.currentStatus === "Retornado").length,
        Finalizado: instances.filter((i) => i.currentStatus === "Finalizado").length,
      },
      totalDocuments: 0,
      totalMovements: this.cache.returnMovements.length,
      recentReturns: this.cache.returnMovements.length,
    };
  }

  getRecentInstances(limit: number): WorkflowInstance[] {
    return [...this.cache.instances]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getRecentMovements(limit: number): WorkflowMovement[] {
    return [...this.cache.returnMovements]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getInstancePermissions(instanceId: string | number): InstancePermissions {
    const key = String(instanceId);
    const cached = this.cache.permissions.get(key);
    if (cached) return cached;

    const instance = this.getInstanceById(instanceId);
    if (!instance) {
      return {
        canAdvance: false,
        canReturn: false,
        canUploadDocuments: false,
        canDeleteDocuments: false,
        reason: "Expediente no encontrado",
      };
    }

    const statusAllowsAdvance = instance.currentStatus !== "Finalizado" && instance.currentStatus !== "Aprobado";
    const canReturn = instance.currentStatus !== "Borrador" && instance.currentStatus !== "Finalizado";

    let canAdvance = statusAllowsAdvance;
    let reason: string | undefined;

    let docsComplete = true;
    if (statusAllowsAdvance) {
      const visibleIds = computeVisibleProcessIds(instance.processId, this.cache.processes);
      const parentProcess = this.cache.processes.find((p) =>
        p.children?.some((c) => c.processId === instance.processId)
      );
      const siblingInstances = parentProcess
        ? this.cache.instances.filter((inst) =>
            parentProcess.children?.some((c) => c.processId === inst.processId) &&
            visibleIds.includes(inst.processId)
          )
        : [instance];

      for (const sibling of siblingInstances) {
        const sibKey = String(sibling.instanceId);
        if (!this.cache.documents.has(sibKey)) {
          this._loadDocumentsForInstance(sibKey);
          docsComplete = false;
        }
      }

      const mandatoryCheck = computeMandatoryCompletion(
        instance.processId,
        instanceId,
        {
          getProcessById: (id) => this.getProcessById(id),
          getRulesByProcess: (pid) => this.getRulesByProcess(pid),
          getDocumentsByInstance: (iid) => this.getDocumentsByInstance(iid),
          getInstances: () => this.getInstances(),
          getProcesses: () => this.getProcesses(),
        },
      );

      if (!mandatoryCheck.allComplete) {
        canAdvance = false;
        reason = `No se puede avanzar: ${mandatoryCheck.pending} de ${mandatoryCheck.total} documento(s) obligatorio(s) pendiente(s). Faltan: ${mandatoryCheck.pendingNames.join(", ")}`;
      }
    }

    const perms: InstancePermissions = {
      canAdvance,
      canReturn,
      canUploadDocuments: true,
      canDeleteDocuments: instance.currentStatus === "Borrador",
      reason,
    };
    if (docsComplete) {
      this.cache.permissions.set(key, perms);
    }
    return perms;
  }

  async downloadVersion(versionId: string | number): Promise<Blob> {
    const result = await DocflowAPI.versions.download(String(versionId));
    return result.blob;
  }

  async previewVersion(versionId: string | number): Promise<string> {
    const blob = await this.downloadVersion(versionId);
    return URL.createObjectURL(blob);
  }

  private _invalidateSiblingPermissions(instanceId: string | number): void {
    const instance = this.getInstanceById(instanceId);
    if (!instance) return;

    const parentProcess = this.cache.processes.find((p) =>
      p.children?.some((c) => c.processId === instance.processId)
    );
    if (!parentProcess?.children) {
      this.cache.permissions.delete(String(instanceId));
      return;
    }

    const siblingProcessIds = new Set(parentProcess.children.map((c) => c.processId));
    for (const inst of this.cache.instances) {
      if (siblingProcessIds.has(inst.processId)) {
        this.cache.permissions.delete(String(inst.instanceId));
      }
    }
  }

  async refreshInstance(instanceId: string | number): Promise<void> {
    const key = String(instanceId);
    try {
      const [detail, documents] = await Promise.all([
        DocflowAPI.instances.getById(key),
        DocflowAPI.instances.getDocuments(key),
      ]);

      const instance = mapInstanceDetailToFrontend(detail, this.cache.processMap);
      const idx = this.cache.instances.findIndex((i) => String(i.instanceId) === key);
      if (idx >= 0) this.cache.instances[idx] = instance;
      else this.cache.instances.push(instance);

      this.cache.documents.set(key, documents.map(mapDocumentDtoToFrontend));
      this._invalidateSiblingPermissions(instanceId);
    } catch (error) {
      logger.error("ApiDocflowService", `Error al refrescar expediente ${key}:`, error);
    }
  }

  async refreshInstances(): Promise<void> {
    try {
      const result = await DocflowAPI.instances.search({ pageSize: 100 });
      this.cache.instances = result.items.map((dto) =>
        mapInstanceListItemToFrontend(dto, this.cache.processMap)
      );
      this.cache.dashboardStats = null;
    } catch (error) {
      logger.error("ApiDocflowService", "Error al refrescar expedientes:", error);
    }
  }

  getVisibleProcessIds(processId: number): number[] {
    return computeVisibleProcessIds(processId, this.cache.processes);
  }

  getGroupedRuleCompletion(instanceId: string | number, processId: number): GroupedRuleCompletion[] {
    return computeGroupedRuleCompletion(
      instanceId,
      processId,
      this.getInstanceById(instanceId),
      {
        getProcessById: (id) => this.getProcessById(id),
        getRulesByProcess: (pid) => this.getRulesByProcess(pid),
        getDocumentsByInstance: (iid) => this.getDocumentsByInstance(iid),
        getInstances: () => this.getInstances(),
        getProcesses: () => this.getProcesses(),
      },
    );
  }

  private dynamicFieldsCache = new Map<number, DynamicFieldSchema[]>();

  getDynamicFields(processId: number): ProcessDynamicFields {
    return {
      processId,
      dynamicFieldMetadata: this.dynamicFieldsCache.get(processId) || [],
    };
  }

  async loadDynamicFields(processId: number): Promise<ProcessDynamicFields> {
    try {
      const result = await DocflowAPI.processes.getDynamicFields(processId);
      const fields: DynamicFieldSchema[] = (result.dynamicFieldMetadata || []).map((f) => ({
        name: f.name,
        type: f.type as DynamicFieldSchema["type"],
        value: f.value,
        required: f.required,
      }));
      this.dynamicFieldsCache.set(processId, fields);
      return { processId, dynamicFieldMetadata: fields };
    } catch (error) {
      logger.error("ApiDocflowService", `Error al cargar campos dinamicos del proceso ${processId}:`, error);
      return { processId, dynamicFieldMetadata: [] };
    }
  }

  async saveDynamicFields(processId: number, fields: DynamicFieldSchema[]): Promise<void> {
    await DocflowAPI.processes.updateDynamicFields(processId, {
      dynamicFieldMetadata: fields.map((f) => ({
        name: f.name,
        type: f.type,
        value: f.value,
        required: f.required,
      })),
    });
    this.dynamicFieldsCache.set(processId, [...fields]);
  }

  private notificationsCache: DocflowNotification[] | null = null;
  private readNotificationIds = new Set<string>();

  getNotifications(): DocflowNotification[] {
    if (this.notificationsCache) return this.notificationsCache;

    const notifications: DocflowNotification[] = [];

    for (const mov of this.cache.returnMovements) {
      const instance = this.getInstanceById(mov.instanceId);
      notifications.push({
        id: `return-${mov.movementId}`,
        type: "RETURN",
        title: "Expediente retornado",
        message: `El expediente #${mov.instanceId} (${instance?.processName || mov.processName || "Sin proceso"}) fue retornado${mov.createdByName ? ` por ${mov.createdByName}` : ""}${mov.comments ? `: ${mov.comments}` : ""}`,
        instanceId: mov.instanceId,
        processName: instance?.processName || mov.processName,
        isRead: this.readNotificationIds.has(`return-${mov.movementId}`),
        createdAt: mov.createdAt,
      });
    }

    for (const instance of this.cache.instances) {
      if (instance.currentStatus === "Finalizado" || instance.currentStatus === "Aprobado") continue;

      const mandatoryCheck = computeMandatoryCompletion(
        instance.processId,
        instance.instanceId,
        {
          getProcessById: (id) => this.getProcessById(id),
          getRulesByProcess: (pid) => this.getRulesByProcess(pid),
          getDocumentsByInstance: (iid) => this.getDocumentsByInstance(iid),
          getInstances: () => this.getInstances(),
          getProcesses: () => this.getProcesses(),
        },
      );

      if (!mandatoryCheck.allComplete) {
        const notifId = `pending-${instance.instanceId}`;
        notifications.push({
          id: notifId,
          type: "PENDING_MANDATORY",
          title: "Documentos obligatorios pendientes",
          message: `Expediente #${instance.instanceId} (${instance.processName || "Sin proceso"}): ${mandatoryCheck.pending} documento(s) pendiente(s) - ${mandatoryCheck.pendingNames.join(", ")}`,
          instanceId: instance.instanceId,
          processName: instance.processName,
          isRead: this.readNotificationIds.has(notifId),
          createdAt: instance.createdAt,
        });
      }
    }

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.notificationsCache = notifications;
    return notifications;
  }

  markNotificationRead(id: string): void {
    this.readNotificationIds.add(id);
    if (this.notificationsCache) {
      const notif = this.notificationsCache.find((n) => n.id === id);
      if (notif) notif.isRead = true;
    }
  }
}
