// src/pages/PersonnelActionDetail.tsx
import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ArrowLeft, History, FolderOpen, FileIcon, Eye, Download } from 'lucide-react';
import { usePersonnelActionDetail } from '@/hooks/personnelActions/usePersonnelActionDetail';
import { usePersonnelActionLookups } from '@/hooks/personnelActions/usePersonnelActionLookups';
import { PersonnelActionActions } from '@/components/personnelActions/PersonnelActionActions';
import { PersonnelActionForm } from '@/components/personnelActions/PersonnelActionForm';
import { DocumentPreviewPanel } from '@/components/personnelActions/DocumentPreviewPanel';
import { StatusHistoryTimeline } from '@/components/personnelActions/StatusHistoryTimeline';
import { DepartmentAuthoritiesAPI, TiposReferenciaAPI, VistaDetallesEmpleadosAPI, DocumentsAPI } from '@/lib/api';
import type { DepartmentAuthorityDto } from '@/lib/api/services/departmentAuthorities';
import type { VwJobWithDegreeAndGroup, VwDepartmentWithType } from '@/lib/api/services/views';
import type { RefType } from '@/lib/api';
import type { CreatePersonnelActionRequest, UpdatePersonnelActionRequest, PersonnelActionDetail } from '@/types/personnel-actions';
import { PERSONNEL_ACTION_DIRECTORY_CODE, PERSONNEL_ACTION_ENTITY_TYPE } from '@/features/constants';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';

function formatCurrency(value: number): string {
  return value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildDocumentOverrides(
  action: PersonnelActionDetail,
  jobs: VwJobWithDegreeAndGroup[],
  departments: VwDepartmentWithType[],
  authorities: DepartmentAuthorityDto[],
  refTypes: {
    institutionalProcessTypes: RefType[];
    managementLevelTypes: RefType[];
  },
  resolvedEmployees: {
    dthDir: any | null;
    authNom: any | null;
    elab: any | null;
    reviewer: any | null;
    registrar: any | null;
  }
): Record<string, string> {
  const ov: Record<string, string> = {};

  const originJob = jobs.find(j => j.jobID === action.originJobId);
  if (originJob) {
    if (originJob.jobDescription) ov['CURRENT_JOB_TITLE'] = originJob.jobDescription;
    if (originJob.occupationalGroup) ov['CURRENT_OCCUPATIONAL_GROUP'] = originJob.occupationalGroup;
    if (originJob.degree) ov['CURRENT_GRADE'] = originJob.degree;
  }

  const originDept = departments.find(d => d.departmentID === action.originDepartmentId);
  if (originDept) {
    if (originDept.location) ov['CURRENT_WORKPLACE'] = originDept.location;
  }

  // Proceso Institucional: desde el campo guardado en la acción (ref_type), fallback al tipo del dept
  if (action.institutionalProcess) {
    const t = refTypes.institutionalProcessTypes.find(
      t => (t.typeID ?? (t as any).typeId) === action.institutionalProcess
    );
    if (t?.name) ov['CURRENT_INSTITUTIONAL_PROCESS'] = t.name;
  } else if (originDept?.departmentTypeName) {
    ov['CURRENT_INSTITUTIONAL_PROCESS'] = originDept.departmentTypeName;
  }

  // Nivel de Gestión: desde el campo guardado en la acción (ref_type), fallback al tipo del dept
  if (action.managementLevel) {
    const t = refTypes.managementLevelTypes.find(
      t => (t.typeID ?? (t as any).typeId) === action.managementLevel
    );
    if (t?.name) ov['CURRENT_MANAGEMENT_LEVEL'] = t.name;
  } else if (originDept?.departmentTypeDescription) {
    ov['CURRENT_MANAGEMENT_LEVEL'] = originDept.departmentTypeDescription;
  }

  // Declaración juramentada: marca para la plantilla
  ov['DECLARACION_JURADA_MARK'] = action.swornDeclaration ? 'X' : '';

  const destJob = jobs.find(j => j.jobID === action.destinationJobId);
  if (destJob) {
    if (destJob.jobDescription) ov['PROPOSED_JOB_TITLE'] = destJob.jobDescription;
    if (destJob.occupationalGroup) ov['PROPOSED_OCCUPATIONAL_GROUP'] = destJob.occupationalGroup;
    if (destJob.degree) ov['PROPOSED_GRADE'] = destJob.degree;
  }

  const destDept = departments.find(d => d.departmentID === action.destinationDepartmentId);
  if (destDept) {
    if (destDept.departmentName) ov['PROPOSED_ADMIN_UNIT'] = destDept.departmentName;
    if (destDept.location) ov['PROPOSED_WORKPLACE'] = destDept.location;
    if (destDept.budgetCode) ov['PROPOSED_BUDGET_CODE'] = destDept.budgetCode;
    if (destDept.departmentTypeName) ov['PROPOSED_INSTITUTIONAL_PROCESS'] = destDept.departmentTypeName;
    if (destDept.departmentTypeDescription) ov['PROPOSED_MANAGEMENT_LEVEL'] = destDept.departmentTypeDescription;
  }

  if (action.newRmu != null) ov['PROPOSED_SALARY'] = formatCurrency(action.newRmu);
  if (action.previousRmu != null) ov['CURRENT_SALARY'] = formatCurrency(action.previousRmu);
  if (action.destinationBudgetCode && !ov['PROPOSED_BUDGET_CODE']) ov['PROPOSED_BUDGET_CODE'] = action.destinationBudgetCode;
  if (action.originBudgetCode && !ov['CURRENT_BUDGET_CODE']) ov['CURRENT_BUDGET_CODE'] = action.originBudgetCode;

  // Responsables del documento: nombre y cargo desde la vista EmployeeDetails
  // Si el ID está guardado y se resolvió el empleado, usar fullName + jobName
  // Si no, caer en el nombre guardado en la acción, luego en DepartmentAuthority
  const applyResponsible = (
    emp: any | null,
    savedName: string | null | undefined,
    nameKey: string,
    titleKey: string
  ) => {
    if (emp) {
      if (emp.fullName) ov[nameKey] = emp.fullName;
      if (emp.jobName) ov[titleKey] = emp.jobName;
    } else if (savedName) {
      ov[nameKey] = savedName;
    }
  };

  applyResponsible(resolvedEmployees.dthDir,  action.dthDirectorName,        'DTH_DIRECTOR_NAME', 'DTH_DIRECTOR_TITLE');
  applyResponsible(resolvedEmployees.authNom, action.authorityNominatorName,  'AUTHORITY_NAME',    'AUTHORITY_TITLE');
  applyResponsible(resolvedEmployees.elab,    action.elaboratorName,          'ELABORATOR_NAME',   'ELABORATOR_TITLE');
  applyResponsible(resolvedEmployees.reviewer,action.reviewerName,            'REVIEWER_NAME',     'REVIEWER_TITLE');
  applyResponsible(resolvedEmployees.registrar,action.registrarName,          'REGISTRAR_NAME',    'REGISTRAR_TITLE');

  // Fallback: auto-detectar desde DepartmentAuthority para roles sin ID guardado
  for (const auth of authorities) {
    const type = (auth.authorityTypeName ?? '').toUpperCase();
    const name = auth.employeeFullName ?? '';
    const title = auth.denomination ?? auth.jobName ?? auth.authorityTypeName ?? '';
    if ((type.includes('TALENTO') || type.includes('DTH')) && !ov['DTH_DIRECTOR_NAME']) {
      ov['DTH_DIRECTOR_NAME'] = name; ov['DTH_DIRECTOR_TITLE'] = title;
    } else if ((type.includes('RECTOR') || type.includes('NOMIN') || type.includes('AUTORIDAD')) && !ov['AUTHORITY_NAME']) {
      ov['AUTHORITY_NAME'] = name; ov['AUTHORITY_TITLE'] = title;
    } else if (type.includes('ELABOR') && !ov['ELABORATOR_NAME']) {
      ov['ELABORATOR_NAME'] = name; ov['ELABORATOR_TITLE'] = title;
    } else if (type.includes('REVIS') && !ov['REVIEWER_NAME']) {
      ov['REVIEWER_NAME'] = name; ov['REVIEWER_TITLE'] = title;
    } else if ((type.includes('REGIST') || type.includes('CONTROL')) && !ov['REGISTRAR_NAME']) {
      ov['REGISTRAR_NAME'] = name; ov['REGISTRAR_TITLE'] = title;
    }
  }

  return ov;
}

const STATUS_BADGE: Record<string, string> = {
  BORRADOR: 'bg-secondary text-secondary-foreground',
  GENERADO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PENDIENTE_FIRMAS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  FIRMADO_CARGADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  FINALIZADO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ANULADO: 'bg-destructive/10 text-destructive',
};

function InfoRow({ label, value }: { label: string; value?: string | null | number }) {
  if (!value && value !== 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}

export default function PersonnelActionDetail() {
  const { id } = useParams<{ id: string }>();
  const actionId = Number(id);

  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    action,
    isLoading,
    isError,
    isBusy,
    isGeneratingDocument,
    generatedDocResponse,
    createdDocPdfBase64,
    createdDocFileName,
    updateAction,
    generateDocument,
    markPending,
    finalize,
    finalizeAsync,
    finalizePreviousVigente,
    cancelAction,
  } = usePersonnelActionDetail(actionId);

  const { departments, jobs } = usePersonnelActionLookups(true);

  const { data: authoritiesResp } = useQuery({
    queryKey: ['department-authorities-active'],
    queryFn: () => DepartmentAuthoritiesAPI.listPaged({ page: 1, pageSize: 100, onlyActive: true }),
    staleTime: 5 * 60 * 1000,
  });
  const authorities: DepartmentAuthorityDto[] =
    authoritiesResp?.status === 'success' ? (authoritiesResp.data?.items ?? []) : [];

  const { data: instProcResp } = useQuery({
    queryKey: ['ref-types', 'AP_PROCESO_INSTITUCIONAL'],
    queryFn: () => TiposReferenciaAPI.byCategory('AP_PROCESO_INSTITUCIONAL'),
    staleTime: 10 * 60 * 1000,
  });
  const institutionalProcessTypes: RefType[] =
    instProcResp?.status === 'success' ? (instProcResp.data ?? []) : [];

  const { data: mgmtLevelResp } = useQuery({
    queryKey: ['ref-types', 'AP_NIVEL_GESTION'],
    queryFn: () => TiposReferenciaAPI.byCategory('AP_NIVEL_GESTION'),
    staleTime: 10 * 60 * 1000,
  });
  const managementLevelTypes: RefType[] =
    mgmtLevelResp?.status === 'success' ? (mgmtLevelResp.data ?? []) : [];

  const handleGenerateDocument = async () => {
    if (!action) return;

    // Resolver nombre y cargo de cada responsable desde la vista EmployeeDetails
    const resolveEmp = async (id: number | null | undefined): Promise<any | null> => {
      if (!id) return null;
      try {
        const r = await VistaDetallesEmpleadosAPI.get(id);
        return r.status === 'success' ? r.data : null;
      } catch { return null; }
    };

    const [dthDir, authNom, elab, reviewer, registrar] = await Promise.all([
      resolveEmp(action.dthDirectorId),
      resolveEmp(action.authorityNominatorId),
      resolveEmp(action.elaboratorId),
      resolveEmp(action.reviewerId),
      resolveEmp(action.registrarId),
    ]);

    const overrides = buildDocumentOverrides(
      action, jobs, departments, authorities,
      { institutionalProcessTypes, managementLevelTypes },
      { dthDir, authNom, elab, reviewer, registrar }
    );
    generateDocument({ overrides: Object.keys(overrides).length > 0 ? overrides : null });
  };

  const handleUpdate = (data: CreatePersonnelActionRequest) => {
    const payload: UpdatePersonnelActionRequest = {
      actionNumber: data.actionNumber,
      actionDate: data.actionDate,
      effectiveDate: data.effectiveDate,
      endDate: data.endDate,
      originDepartmentId: data.originDepartmentId,
      originJobId: data.originJobId,
      originBudgetCode: data.originBudgetCode,
      destinationDepartmentId: data.destinationDepartmentId,
      destinationJobId: data.destinationJobId,
      destinationBudgetCode: data.destinationBudgetCode,
      previousRmu: data.previousRmu,
      newRmu: data.newRmu,
      legalBasis: data.legalBasis,
      reason: data.reason,
      observations: data.observations,
      swornDeclaration:     data.swornDeclaration,
      institutionalProcess: data.institutionalProcess,
      managementLevel:      data.managementLevel,
      dthDirectorId:        data.dthDirectorId,
      authorityNominatorId: data.authorityNominatorId,
      elaboratorId:         data.elaboratorId,
      reviewerId:           data.reviewerId,
      registrarId:          data.registrarId,
    };
    updateAction(payload, { onSuccess: () => setEditOpen(false) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !action) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">No se pudo cargar la acción de personal.</p>
        <Link href="/personnel-actions">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
          </Button>
        </Link>
      </div>
    );
  }

  const pdfToShow = generatedDocResponse?.pdfBase64 ?? createdDocPdfBase64 ?? undefined;
  const fileNameToShow = generatedDocResponse?.fileName ?? action.generatedDocumentFileName ?? createdDocFileName;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">

      {/* ── Cabecera ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/personnel-actions">
            <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
              <ArrowLeft className="mr-1 h-4 w-4" /> Acciones de Personal
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            Acción de Personal #{action.actionId}
          </h1>
          {action.actionNumber && (
            <p className="text-sm text-muted-foreground">{action.actionNumber}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge className={STATUS_BADGE[action.status] ?? ''}>
            {action.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="mr-2 h-4 w-4" /> Historial
          </Button>
        </div>
      </div>

      {/* ── Panel de acciones del flujo ───────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
            Acciones disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PersonnelActionActions
            actionId={actionId}
            status={action.status}
            isBusy={isBusy}
            onEdit={() => setEditOpen(true)}
            onGenerateDocument={handleGenerateDocument}
            onMarkPending={markPending}
            onFinalize={finalize}
            onCancel={cancelAction}
            signedDocumentStoredFileId={(action as any).signedDocumentStoredFileId ?? null}
            requiresAdUserDisable={action.actionTypeRequiresAdUserDisable ?? false}
            requiresAdUserCreation={action.actionTypeRequiresAdUserCreation ?? false}
            employeeId={action.employeeId}
            onAutoFinalize={async () => { await finalizeAsync(); }}
            onFinalizePreviousAction={async () => { await finalizePreviousVigente(action.employeeId); }}
          />
        </CardContent>
      </Card>

      {/* ── Documento generado ────────────────────────────── */}
      <DocumentPreviewPanel
        pdfBase64={pdfToShow}
        fileName={fileNameToShow}
        generatedDocumentId={action.generatedDocumentId}
        onRegenerate={handleGenerateDocument}
        isRegenerating={isGeneratingDocument}
      />

      {/* ── Documentos del trámite ───────────────────────── */}
      <ActionDocumentsPanel actionId={actionId} />

      {/* ── Información del trámite ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Datos Principales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="Empleado" value={action.employeeFullName} />
            <InfoRow label="Cédula" value={action.employeeIdCard} />
            <InfoRow label="Departamento" value={action.employeeDepartment} />
            <InfoRow label="Cargo" value={action.employeeJobTitle} />
            <Separator className="my-2" />
            <InfoRow label="Tipo de Acción" value={action.actionTypeName} />
            <InfoRow label="N° Acción" value={action.actionNumber} />
            <InfoRow label="Fecha Acción" value={action.actionDate?.slice(0, 10)} />
            <InfoRow label="Fecha Vigencia" value={action.effectiveDate?.slice(0, 10)} />
            <InfoRow label="Fecha Fin" value={action.endDate?.slice(0, 10)} />
            <Separator className="my-2" />
            <InfoRow
              label="Proceso Institucional"
              value={institutionalProcessTypes.find(
                t => (t.typeID ?? (t as any).typeId) === action.institutionalProcess
              )?.name}
            />
            <InfoRow
              label="Nivel de Gestión"
              value={managementLevelTypes.find(
                t => (t.typeID ?? (t as any).typeId) === action.managementLevel
              )?.name}
            />
            <InfoRow
              label="Decl. Juramentada"
              value={action.swornDeclaration != null ? (action.swornDeclaration ? 'Sí' : 'No') : undefined}
            />
            {action.employeeTypeId && (
              <InfoRow
                label="Régimen Laboral"
                value={action.employeeTypeName ?? String(action.employeeTypeId)}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Movimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Origen</p>
            <InfoRow label="Departamento" value={action.originDepartmentName} />
            <InfoRow label="Cargo" value={action.originJobTitle} />
            <InfoRow label="Cód. Presup." value={action.originBudgetCode} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground uppercase">Destino</p>
            <InfoRow label="Departamento" value={action.destinationDepartmentName} />
            <InfoRow label="Cargo" value={action.destinationJobTitle} />
            <InfoRow label="Cód. Presup." value={action.destinationBudgetCode} />
            <Separator className="my-2" />
            <InfoRow label="RMU Anterior" value={action.previousRmu} />
            <InfoRow label="RMU Nuevo" value={action.newRmu} />
          </CardContent>
        </Card>
      </div>

      {/* ── Base legal / motivo / observaciones ──────────── */}
      {(action.legalBasis || action.reason || action.observations) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sustento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {action.legalBasis && (
              <div>
                <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Base Legal</p>
                <p>{action.legalBasis}</p>
              </div>
            )}
            {action.reason && (
              <div>
                <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Motivo</p>
                <p>{action.reason}</p>
              </div>
            )}
            {action.observations && (
              <div>
                <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Observaciones</p>
                <p>{action.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Dialog Editar ─────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Acción de Personal</DialogTitle>
          </DialogHeader>
          <PersonnelActionForm
            defaultValues={action}
            isEdit
            isBusy={isBusy}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Dialog Historial ──────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Historial de Estados
            </DialogTitle>
          </DialogHeader>
          <StatusHistoryTimeline actionId={actionId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Panel de documentos adjuntos a la acción de personal ─────────────────────
function ActionDocumentsPanel({ actionId }: { actionId: number }) {
  const { data, isLoading } = useTanstackQuery({
    queryKey: ['personnel-action-docs', actionId],
    queryFn: () => DocumentsAPI.listByEntity({
      directoryCode: PERSONNEL_ACTION_DIRECTORY_CODE,
      entityType: PERSONNEL_ACTION_ENTITY_TYPE,
      entityId: String(actionId),
      status: 1,
    }),
    enabled: actionId > 0,
    staleTime: 30_000,
  });

  const files = data?.status === 'success' ? data.data : [];

  async function openFile(fileGuid: string) {
    const resp = await DocumentsAPI.download(fileGuid);
    if (resp.status !== 'success') return;
    const url = URL.createObjectURL(resp.data);
    window.open(url, '_blank');
  }

  async function downloadFile(fileGuid: string, name: string) {
    const resp = await DocumentsAPI.download(fileGuid);
    if (resp.status !== 'success') return;
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Documentos del Trámite
          {files.length > 0 && (
            <span className="ml-auto text-xs font-normal bg-muted rounded px-2 py-0.5">{files.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando documentos…
          </p>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin documentos adjuntos.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file, idx) => {
              const name = file.originalFileName ?? file.storedFileName ?? `Documento ${idx + 1}`;
              const isPdf = name.toLowerCase().endsWith('.pdf');
              const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(name);
              return (
                <div key={file.fileGuid ?? idx} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm truncate font-medium">{name}</p>
                      {file.sizeBytes && (
                        <p className="text-xs text-muted-foreground">{(file.sizeBytes / 1024).toFixed(1)} KB</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(isPdf || isImg) && (
                      <Button variant="ghost" size="icon" title="Vista previa" onClick={() => openFile(file.fileGuid)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Descargar" onClick={() => downloadFile(file.fileGuid, name)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
