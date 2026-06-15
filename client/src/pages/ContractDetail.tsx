// src/pages/ContractDetail.tsx
import { useMemo, useRef, useState } from 'react';
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
import { Loader2, ArrowLeft, History, CheckCircle2, Clock, XCircle, Edit3, FolderOpen, Lock } from 'lucide-react';
import { useContractDetail } from '@/hooks/contracts/useContractDetail';
import { useContractLookups } from '@/hooks/contracts/useContractLookups';
import { useAuth } from '@/features/auth';
import { TiposReferenciaAPI } from '@/lib/api';
import { ContractActions } from '@/components/contracts/ContractActions';
import { DocumentPreviewPanel } from '@/components/personnelActions/DocumentPreviewPanel';
import { ContractDialog } from '@/components/contracts/ContractDialog';
import {
  ReusableDocumentManager,
  type ReusableDocumentManagerHandle,
} from '@/components/ReusableDocumentManager';
import {
  CONTRACT_DIRECTORY_CODE,
  CONTRACT_ENTITY_TYPE,
} from '@/features/constants';
import type { ContractStatusHistoryEntry } from '@/types/contractDetail';

const STATUS_BADGE: Record<string, string> = {
  BORRADOR: 'bg-secondary text-secondary-foreground',
  GENERADO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PENDIENTE_FIRMAS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  FIRMADO_CARGADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  FINALIZADO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  VIGENTE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  VENCIDO: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  RENUNCIA: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ANULADO: 'bg-destructive/10 text-destructive',
};

const STATUS_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  GENERADO: 'Generado',
  PENDIENTE_FIRMAS: 'Pendiente de firmas',
  FIRMADO_CARGADO: 'Firmado cargado',
  FINALIZADO: 'Finalizado',
  VIGENTE: 'Vigente',
  VENCIDO: 'Vencido',
  RENUNCIA: 'Renuncia',
  ANULADO: 'Anulado',
};

function InfoRow({ label, value }: { label: string; value?: string | null | number }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm min-w-0">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="font-medium break-words min-w-0 overflow-hidden">{String(value)}</span>
    </div>
  );
}

function HistoryEntry({ entry }: { entry: ContractStatusHistoryEntry }) {
  const icon =
    entry.statusCode === 'FINALIZADO' ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : entry.statusCode === 'ANULADO' ? (
      <XCircle className="h-4 w-4 text-destructive" />
    ) : (
      <Clock className="h-4 w-4 text-muted-foreground" />
    );

  const label = STATUS_LABEL[entry.statusCode] ?? entry.statusCode;

  return (
    <li className="ml-6">
      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-border">
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(entry.changedAt).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        {entry.comment && (
          <p className="text-xs text-muted-foreground italic">"{entry.comment}"</p>
        )}
      </div>
    </li>
  );
}

type DialogMode = 'create' | 'view' | 'edit';

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const contractId = Number(id);
  const { user, employeeDetails } = useAuth();

  const [historyOpen, setHistoryOpen]   = useState(false);
  const [editOpen, setEditOpen]         = useState(false);
  const [editMode, setEditMode]         = useState<DialogMode>('edit');
  const docManagerRef = useRef<ReusableDocumentManagerHandle>(null);

  const {
    contract,
    docStatus,
    statusHistory,
    isLoading,
    isError,
    isBusy,
    isGeneratingDocument,
    generatedPdfBase64,
    generatedFileName,
    generateDocument,
    markPending,
    finalize,
    cancelContract,
    invalidate,
  } = useContractDetail(contractId);

  // Lookups para resolver IDs → nombres
  const lookups = useContractLookups({ enabled: !!contract });

  const qStatusTypes = useQuery({
    queryKey: ['reftypes', 'CONTRACT_STATUS'],
    queryFn: () => TiposReferenciaAPI.byCategory('CONTRACT_STATUS'),
    staleTime: 10 * 60 * 1000,
  });
  const statusTypes = qStatusTypes.data?.status === 'success' ? qStatusTypes.data.data ?? [] : [];

  const statusById = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of statusTypes) {
      const id = (s as any).typeId ?? (s as any).typeID;
      if (id != null) m.set(Number(id), (s as any).name as string);
    }
    return m;
  }, [statusTypes]);

  const peopleById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of lookups.people ?? []) {
      const id = (p as any).personId ?? (p as any).personID;
      if (id != null) {
        const name = `${(p as any).firstName ?? ''} ${(p as any).lastName ?? ''}`.trim();
        m.set(Number(id), name || `ID ${id}`);
      }
    }
    return m;
  }, [lookups.people]);

  const typeById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of lookups.types ?? []) {
      const id = (t as any).contractTypeId ?? (t as any).contractTypeID;
      if (id != null) m.set(Number(id), (t as any).name ?? String(id));
    }
    return m;
  }, [lookups.types]);

  const deptById = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of lookups.depts ?? []) {
      const id = (d as any).departmentId ?? (d as any).departmentID;
      if (id != null) m.set(Number(id), (d as any).name ?? (d as any).code ?? String(id));
    }
    return m;
  }, [lookups.depts]);

  const jobById = useMemo(() => {
    const m = new Map<number, string>();
    for (const j of lookups.jobs ?? []) {
      const id = (j as any).jobID ?? (j as any).jobId;
      if (id != null) m.set(Number(id), (j as any).description ?? (j as any).name ?? String(id));
    }
    return m;
  }, [lookups.jobs]);

  // Estado del contrato (nombre español) derivado del ref_type ID
  const contractStatusName = contract
    ? (statusById.get(Number(contract.status)) ?? 'BORRADOR')
    : 'BORRADOR';

  // Solo BORRADOR y GENERADO permiten edición de datos
  const isEditable = ['BORRADOR', 'GENERADO'].includes(contractStatusName);

  const pdfToShow = generatedPdfBase64 ?? undefined;
  const fileNameToShow = generatedFileName ?? docStatus?.fileName ?? undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">No se pudo cargar el contrato.</p>
        <Link href="/contracts">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
          </Button>
        </Link>
      </div>
    );
  }

  // Guard de acceso: solo el creador del contrato o administrador HR (permiso /people)
  const isOwner = Number(contract.createdBy) === employeeDetails?.employeeID;
  const isAdmin = user?.permissions?.some((p) => p === '/people') ?? false;
  if (employeeDetails !== null && !isOwner && !isAdmin) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <Lock className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Acceso denegado</h2>
          <p className="text-muted-foreground mb-4">
            No tienes permiso para ver este contrato.
          </p>
          <Link href="/contracts">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">

      {/* ── Cabecera ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <Link href="/contracts">
            <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
              <ArrowLeft className="mr-1 h-4 w-4" /> Contratos
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            Contrato #{contract.contractID}
          </h1>
          {contract.contractCode && (
            <p className="text-sm text-muted-foreground break-words">{contract.contractCode}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <Badge className={STATUS_BADGE[contractStatusName] ?? 'bg-secondary text-secondary-foreground'}>
            {STATUS_LABEL[contractStatusName] ?? contractStatusName}
          </Badge>
          {isEditable && (
            <Button
              size="sm"
              onClick={() => { setEditMode('edit'); setEditOpen(true); }}
            >
              <Edit3 className="mr-2 h-4 w-4" /> Editar datos
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="mr-2 h-4 w-4" /> Historial
          </Button>
        </div>
      </div>

      {/* ── Panel de acciones del flujo documental ────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
            Acciones disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContractActions
            contractId={contractId}
            status={contractStatusName}
            isBusy={isBusy}
            onGenerateDocument={generateDocument}
            onMarkPending={markPending}
            onFinalize={finalize}
            onCancel={cancelContract}
            onUploadSuccess={invalidate}
          />
        </CardContent>
      </Card>

      {/* ── Documento generado ────────────────────────────── */}
      <DocumentPreviewPanel
        pdfBase64={pdfToShow}
        fileName={fileNameToShow}
        generatedDocumentId={docStatus?.generatedDocumentId}
        onRegenerate={() => generateDocument({ forceRegenerate: true })}
        isRegenerating={isGeneratingDocument}
      />

      {/* ── Información del contrato ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Datos del Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="Código" value={contract.contractCode} />
            <InfoRow
              label="Persona"
              value={peopleById.get(Number(contract.personID)) ?? `ID ${contract.personID}`}
            />
            <InfoRow
              label="Tipo de Contrato"
              value={typeById.get(Number(contract.contractTypeID)) ?? `ID ${contract.contractTypeID}`}
            />
            <Separator className="my-2" />
            <InfoRow
              label="Departamento"
              value={deptById.get(Number(contract.departmentID)) ?? `ID ${contract.departmentID}`}
            />
            {contract.jobID != null && (
              <InfoRow
                label="Cargo"
                value={jobById.get(Number(contract.jobID)) ?? `ID ${contract.jobID}`}
              />
            )}
            <Separator className="my-2" />
            <InfoRow label="Inicio" value={String(contract.startDate).slice(0, 10)} />
            <InfoRow label="Fin" value={String(contract.endDate).slice(0, 10)} />
            <InfoRow label="Fecha Autorización" value={contract.authorizationDate?.slice(0, 10)} />
            <InfoRow
              label="Estado"
              value={STATUS_LABEL[contractStatusName] ?? contractStatusName}
            />
            <Separator className="my-2" />
            <InfoRow
              label="Régimen laboral"
              value={
                (contract as any).laborRegimeName
                ?? ({ 57: "LOSEP", 58: "LOES", 59: "Código Trabajo" } as any)[(contract as any).laborRegimeID]
                ?? null
              }
            />
            <InfoRow
              label="Modalidad"
              value={
                (contract as any).workModalityName
                ?? ({ 143: "Medio Día", 144: "Día Completo", 145: "Por Horas" } as any)[(contract as any).workModalityID]
                ?? null
              }
            />
            <InfoRow
              label="Horas contratadas"
              value={(contract as any).contractedHours != null && (contract as any).contractedHours > 0
                ? `${(contract as any).contractedHours}h`
                : null}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estado Documental</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow
              label="Estado"
              value={docStatus?.documentStatus ?? '—'}
            />
            <InfoRow
              label="Documento generado"
              value={docStatus?.generatedDocumentId ? `Documento #${docStatus.generatedDocumentId}` : '—'}
            />
            <InfoRow
              label="Archivo firmado"
              value={docStatus?.storedFileId ? `Archivo #${docStatus.storedFileId}` : '—'}
            />
            <InfoRow
              label="Doc. congelado"
              value={docStatus?.isDocumentFrozen ? 'Sí' : 'No'}
            />
            {docStatus?.fileName && (
              <div className="text-sm min-w-0">
                <span className="text-muted-foreground block">Nombre del archivo</span>
                <span className="font-medium break-all block">{docStatus.fileName}</span>
              </div>
            )}
            <Separator className="my-2" />
            <InfoRow label="Creado" value={String(contract.createdAt).slice(0, 10)} />
            <InfoRow label="Actualizado" value={contract.updatedAt ? String(contract.updatedAt).slice(0, 10) : '—'} />
          </CardContent>
        </Card>
      </div>

      {/* ── Descripción ───────────────────────────────────── */}
      {contract.contractDescription && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Descripción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm break-words">{contract.contractDescription}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Archivos adjuntos ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Archivos adjuntos del contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReusableDocumentManager
            ref={docManagerRef}
            label=""
            directoryCode={CONTRACT_DIRECTORY_CODE}
            entityType={CONTRACT_ENTITY_TYPE}
            entityId={contractId}
            entityReady={true}
            relativePath=""
            accept="*/*"
            maxSizeMB={20}
            maxFiles={10}
            showInternalUploadButton={true}
            disabled={!isEditable}
            roles={{
              canUpload: isEditable,
              canPreview: true,
              canDownload: true,
              canDelete: isEditable,
            }}
            documentType={{ enabled: isEditable, required: false }}
          />
        </CardContent>
      </Card>

      {/* ── Dialog de edición ────────────────────────────── */}
      <ContractDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) invalidate();
        }}
        mode={editMode}
        setMode={setEditMode}
        selected={contract}
      />

      {/* ── Dialog Historial ──────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Historial de Estados
            </DialogTitle>
          </DialogHeader>
          {statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Sin historial de estados.</p>
          ) : (
            <ol className="relative border-l border-border ml-3 space-y-6 py-2">
              {statusHistory.map((entry, i) => (
                <HistoryEntry key={entry.historyId ?? i} entry={entry} />
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
