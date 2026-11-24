// pages/PersonnelActionSignedFiles.tsx
// Acciones de personal que tienen archivo firmado registrado. Al visualizar, el backend lee el PDF del servidor de archivos.
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
import { useMobileInfiniteList, withMobileList } from "@/hooks/pagination/useMobileInfiniteList";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import { PdfPreviewModal } from "@/components/reports/PdfPreviewModal";
import { SignedFileTrackingAPI } from "@/lib/api/services/signedFileTracking";
import { PersonnelActionTypeAPI } from "@/lib/api/services/contracts";
import { unwrapApiResponse } from "@/lib/api/utils/error-handling";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSignedFilePreview } from "@/hooks/useSignedFilePreview";
import { formatDate } from "@/lib/clock";

const ALL = "__all__";

const STATUS_OPTIONS = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "GENERADO", label: "Generado" },
  { value: "VIGENTE", label: "Vigente" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "ANULADO", label: "Anulado" },
];

const STATUS_TONE: Record<string, StatusTone> = {
  VIGENTE: "success",
  FINALIZADO: "primary",
  ANULADO: "destructive",
  GENERADO: "warning",
};

export default function PersonnelActionSignedFilesPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 400);
  const [status, setStatus] = useState(ALL);
  const [actionTypeId, setActionTypeId] = useState(ALL);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const types = useQuery({
    queryKey: ["personnel-action-types", "all"],
    queryFn: async () => unwrapApiResponse(await PersonnelActionTypeAPI.getAll()),
    staleTime: 5 * 60 * 1000,
  });

  const fetchList = async (pg: number, size: number) =>
    unwrapApiResponse(
      await SignedFileTrackingAPI.listActions({
          search: search || undefined,
          status: status === ALL ? undefined : status,
          actionTypeId: actionTypeId === ALL ? undefined : Number(actionTypeId),
          departmentId: departmentId ?? undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: pg,
          pageSize: size,
        })
    );
  const listFilters = ["signed-files", "personnel-actions", search, status, actionTypeId, departmentId, startDate, endDate];
  const mobile = useMobileInfiniteList<any>({
    queryKey: listFilters,
    fetchPage: fetchList,
    pageSize,
    getKey: (row) => row.actionId,
  });
  const listQuery = useQuery({
    queryKey: [...listFilters, page, pageSize],
    queryFn: () => fetchList(page, pageSize),
    placeholderData: (prev) => prev,
    enabled: !mobile.active,
  });
  const list = withMobileList(listQuery, mobile);
  const data = list.data;

  const { open, close, loadingId, preview } = useSignedFilePreview(SignedFileTrackingAPI.actionFile);

  const resetPage = () => setPage(1);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="page-title">
          <FileCheck className="h-6 w-6" aria-hidden="true" /> Acciones con archivo firmado
        </h1>
        <p className="page-subtitle">Acciones de personal que tienen un archivo firmado registrado</p>
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
                placeholder="Cédula, nombre o N.º de acción"
                aria-label="Buscar"
                className="pl-8"
              />
            </div>
            <Select
              value={actionTypeId}
              onValueChange={(v) => {
                setActionTypeId(v);
                resetPage();
              }}
            >
              <SelectTrigger className="w-56" aria-label="Tipo de acción">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los tipos</SelectItem>
                {(types.data ?? []).map((t) => (
                  <SelectItem key={t.personnelActionTypeId} value={String(t.personnelActionTypeId)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                resetPage();
              }}
            >
              <SelectTrigger className="w-44" aria-label="Estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
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
              aria-label="Desde"
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
              aria-label="Hasta"
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
              <p className="empty-state-title">Sin acciones con archivo firmado</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N.º de acción</TableHead>
                    <TableHead>Persona</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Realizada por</TableHead>
                    <TableHead className="text-right">Archivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.items.map((a) => (
                    <TableRow key={a.actionId}>
                      <TableCell className="whitespace-nowrap font-mono text-sm">{a.actionNumber ?? "—"}</TableCell>
                      <TableCell>
                        <div className="font-medium">{a.personName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{a.personIdCard ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-sm">{a.departmentName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{a.actionTypeName ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge label={STATUS_OPTIONS.find((o) => o.value === a.status)?.label ?? a.status ?? "—"} tone={STATUS_TONE[a.status ?? ""] ?? "muted"} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {a.effectiveDate ? formatDate(a.effectiveDate) : "—"}
                        {a.endDate ? ` – ${formatDate(a.endDate)}` : ""}
                      </TableCell>
                      <TableCell className="text-sm">{a.elaboratorName || "—"}</TableCell>
                      <TableCell className="text-right">
                        {loadingId === a.actionId ? (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" aria-label="Abriendo archivo" />
                        ) : (
                          <ActionIconButton
                            icon={Eye}
                            label="Visualizar archivo firmado"
                            touch
                            onClick={() => open(a.actionId, a.actionNumber ?? `Acción ${a.actionId}`)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataPagination
                infinite={mobile.infinite}
                itemLabel="acciones"
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
