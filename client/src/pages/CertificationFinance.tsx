// src/pages/CertificationFinance.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataPagination } from "@/components/ui/DataPagination";

import { useAuth } from "@/features/auth";
import { useToast } from "@/hooks/use-toast";

import { FileManagementAPI } from "@/lib/api";

import type { DialogMode, UIFinancialCertification } from "@/types/certificationFinance";
import { mapToUI, filterCerts, calcStats, statusTextFromName } from "@/utils/certificationfinance";
import {
  useDirectoryParams,
  useCertifications,
  useCertStatusTypes,
  useCertificationMutations,
} from "@/hooks/certification-finance/hook";
import { CertificationHeader } from "@/components/certification-finance/CertificationHeader";
import { CertificationStats } from "@/components/certification-finance/CertificationStats";
import { CertificationSearch } from "@/components/certification-finance/CertificationSearch";
import { CertificationListMobile } from "@/components/certification-finance/CertificationListMobile";
import { CertificationListDesktop } from "@/components/certification-finance/CertificationListDesktop";
import { CertificationDialog } from "@/components/certification-finance/CertificationDialog";
import { parseApiError } from '@/lib/error-handling';

export default function FinancialCertificationPage() {
  const { toast } = useToast();
  const { user, employeeDetails } = useAuth();

  const ctxCreatedBy = Number.isFinite(Number(employeeDetails?.employeeID))
    ? Number(employeeDetails?.employeeID)
    : (Number.isFinite(Number(user?.id)) ? Number(user?.id) : 0);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // modal único (create/view/edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<UIFinancialCertification | null>(null);

  const { data: dirResp, isLoading: isDirLoading, isError: isDirError, refetch: refetchDir } =
    useDirectoryParams("FINCERT");
  const dirParam = dirResp?.status === "success" ? (dirResp.data as any) : undefined;

  const directoryCode = dirParam?.code ?? "FINCERT";
  const uploadMaxSizeMB = Number(dirParam?.maxSizeMb ?? 25);
  const uploadAccept = dirParam?.extension
    ? `.${String(dirParam.extension).replace(/^\./, "").toLowerCase()}`
    : ".pdf";

  const normalizedRelativePath =
    (dirParam?.relativePath && dirParam.relativePath.trim().length > 0)
      ? dirParam.relativePath
      : "/financial-certifications/";

  useEffect(() => { setPage(1); }, [searchTerm, statusFilter]);

  const { data: apiResponse, isLoading, error } = useCertifications();
  const { data: certStatusTypesResp } = useCertStatusTypes();
  const { createMutation, updateMutation, approveMutation, rejectMutation, rejectTemporaryMutation, resendMutation } = useCertificationMutations();

  // Mapa typeId → name para resolver statusName cuando el backend lo omite
  const statusById = useMemo(() => {
    const map = new Map<number, string>();
    if (certStatusTypesResp?.status === "success") {
      for (const rt of (certStatusTypesResp.data ?? [])) {
        const id: number | undefined = rt.typeId ?? rt.typeID;
        if (id != null) map.set(id, rt.name as string);
      }
    }
    return map;
  }, [certStatusTypesResp]);

  // Opciones del dropdown — provienen del catálogo, no de los datos
  const statusOptions = useMemo(() => {
    if (certStatusTypesResp?.status !== "success") return [];
    return (certStatusTypesResp.data ?? []).map((rt: any) => {
      const name = (rt.name as string).toUpperCase();
      return { name, text: statusTextFromName(rt.name as string) };
    });
  }, [certStatusTypesResp]);

  // Todos los certs enriquecidos con statusName resuelto del catálogo si venía null
  const allCerts = useMemo(() => {
    if (apiResponse?.status !== "success") return [];
    const raw: any[] = apiResponse.data || [];
    const enriched = raw.map((c) => ({
      ...c,
      statusName: c.statusName ?? statusById.get(c.status) ?? null,
    }));
    return mapToUI(enriched);
  }, [apiResponse, statusById]);

  const filtered = useMemo(() => {
    let list = allCerts;
    if (statusFilter !== "all") {
      list = list.filter((c) => (c.statusName ?? "").toUpperCase() === statusFilter);
    }
    const filteredList = filterCerts(list, searchTerm);
    return [...filteredList].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [allCerts, searchTerm, statusFilter]);

  // Stats siempre sobre todos los certs sin filtro
  const stats = useMemo(() => calcStats(allCerts), [allCerts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const directoryInfo = useMemo(() => {
    if (isDirLoading) return "Cargando parámetros FINCERT...";
    if (isDirError) return "No se pudo cargar FINCERT (usando valores por defecto)";
    return `${directoryCode} → ext: ${uploadAccept}, máx: ${uploadMaxSizeMB}MB`;
  }, [isDirLoading, isDirError, directoryCode, uploadAccept, uploadMaxSizeMB]);

  const downloadLegacy = useCallback(
    async (directoryCodeParam: string, filePath: string, suggestedName?: string) => {
      try {
        const resp = await FileManagementAPI.downloadFile(directoryCodeParam, filePath);
        if (resp.status === "success") {
          const blob = resp.data as unknown as Blob;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = suggestedName ?? "archivo";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } else {
          toast({
            title: "No se pudo descargar",
            description: resp.error.message,
            variant: "destructive",
          });
        }
      } catch (e: unknown) {
        toast({
          title: "Error de red al descargar",
          description: parseApiError(e).message,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const openCreate = () => {
    setSelected(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openView = (c: UIFinancialCertification) => {
    setSelected(c);
    setDialogMode("view");
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center space-x-2 mb-4 md:mb-6">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || apiResponse?.status === "error") {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error al cargar las certificaciones financieras.{" "}
              {apiResponse?.status === "error" ? apiResponse.error.message : "Intente nuevamente."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <CertificationHeader onCreate={openCreate} directoryInfo={directoryInfo} />

      <CertificationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        setMode={setDialogMode}
        selected={selected}
        setSelected={setSelected}
        directoryCode={directoryCode}
        relativePath={normalizedRelativePath}
        accept={uploadAccept}
        maxSizeMB={uploadMaxSizeMB}
        dirParam={dirParam}
        isDirLoading={isDirLoading}
        isDirError={isDirError}
        refetchDir={refetchDir}
        ctxCreatedBy={ctxCreatedBy}
        createAsync={(p) => createMutation.mutateAsync(p as any)}
        updateAsync={(args) => updateMutation.mutateAsync(args as any)}
        isCreatePending={createMutation.isPending}
        isUpdatePending={updateMutation.isPending}
        approveAsync={(id) => approveMutation.mutateAsync(id)}
        rejectAsync={(id, reason) => rejectMutation.mutateAsync({ id, reason })}
        onDownloadLegacy={downloadLegacy}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={(id, reason) => rejectMutation.mutate({ id, reason })}
        isApprovePending={approveMutation.isPending}
        isRejectPending={rejectMutation.isPending}
        onRejectTemporary={(id, reason) => rejectTemporaryMutation.mutate({ id, reason })}
        isRejectTemporaryPending={rejectTemporaryMutation.isPending}
        onResend={(id) => resendMutation.mutate(id)}
        isResendPending={resendMutation.isPending}
      />

      <CertificationStats
        list={allCerts}
        totalBudget={stats.totalBudget}
        expiringSoon={stats.expiringSoon}
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statusOptions.map(({ name, text }) => (
              <SelectItem key={name} value={name}>{text}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1">
          <CertificationSearch value={searchTerm} onChange={(v) => { setSearchTerm(v); setPage(1); }} />
        </div>
      </div>

      <CertificationListMobile
        list={paginated}
        directoryCode={directoryCode}
        onView={openView}
        onDownloadLegacy={downloadLegacy}
      />

      <CertificationListDesktop
        list={paginated}
        total={filtered.length}
        searchTerm={searchTerm}
        directoryCode={directoryCode}
        onView={openView}
        onDownloadLegacy={downloadLegacy}
      />

      <DataPagination
        page={page}
        totalPages={totalPages}
        totalCount={filtered.length}
        pageSize={pageSize}
        hasPreviousPage={page > 1}
        hasNextPage={page < totalPages}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        disabled={isLoading}
      />
    </div>
  );
}
