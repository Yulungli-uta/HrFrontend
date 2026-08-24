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
import { Loader2, ArrowLeft, History } from 'lucide-react';
import { usePersonnelActionDetail } from '@/hooks/personnelActions/usePersonnelActionDetail';
import { usePersonnelActionLookups } from '@/hooks/personnelActions/usePersonnelActionLookups';
import { PersonnelActionActions } from '@/components/personnelActions/PersonnelActionActions';
import { PersonnelActionForm } from '@/components/personnelActions/PersonnelActionForm';
import { DocumentPreviewPanel } from '@/components/personnelActions/DocumentPreviewPanel';
import { StatusHistoryTimeline } from '@/components/personnelActions/StatusHistoryTimeline';
import { ActionDocumentsPanel } from '@/components/personnelActions/ActionDocumentsPanel';
import { TiposReferenciaAPI } from '@/lib/api';
import { REF_TYPE_CATEGORIES } from '@/features/refTypeCategories';
import type { VwJobWithDegreeAndGroup, VwDepartmentWithType } from '@/lib/api/services/views';
import type { RefType } from '@/lib/api';
import type { CreatePersonnelActionRequest, UpdatePersonnelActionRequest, PersonnelActionDetail } from '@/types/personnel-actions';

function formatCurrency(value: number): string {
  return value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildDocumentOverrides(
  action: PersonnelActionDetail,
  jobs: VwJobWithDegreeAndGroup[],
  departments: VwDepartmentWithType[]
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

  // CURRENT_/PROPOSED_INSTITUTIONAL_PROCESS y CURRENT_/PROPOSED_MANAGEMENT_LEVEL los
  // resuelve el backend directamente (PersonnelActionService.BuildActionOverrides) —
  // el campo único del formulario describe el DESTINO, y el de ORIGEN se deriva del tipo
  // del departamento de origen. No se envían como overrides desde aquí para que crear y
  // regenerar el documento den siempre el mismo resultado. Corregido 2026-08-18 (antes
  // el campo del formulario se imprimía por error en SITUACIÓN ACTUAL).

  // Declaración juramentada: marca para la plantilla.
  // swornDeclaration=true → presentó la declaración (marca en SI); false → marca en NO APLICA.
  ov['DECLARACION_JURADA_SI_MARK'] = action.swornDeclaration ? 'X' : '';
  ov['DECLARACION_JURADA_MARK'] = action.swornDeclaration ? '' : 'X';

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
  }

  if (action.newRmu != null) ov['PROPOSED_SALARY'] = formatCurrency(action.newRmu);
  if (action.previousRmu != null) ov['CURRENT_SALARY'] = formatCurrency(action.previousRmu);
  if (action.destinationBudgetCode && !ov['PROPOSED_BUDGET_CODE']) ov['PROPOSED_BUDGET_CODE'] = action.destinationBudgetCode;
  if (action.originBudgetCode && !ov['CURRENT_BUDGET_CODE']) ov['CURRENT_BUDGET_CODE'] = action.originBudgetCode;

  // Nombre y cargo de los 5 responsables (Director DTH, Autoridad Nominadora,
  // Elaborador, Revisor, Registrador) los resuelve el backend directamente
  // (PersonnelActionRepository.ResolveEmployeeAsync) a partir del ID guardado en la
  // acción — incluye prioridad a HR.tbl_DepartmentAuthorities cuando la persona
  // seleccionada tiene una autoridad institucional vigente. No se envían como
  // overrides desde aquí: antes existía un fallback que, si el ID no resolvía,
  // adivinaba el responsable tomando la primera autoridad activa que calzara por
  // nombre de tipo (ej. "RECTOR"/"NOMIN") — podía asignar a la persona equivocada
  // como firmante de un documento oficial. Eliminado 2026-08-18.

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

  const { data: instProcResp } = useQuery({
    queryKey: ['ref-types', 'AP_PROCESO_INSTITUCIONAL'],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.AP_PROCESO_INSTITUCIONAL),
    staleTime: 10 * 60 * 1000,
  });
  const institutionalProcessTypes: RefType[] =
    instProcResp?.status === 'success' ? (instProcResp.data ?? []) : [];

  const { data: mgmtLevelResp } = useQuery({
    queryKey: ['ref-types', 'AP_NIVEL_GESTION'],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.AP_NIVEL_GESTION),
    staleTime: 10 * 60 * 1000,
  });
  const managementLevelTypes: RefType[] =
    mgmtLevelResp?.status === 'success' ? (mgmtLevelResp.data ?? []) : [];

  const { data: workplaceResp } = useQuery({
    queryKey: ['ref-types', 'AP_LUGAR_TRABAJO'],
    queryFn: () => TiposReferenciaAPI.byCategory(REF_TYPE_CATEGORIES.AP_LUGAR_TRABAJO),
    staleTime: 10 * 60 * 1000,
  });
  const workplaceTypes: RefType[] =
    workplaceResp?.status === 'success' ? (workplaceResp.data ?? []) : [];

  const handleGenerateDocument = () => {
    if (!action) return;

    // Nombre/cargo de los 5 responsables los resuelve el backend directamente
    // (ver comentario en buildDocumentOverrides) — no se resuelven ni se envían
    // como overrides desde aquí.
    const overrides = buildDocumentOverrides(action, jobs, departments);
    generateDocument({ overrides: Object.keys(overrides).length > 0 ? overrides : null });
  };

  const buildUpdatePayload = (data: CreatePersonnelActionRequest): UpdatePersonnelActionRequest => ({
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
    workplace:            data.workplace,
    dthDirectorId:        data.dthDirectorId,
    authorityNominatorId: data.authorityNominatorId,
    elaboratorId:         data.elaboratorId,
    reviewerId:           data.reviewerId,
    registrarId:          data.registrarId,
  });

  const handleUpdate = (data: CreatePersonnelActionRequest) => {
    updateAction(buildUpdatePayload(data), { onSuccess: () => setEditOpen(false) });
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
            onAutoFinalize={async () => { await finalizeAsync(undefined); }}
            onFinalizePreviousAction={async () => { await finalizePreviousVigente(action.employeeId); }}
            reachesVigente={action.actionTypeReachesVigente ?? false}
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
              label="Lugar de Trabajo (propuesto)"
              value={
                workplaceTypes.find(
                  t => (t.typeID ?? (t as any).typeId) === action.workplace
                )?.name ?? action.workplaceName
              }
            />
            {action.previousWorkplaceName && (
              <InfoRow label="Lugar de Trabajo (actual)" value={action.previousWorkplaceName} />
            )}
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
