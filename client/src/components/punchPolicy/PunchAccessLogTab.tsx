import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { DataPagination } from "@/components/ui/DataPagination";
import { PunchPolicyAPI } from "@/lib/api/services/punchPolicy";
import { unwrapApiResponse } from "@/lib/api/utils/error-handling";
import type { PunchLogResult } from "@/types/punchPolicy";
import { PUNCH_LOG_KEY } from "./punchQueries";

const ALL = "__all__";
const iso = (d: Date) => d.toISOString().slice(0, 10);

const RESULTS: Record<PunchLogResult, { label: string; tone: StatusTone }> = {
  EXTERNAL_ALLOWED: { label: "Autorizada", tone: "success" },
  REJECTED: { label: "Rechazada", tone: "destructive" },
  AUDIT_WOULD_REJECT: { label: "Habría rechazado", tone: "warning" },
};

export default function PunchAccessLogTab() {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(iso(new Date(Date.now() - 7 * 86_400_000)));
  const [to, setTo] = useState(iso(new Date()));
  const [result, setResult] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const log = useQuery({
    queryKey: [...PUNCH_LOG_KEY, from, to, result, page, pageSize],
    queryFn: async () =>
      unwrapApiResponse(await PunchPolicyAPI.log({ from, to, result: result === ALL ? undefined : result, page, pageSize })),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
  const data = log.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Picadas fuera del campus</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              aria-label="Desde"
              className="w-40"
            />
            <Input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              aria-label="Hasta"
              className="w-40"
            />
            <Select
              value={result}
              onValueChange={(v) => {
                setResult(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44" aria-label="Filtrar por resultado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {(Object.keys(RESULTS) as PunchLogResult[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {RESULTS[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ActionIconButton icon={RefreshCw} label="Actualizar" touch onClick={() => queryClient.invalidateQueries({ queryKey: PUNCH_LOG_KEY })} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {log.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Cargando" />
          </div>
        ) : log.isError ? (
          <p className="py-6 text-center text-sm text-destructive" role="alert">
            {(log.error as Error).message}
          </p>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="empty-state">
            <ClipboardList className="empty-state-icon" aria-hidden="true" />
            <p className="empty-state-title">Sin registros</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.items.map((l) => {
                  const r = RESULTS[l.result] ?? { label: l.result, tone: "muted" as StatusTone };
                  return (
                    <TableRow key={l.logId}>
                      <TableCell className="whitespace-nowrap text-sm">{new Date(l.attemptedAt).toLocaleString("es-EC")}</TableCell>
                      <TableCell className="font-medium">{l.employeeName || `Empleado ${l.employeeId}`}</TableCell>
                      <TableCell className="font-mono text-sm">{l.ipAddress ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge label={r.label} tone={r.tone} />
                      </TableCell>
                    </TableRow>
                  );
                })}
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
  );
}
