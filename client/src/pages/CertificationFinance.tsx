// src/pages/CertificationFinance.tsx
import { useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { FileManagementAPI, TiposReferenciaAPI, type ApiResponse } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

import type { DialogMode, UIFinancialCertification } from "@/types/certificationFinance";
import { mapToUI, filterCerts, calcStats } from "@/utils/certificationfinance";
import { useDirectoryParams, useCertifications, useCertificationMutations } from "@/hooks/certification-finance/hook";
import { CertificationHeader } from "@/components/certification-finance/CertificationHeader";
import { CertificationStats } from "@/components/certification-finance/CertificationStats";
import { CertificationSearch } from "@/components/certification-finance/CertificationSearch";
import { CertificationListMobile } from "@/components/certification-finance/CertificationListMobile";
import { CertificationListDesktop } from "@/components/certification-finance/CertificationListDesktop";
import { CertificationDialog } from "@/components/certification-finance/CertificationDialog";

export default function FinancialCertificationPage() {
  const { toast } = useToast();
  const { user, employeeDetails } = useAuth();

  const ctxCreatedBy = Number.isFinite(Number(employeeDetails?.employeeID))
    ? Number(employeeDetails?.employeeID)
    : (Number.isFinite(Number(user?.id)) ? Number(user?.id) : 0);

  const [searchTerm, setSearchTerm] = useState("");

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

  const { data: apiResponse, isLoading, error } = useCertifications();
  const { createMutation, updateMutation } = useCertificationMutations();

  // Estados (reftype) para CERT_FINANCE_TYPE: se usa en tablas/listas
  const CERT_FINANCE_TYPE_CATEGORY = "CERT_FINANCE_TYPE";
  const { data: statusRefResp } = useQuery<ApiResponse<any[]>>({
    queryKey: ["refTypes", CERT_FINANCE_TYPE_CATEGORY],
    queryFn: () =>
      TiposReferenciaAPI.byCategory(CERT_FINANCE_TYPE_CATEGORY) as Promise<ApiResponse<any[]>>,
    staleTime: 10 * 60 * 1000,
  });
  const statusRefTypes = statusRefResp?.status === "success" ? statusRefResp.data : [];

  const certifications = useMemo(() => {
    if (apiResponse?.status !== "success") return [];
    return mapToUI(apiResponse.data || []);
  }, [apiResponse]);

  const filtered = useMemo(() => filterCerts(certifications, searchTerm), [certifications, searchTerm]);
  const stats = useMemo(() => calcStats(certifications), [certifications]);

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
            description: resp.error?.message ?? "Error desconocido",
            variant: "destructive",
          });
        }
      } catch (e: any) {
        toast({ title: "Error de red al descargar", description: e?.message, variant: "destructive" });
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

  // loading / error
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center space-x-2 mb-4 md:mb-6">
          <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || apiResponse?.status === "error") {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">
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
        onDownloadLegacy={downloadLegacy}
      />

     <CertificationStats
        list={certifications}              
        statusRefTypes={statusRefTypes}
        totalBudget={stats.totalBudget}
        expiringSoon={stats.expiringSoon}
      />

      <CertificationSearch value={searchTerm} onChange={setSearchTerm} />

      <CertificationListMobile
        list={filtered}
        statusRefTypes={statusRefTypes}
        directoryCode={directoryCode}
        onView={openView}
        onDownloadLegacy={downloadLegacy}
      />

      <CertificationListDesktop
        list={filtered}
        total={stats.total}
        searchTerm={searchTerm}
        statusRefTypes={statusRefTypes}
        directoryCode={directoryCode}
        onView={openView}
        onDownloadLegacy={downloadLegacy}
      />
    </div>
  );
}
