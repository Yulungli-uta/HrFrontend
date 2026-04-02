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
import type { IDocflowService, DashboardStats } from "./docflow-service.interface";
import { computeVisibleProcessIds, computeGroupedRuleCompletion, computeMandatoryCompletion } from "@/lib/docflow/process-visibility";
import {
  mockUsers,
  mockProcesses,
  mockDocumentRules,
  mockInstances,
  mockDocuments,
  mockFileVersions,
  mockMovements,
} from "@/lib/docflow/docflow-mock-data";

export class MockDocflowService implements IDocflowService {
  private users = [...mockUsers];
  private processes = [...mockProcesses];
  private rules = [...mockDocumentRules];
  private instances = [...mockInstances];
  private documents = [...mockDocuments];
  private fileVersions = [...mockFileVersions];
  private movements = [...mockMovements];
  private dynamicFieldsMap = new Map<number, DynamicFieldSchema[]>([
    [4, [
      { name: "numeroFactura", type: "string", required: true },
      { name: "montoTotal", type: "number", required: true },
      { name: "fechaEmision", type: "date", required: true },
      { name: "incluyeIVA", type: "boolean", value: true, required: false },
    ]],
    [5, [
      { name: "banco", type: "string", required: true },
      { name: "periodo", type: "string", required: true },
      { name: "cuentaNo", type: "string", required: true },
    ]],
    [6, [
      { name: "cedula", type: "string", required: true },
      { name: "fechaIngreso", type: "date", required: true },
      { name: "salarioBase", type: "number", required: true },
      { name: "tieneExperiencia", type: "boolean", value: false, required: false },
    ]],
    [7, [
      { name: "periodo", type: "string", required: true },
      { name: "evaluador", type: "string", required: true },
      { name: "tipo", type: "string", required: true },
    ]],
    [8, [
      { name: "programa", type: "string", required: true },
      { name: "instructor", type: "string", required: true },
      { name: "duracion", type: "string", required: false },
    ]],
    [9, [
      { name: "proveedor", type: "string", required: true },
      { name: "montoEstimado", type: "number", required: true },
      { name: "fechaSolicitud", type: "date", required: true },
      { name: "esUrgente", type: "boolean", value: false, required: false },
    ]],
    [10, [
      { name: "proveedor", type: "string", required: true },
      { name: "ordenCompra", type: "string", required: true },
      { name: "items", type: "string", required: true },
    ]],
    [12, [
      { name: "nombreProyecto", type: "string", required: true },
      { name: "presupuesto", type: "number", required: true },
      { name: "fechaInicio", type: "date", required: true },
      { name: "fechaFinEstimada", type: "date", required: false },
      { name: "requiereAprobacionExterna", type: "boolean", value: false, required: false },
    ]],
    [13, [
      { name: "proyecto", type: "string", required: true },
      { name: "fase", type: "string", required: true },
      { name: "avance", type: "string", required: false },
    ]],
    [14, [
      { name: "proyecto", type: "string", required: true },
      { name: "entregable", type: "string", required: true },
      { name: "inspector", type: "string", required: true },
    ]],
    [15, [
      { name: "proyecto", type: "string", required: true },
      { name: "fechaCierre", type: "date", required: true },
      { name: "responsable", type: "string", required: true },
    ]],
  ]);

  getUsers(): DocflowUser[] {
    return this.users;
  }

  getUserById(id: number): DocflowUser | undefined {
    return this.users.find((u) => u.userId === id);
  }

  getProcesses(): ProcessHierarchy[] {
    return this.processes;
  }

  getProcessById(id: number): ProcessHierarchy | undefined {
    for (const p of this.processes) {
      if (p.processId === id) return p;
      if (p.children) {
        const child = p.children.find((c) => c.processId === id);
        if (child) return child;
      }
    }
    return undefined;
  }

  private _getMaxProcessId(): number {
    let max = 0;
    const walk = (procs: ProcessHierarchy[]) => {
      for (const p of procs) {
        if (p.processId > max) max = p.processId;
        if (p.children) walk(p.children);
      }
    };
    walk(this.processes);
    return max;
  }

  private _findAndUpdateProcess(processes: ProcessHierarchy[], id: number, data: Partial<InsertProcess>): ProcessHierarchy | undefined {
    for (const p of processes) {
      if (p.processId === id) {
        if (data.processName !== undefined) p.processName = data.processName;
        if (data.description !== undefined) p.description = data.description || null;
        if (data.isActive !== undefined) p.isActive = data.isActive;
        p.updatedBy = 1;
        p.updatedAt = new Date().toISOString();
        return p;
      }
      if (p.children) {
        const found = this._findAndUpdateProcess(p.children, id, data);
        if (found) return found;
      }
    }
    return undefined;
  }

  createProcess(data: InsertProcess): ProcessHierarchy {
    const newId = this._getMaxProcessId() + 1;
    const now = new Date().toISOString();
    const newProcess: ProcessHierarchy = {
      processId: newId,
      parentProcessId: data.parentProcessId,
      processName: data.processName,
      description: data.description || null,
      isActive: data.isActive ?? true,
      createdBy: 1,
      createdAt: now,
      updatedBy: null,
      updatedAt: null,
      children: [],
    };

    if (data.parentProcessId) {
      const parent = this.getProcessById(data.parentProcessId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(newProcess);
      } else {
        this.processes.push(newProcess);
      }
    } else {
      this.processes.push(newProcess);
    }

    return newProcess;
  }

  updateProcess(id: number, data: Partial<InsertProcess>): ProcessHierarchy {
    const process = this._findAndUpdateProcess(this.processes, id, data);
    if (!process) throw new Error(`Proceso ${id} no encontrado`);
    return process;
  }

  getRulesByProcess(processId: number): DocumentRule[] {
    return this.rules.filter((r) => r.processId === processId);
  }

  createRule(data: InsertDocumentRule): DocumentRule {
    const maxRuleId = this.rules.reduce((max, r) => Math.max(max, r.ruleId), 0);
    const now = new Date().toISOString();
    const newRule: DocumentRule = {
      ruleId: maxRuleId + 1,
      processId: data.processId,
      docTypeName: data.docTypeName,
      isMandatory: data.isMandatory ?? true,
      minFiles: data.minFiles ?? 1,
      maxFiles: data.maxFiles ?? 5,
      createdBy: 1,
      createdAt: now,
      updatedBy: null,
      updatedAt: null,
    };
    this.rules.push(newRule);
    return newRule;
  }

  updateRule(ruleId: number, data: Partial<InsertDocumentRule>): DocumentRule {
    const rule = this.rules.find((r) => r.ruleId === ruleId);
    if (!rule) throw new Error(`Regla ${ruleId} no encontrada`);
    if (data.docTypeName !== undefined) rule.docTypeName = data.docTypeName;
    if (data.isMandatory !== undefined) rule.isMandatory = data.isMandatory;
    if (data.minFiles !== undefined) rule.minFiles = data.minFiles;
    if (data.maxFiles !== undefined) rule.maxFiles = data.maxFiles;
    rule.updatedBy = 1;
    rule.updatedAt = new Date().toISOString();
    return rule;
  }

  deleteRule(ruleId: number, _processId?: number): void {
    const idx = this.rules.findIndex((r) => r.ruleId === ruleId);
    if (idx === -1) throw new Error(`Regla ${ruleId} no encontrada`);
    this.rules.splice(idx, 1);
  }

  getInstances(): WorkflowInstance[] {
    return this.instances;
  }

  getInstanceById(id: string | number): WorkflowInstance | undefined {
    return this.instances.find((i) => String(i.instanceId) === String(id));
  }

  createInstance(data: InsertWorkflowInstance): WorkflowInstance {
    const process = this.getProcessById(data.processId);
    const newInstance: WorkflowInstance = {
      instanceId: this.instances.length + 1,
      processId: data.processId,
      currentStatus: (data as any).currentStatus || "Borrador",
      dynamicMetadata: data.dynamicMetadata || null,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedBy: null,
      updatedAt: null,
      processName: process?.processName,
      createdByName: "Usuario Actual",
      totalFiles: 0,
    };
    this.instances.push(newInstance);
    this.notificationsCache = null;
    return newInstance;
  }

  getDocumentsByInstance(instanceId: string | number): DocflowDocument[] {
    return this.documents.filter((d) => String(d.instanceId) === String(instanceId) && !d.isDeleted);
  }

  async ensureDocumentsLoaded(instanceId: string | number): Promise<DocflowDocument[]> {
    return this.getDocumentsByInstance(instanceId);
  }

  createDocument(data: InsertDocument): DocflowDocument {
    const rule = data.ruleId ? this.rules.find((r) => r.ruleId === data.ruleId) : null;
    const newDoc: DocflowDocument = {
      documentId: this.documents.length + 1,
      instanceId: data.instanceId,
      ruleId: data.ruleId ?? null,
      title: data.title,
      internalDescription: data.internalDescription || null,
      currentVersion: 1,
      isDeleted: false,
      visibility: data.visibility || "PUBLIC_WITHIN_CASE",
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedBy: null,
      updatedAt: null,
      ruleName: rule?.docTypeName,
    };
    this.documents.push(newDoc);
    this.notificationsCache = null;
    return newDoc;
  }

  getVersionsByDocument(documentId: string | number): FileVersion[] {
    return this.fileVersions
      .filter((v) => String(v.documentId) === String(documentId))
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  getMovementsByInstance(instanceId: string | number): WorkflowMovement[] {
    return this.movements
      .filter((m) => String(m.instanceId) === String(instanceId))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  getReturnMovements(): WorkflowMovement[] {
    return this.movements
      .filter((m) => m.movementType === "RETURN")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createMovement(data: InsertMovement): WorkflowMovement {
    const newMovement: WorkflowMovement = {
      movementId: this.movements.length + 1,
      instanceId: data.instanceId,
      fromStatus: data.fromStatus || null,
      toStatus: data.toStatus,
      movementType: data.movementType,
      comments: data.comments || null,
      assignedToUserId: data.assignedToUserId || null,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      createdByName: "Usuario Actual",
      assignedToName: data.assignedToUserId
        ? this.getUserById(data.assignedToUserId)?.fullName ?? undefined
        : undefined,
    };
    this.movements.push(newMovement);
    this.notificationsCache = null;
    return newMovement;
  }

  getDashboardStats(): DashboardStats {
    const activeInstances = this.instances;
    const activeDocuments = this.documents.filter((d) => !d.isDeleted);
    return {
      totalInstances: activeInstances.length,
      byStatus: {
        Borrador: activeInstances.filter((i) => i.currentStatus === "Borrador").length,
        Pendiente: activeInstances.filter((i) => i.currentStatus === "Pendiente").length,
        "En Revision": activeInstances.filter((i) => i.currentStatus === "En Revision").length,
        Aprobado: activeInstances.filter((i) => i.currentStatus === "Aprobado").length,
        Retornado: activeInstances.filter((i) => i.currentStatus === "Retornado").length,
        Finalizado: activeInstances.filter((i) => i.currentStatus === "Finalizado").length,
      },
      totalDocuments: activeDocuments.length,
      totalMovements: this.movements.length,
      recentReturns: this.movements.filter((m) => m.movementType === "RETURN").length,
    };
  }

  getRecentInstances(limit: number): WorkflowInstance[] {
    return [...this.instances]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getRecentMovements(limit: number): WorkflowMovement[] {
    return [...this.movements]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getInstancePermissions(instanceId: string | number): InstancePermissions {
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

    if (statusAllowsAdvance) {
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

    return {
      canAdvance,
      canReturn,
      canUploadDocuments: true,
      canDeleteDocuments: instance.currentStatus === "Borrador",
      reason,
    };
  }

  async downloadVersion(_versionId: string | number): Promise<Blob> {
    return new Blob(["Mock file content"], { type: "application/octet-stream" });
  }

  async previewVersion(_versionId: string | number): Promise<string> {
    return URL.createObjectURL(new Blob(["Mock preview"], { type: "text/plain" }));
  }

  getVisibleProcessIds(processId: number): number[] {
    return computeVisibleProcessIds(processId, this.processes);
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

  getDynamicFields(processId: number): ProcessDynamicFields {
    return {
      processId,
      dynamicFieldMetadata: this.dynamicFieldsMap.get(processId) || [],
    };
  }

  async loadDynamicFields(processId: number): Promise<ProcessDynamicFields> {
    return this.getDynamicFields(processId);
  }

  async saveDynamicFields(processId: number, fields: DynamicFieldSchema[]): Promise<void> {
    this.dynamicFieldsMap.set(processId, [...fields]);
  }

  private notificationsCache: DocflowNotification[] | null = null;
  private readNotificationIds = new Set<string>();

  getNotifications(): DocflowNotification[] {
    if (this.notificationsCache) return this.notificationsCache;

    const notifications: DocflowNotification[] = [];

    const returnMovements = this.movements.filter((m) => m.movementType === "RETURN");
    for (const mov of returnMovements) {
      const instance = this.getInstanceById(mov.instanceId);
      notifications.push({
        id: `return-${mov.movementId}`,
        type: "RETURN",
        title: "Expediente retornado",
        message: `El expediente #${mov.instanceId} (${instance?.processName || "Sin proceso"}) fue retornado${mov.createdByName ? ` por ${mov.createdByName}` : ""}${mov.comments ? `: ${mov.comments}` : ""}`,
        instanceId: mov.instanceId,
        processName: instance?.processName,
        isRead: this.readNotificationIds.has(`return-${mov.movementId}`),
        createdAt: mov.createdAt,
      });
    }

    for (const instance of this.instances) {
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
