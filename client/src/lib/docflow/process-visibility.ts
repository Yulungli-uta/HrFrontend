import type {
  ProcessHierarchy,
  DocumentRule,
  DocflowDocument,
  WorkflowInstance,
  GroupedRuleCompletion,
  MandatoryCompletion,
} from "@/types/docflow/docflow.types";

export function computeVisibleProcessIds(
  processId: number,
  allProcesses: ProcessHierarchy[],
): number[] {
  const parentProcess = allProcesses.find((p) =>
    p.children?.some((c) => c.processId === processId)
  );

  if (!parentProcess?.children || parentProcess.children.length <= 1) {
    return [processId];
  }

  const siblings = parentProcess.children;
  const currentIndex = siblings.findIndex((c) => c.processId === processId);
  if (currentIndex < 0) return [processId];

  return siblings.slice(0, currentIndex + 1).map((c) => c.processId);
}

interface RuleCompletionDeps {
  getProcessById: (id: number) => ProcessHierarchy | undefined;
  getRulesByProcess: (processId: number) => DocumentRule[];
  getDocumentsByInstance: (instanceId: string | number) => DocflowDocument[];
  getInstances: () => WorkflowInstance[];
  getProcesses: () => ProcessHierarchy[];
}

export function computeGroupedRuleCompletion(
  instanceId: string | number,
  processId: number,
  instance: WorkflowInstance | undefined,
  deps: RuleCompletionDeps,
): GroupedRuleCompletion[] {
  if (!instance) return [];

  const allProcesses = deps.getProcesses();
  const visibleIds = computeVisibleProcessIds(processId, allProcesses);

  const parentProcess = allProcesses.find((p) =>
    p.children?.some((c) => c.processId === processId)
  );

  const siblingInstances = parentProcess
    ? deps.getInstances().filter((inst) =>
        parentProcess.children?.some((c) => c.processId === inst.processId) &&
        visibleIds.includes(inst.processId)
      )
    : [instance];

  const allDocuments = siblingInstances.flatMap((inst) =>
    deps.getDocumentsByInstance(inst.instanceId)
  );

  const groups: GroupedRuleCompletion[] = [];

  for (const pid of visibleIds) {
    const process = deps.getProcessById(pid);
    if (!process) continue;

    const processRules = deps.getRulesByProcess(pid);
    if (processRules.length === 0) continue;

    const rules = processRules.map((rule) => {
      const docsForRule = allDocuments.filter((d) => d.ruleId === rule.ruleId);
      return {
        rule,
        uploaded: docsForRule.length,
        isComplete: docsForRule.length >= rule.minFiles,
        docs: docsForRule,
      };
    });

    groups.push({
      processId: pid,
      processName: process.processName,
      isCurrentProcess: pid === processId,
      rules,
    });
  }

  return groups;
}

export function computeMandatoryCompletion(
  processId: number,
  instanceId: string | number,
  deps: RuleCompletionDeps,
): MandatoryCompletion {
  const instance = deps.getInstances().find((i) => String(i.instanceId) === String(instanceId));
  if (!instance) {
    return { allComplete: true, pending: 0, total: 0, pendingNames: [] };
  }

  const allProcesses = deps.getProcesses();
  const visibleIds = computeVisibleProcessIds(processId, allProcesses);

  const parentProcess = allProcesses.find((p) =>
    p.children?.some((c) => c.processId === processId)
  );

  const siblingInstances = parentProcess
    ? deps.getInstances().filter((inst) =>
        parentProcess.children?.some((c) => c.processId === inst.processId) &&
        visibleIds.includes(inst.processId)
      )
    : [instance];

  const allDocuments = siblingInstances.flatMap((inst) =>
    deps.getDocumentsByInstance(inst.instanceId)
  );

  const pendingNames: string[] = [];
  let total = 0;
  let completed = 0;

  for (const pid of visibleIds) {
    const processRules = deps.getRulesByProcess(pid);
    const mandatoryRules = processRules.filter((r) => r.isMandatory);

    for (const rule of mandatoryRules) {
      total++;
      const docsForRule = allDocuments.filter((d) => d.ruleId === rule.ruleId);
      if (docsForRule.length >= rule.minFiles) {
        completed++;
      } else {
        const process = deps.getProcessById(pid);
        const prefix = process ? `${process.processName}: ` : "";
        pendingNames.push(`${prefix}${rule.docTypeName}`);
      }
    }
  }

  return {
    allComplete: total === 0 || completed === total,
    pending: total - completed,
    total,
    pendingNames,
  };
}
