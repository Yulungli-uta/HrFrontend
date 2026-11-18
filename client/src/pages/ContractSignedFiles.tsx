// pages/ContractSignedFiles.tsx
// Contratos que tienen archivo firmado registrado. Al visualizar, el backend lee el PDF del servidor de archivos.
// La UI solo consulta; permisos y alcance por departamento los aplica el backend.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileCheck, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { DataPagination } from "@/components/ui/DataPagination";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import { PdfPreviewModal } from "@/components/reports/PdfPreviewModal";
import { SignedFileTrackingAPI } from "@/lib/api/services/signedFileTracking";
import { ContractTypeAPI } from "@/lib/api/services/contracts";
import { unwrapApiResponse } from "@/lib/api/utils/error-handling";
import { REF_TYPE_CATEGORIES } from "@/features/refTypeCategories";
import { useRefTypesByCategory } from "@/hooks/useRefTypes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSignedFilePreview } from "@/hooks/useSignedFilePreview";
import { formatDate } from "@/lib/clock";

const ALL = "__all__";

const STATUS_TONE: Record<string, StatusTone> = {
  VIGENTE: "success",
  FIRMADO_CARGADO: "primary",
  FINALIZADO: "primary",
  ANULADO: "destructive",
  RENUNCIA: "warning",
  VENCIDO: "muted",
};

const statusLabel = (name: string | null) => (name ? name.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "—");

type ContractTypeItem = { contractTypeId?: number; contractTypeID?: number; id?: number; name?: string };

export default function ContractSignedFilesPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 400);
  const [statusTypeId, setStatusTypeId] = useState(ALL);
  const [contractTypeId, setContractTypeId] = useState(ALL);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: statusTypes } = useRefTypesByCategory(REF_TYPE_CATEGORIES.CONTRACT_STATUS);
  const types = useQuery({
    queryKey: ["contract-types", "all"],
    queryFn: async () => unwrapApiResponse(await ContractTypeAPI.list()) as ContractTypeItem[],
    staleTime: 5 * 60 * 1000,
  });

  const list = useQuery({
    queryKey: ["signed-files", "contracts", search, statusTypeId, contractTypeId, departmentId, startDate, endDate, page, pageSize],
    queryFn: async () =>
      unwrapApiResponse(
        await SignedFileTrackingAPI.listContracts({
          search: search || undefined,
          statusTypeId: statusTypeId === ALL ? undefined : Number(statusTypeId),
          contractTypeId: contractTypeId === ALL ? undefined : Number(contractTypeId),
          departmentId: departmentId ?? undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          pageSize,
        })
      ),
    placeholderData: (prev) => prev,
  });
  const data = list.data;

  const { open, close, loadingId, preview } = useSignedFilePreview(SignedFileTrackingAPI.contractFile);

  const resetPage = () => setPage(1);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="page-title">
          <FileCheck className="h-6 w-6" aria-hidden="true" /> Contratos con archivo firmado
        </h1>
        <p className="page-subtitle">Contratos que tienen un archivo firmado registrado</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Filtros</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  resetPage();
                }}
                placeholder="Cédula, nombre o N.º de contrato"
                aria-label="Buscar"
                className="pl-8"
              />
            </div>
            <Select
              value={contractTypeId}
              onValueChange={(v) => {
                setContractTypeId(v);
                resetPage();
              }}
            >
              <SelectTrigger className="w-56" aria-label="Tipo de contrato">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los tipos</SelectItem>
                {(types.data ?? []).map((t) => {
                  const id = t.contractTypeId ?? t.contractTypeID ?? t.id;
                  return id == null ? null : (
                    <SelectItem key={id} value={String(id)}>
                      {t.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select
              value={statusTypeId}
              onValueChange={(v) => {
                setStatusTypeId(v);
                resetPage();
              }}
            >
              <SelectTrigger className="w-48" aria-label="Estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {statusTypes.map((s) => (
                  <SelectItem key={s.typeID ?? s.typeId} value={String(s.typeID ?? s.typeId)}>
                    {statusLabel(s.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DepartmentSelect
              value={departmentId}
              onChange={(v) => {
                setDepartmentId(v);
                resetPage();
              }}
              placeholder="Departamento"
              className="w-64"
            />
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => {
                setStartDate(e.target.value);
                resetPage();
              }}
              aria-label="Inicio desde"
              className="w-40"
            />
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                resetPage();
              }}
              aria-label="Inicio hasta"
              className="w-40"
            />
          </div>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Cargando" />
            </div>
          ) : list.isError ? (
            <p className="py-6 text-center text-sm text-destructive" role="alert">
              {(list.error as Error).message}
            </p>
          ) : (data?.items.length ?? 0) === 0 ? (
            <div className="empty-state">
              <FileCheck className="empty-state-icon" aria-hidden="true" />
              <p className="empty-state-title">Sin contratos con archivo firmado</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N.º de contrato</TableHead>
                    <TableHead>Persona</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Realizado por</TableHead>
                    <TableHead className="text-right">Archivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.items.map((c) => (
                    <TableRow key={c.contractId}>
                      <TableCell className="whitespace-nowrap font-mono text-sm">{c.contractCode ?? "—"}</TableCell>
                      <TableCell>
                        <div className="font-medium">{c.personName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.personIdCard ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-sm">{c.departmentName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{c.contractTypeName ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge label={statusLabel(c.statusName)} tone={STATUS_TONE[c.statusName ?? ""] ?? "muted"} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(c.startDate)} – {formatDate(c.endDate)}
                      </TableCell>
                      <TableCell className="text-sm">{c.createdByName || "—"}</TableCell>
                      <TableCell className="text-right">
                        {loadingId === c.contractId ? (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" aria-label="Abriendo archivo" />
                        ) : (
                          <ActionIconButton
                            icon={Eye}
                            label="Visualizar archivo firmado"
                            touch
                            onClick={() => open(c.contractId, c.contractCode ?? `Contrato ${c.contractId}`)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataPagination
                page={data!.page}
                totalPages={data!.totalPages}
                totalCount={data!.totalCount}
                pageSize={data!.pageSize}
                hasPreviousPage={data!.hasPreviousPage}
                hasNextPage={data!.hasNextPage}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                pageSizeOptions={[10, 20, 50]}
              />
            </>
          )}
        </CardContent>
      </Card>

      <PdfPreviewModal isOpen={preview !== null} onClose={close} base64Data={preview?.base64 ?? null} reportName={preview?.title ?? ""} />
    </div>
  );
}
