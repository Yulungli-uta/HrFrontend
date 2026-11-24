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
import { useMobileInfiniteList, withMobileList } from "@/hooks/pagination/useMobileInfiniteList";
import { PunchPolicyAPI } from "@/lib/api/services/punchPolicy";
import { unwrapApiResponse } from "@/lib/api/utils/error-handling";
import type { PunchLogResult } from "@/types/punchPolicy";
import { PUNCH_LOG_KEY } from "./punchQueries";
import { addDays, formatDateTime, todayEcuador } from "@/lib/clock";
import { EmployeeCombobox } from "@/components/ui/EmployeeCombobox";

const ALL = "__all__";

const RESULTS: Record<PunchLogResult, { label: string; tone: StatusTone }> = {
  EXTERNAL_ALLOWED: { label: "Autorizada", tone: "success" },
  REJECTED: { label: "Rechazada", tone: "destructive" },
  AUDIT_WOULD_REJECT: { label: "Habría rechazado", tone: "warning" },
  CLIENT_CLICK: { label: "Pulsó el botón", tone: "primary" },
  CLIENT_RETRY: { label: "Reintento de envío", tone: "warning" },
  CLIENT_SEND_FAILED: { label: "Falló el envío", tone: "destructive" },
  CLIENT_HIDDEN_BEFORE_RESPONSE: { label: "Salió de la pantalla", tone: "warning" },
  SRV_REJ_TOO_SOON: { label: "Rechazo: intervalo mínimo", tone: "destructive" },
  SRV_REJ_NOT_OWN: { label: "Rechazo: picada ajena", tone: "destructive" },
  SRV_ERROR: { label: "Error del servidor", tone: "destructive" },
  ADJUST_TIME: { label: "Hora corregida", tone: "primary" },
};

/** Origen del registro: lo que informó el dispositivo, lo que decidió el servidor o el control de red. */
const MODE_LABELS: Record<string, string> = { MANUAL: "Ajuste manual", CLIENT: "Dispositivo", SERVER: "Servidor", AUDIT: "Control de red", ENFORCE: "Control de red", OFF: "Control de red" };

export default function PunchAccessLogTab() {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(addDays(todayEcuador(), -7));
  const [to, setTo] = useState(todayEcuador());
  const [result, setResult] = useState<string>(ALL);
  // Para revisar un caso concreto ("¿pulsó el botón?, ¿qué le respondió el servidor?") se filtra por empleado
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const logKey = [...PUNCH_LOG_KEY, from, to, result, employeeId];
  const fetchLog = async (pg: number, size: number) =>
    unwrapApiResponse(await PunchPolicyAPI.log({ from, to, employeeId: employeeId ?? undefined, result: result === ALL ? undefined : result, page: pg, pageSize: size }));
  const mobile = useMobileInfiniteList<any>({ queryKey: logKey, fetchPage: fetchLog, pageSize, staleTime: 0 });
  const logQuery = useQuery({
    queryKey: [...logKey, page, pageSize],
    queryFn: () => fetchLog(page, pageSize),
    staleTime: 0,
    placeholderData: (prev) => prev,
    enabled: !mobile.active,
  });
  const log = withMobileList(logQuery, mobile);
  const data = log.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Bitácora de picadas</CardTitle>
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
            <div className="w-64">
              <EmployeeCombobox
                value={employeeId}
                onSelect={(id) => {
                  setEmployeeId(id);
                  setPage(1);
                }}
                placeholder="Todos los empleados"
              />
            </div>
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
                  <TableHead>Origen</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.items.map((l) => {
                  const r = RESULTS[l.result] ?? { label: l.result, tone: "muted" as StatusTone };
                  return (
                    <TableRow key={l.logId}>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(l.attemptedAt, "es-EC")}</TableCell>
                      <TableCell className="font-medium">{l.employeeName || `Empleado ${l.employeeId}`}</TableCell>
                      <TableCell className="font-mono text-sm">{l.ipAddress ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge label={r.label} tone={r.tone} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{MODE_LABELS[l.mode] ?? l.mode}</TableCell>
                      <TableCell className="max-w-[24rem] break-words text-xs text-muted-foreground">{l.detail ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataPagination
              infinite={mobile.infinite}
              itemLabel="picadas"
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
