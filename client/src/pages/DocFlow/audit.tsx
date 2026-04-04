import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  Download,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import { formatDateTime, formatExpedienteCode } from "@/lib/docflow/formatters";
import { exportToCSV, ExportColumn } from "@/lib/docflow/export-utils";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { WorkflowMovement } from "@/types/docflow/docflow.types";

export default function Audit() {
  const service = useDocflowService();
  const isMobile = useIsMobile();
  const returnMovements = service.getReturnMovements();

  const affectedInstancesCount = new Set(returnMovements.map((m) => m.instanceId)).size;
  const withCommentsCount = returnMovements.filter((m) => m.comments).length;

  const handleExport = () => {
    const columns: ExportColumn<WorkflowMovement & { _processName?: string }>[] = [
      {
        key: "instanceId",
        label: "Expediente",
        formatter: (val) => formatExpedienteCode(String(val)),
      },
      {
        key: "instanceId",
        label: "Proceso",
        formatter: (_val, row) => {
          const inst = service.getInstanceById(row.instanceId);
          return inst?.processName || "-";
        },
      },
      {
        key: "createdByName",
        label: "Retornado por",
        formatter: (val) => String(val ?? "-"),
      },
      {
        key: "assignedToName",
        label: "Asignado a",
        formatter: (val) => String(val ?? "-"),
      },
      {
        key: "comments",
        label: "Motivo",
        formatter: (val) => String(val ?? "-"),
      },
      {
        key: "createdAt",
        label: "Fecha",
        formatter: (val) => (val ? formatDateTime(String(val)) : "-"),
      },
    ];

    const today = new Date().toISOString().slice(0, 10);
    exportToCSV(returnMovements as (WorkflowMovement & Record<string, unknown>)[], columns, `auditoria-retornos-${today}`);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="page-audit">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-audit-title">
            Auditoria de Retornos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trazabilidad de expedientes devueltos y cuellos de botella
          </p>
        </div>
        {returnMovements.length > 0 && (
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export-audit"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Retornos
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-returns">
              {returnMovements.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expedientes Afectados
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-affected-instances">
              {affectedInstancesCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Con Comentarios
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-with-comments">
              {withCommentsCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-destructive" />
            Detalle de Retornos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {returnMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mb-3" />
              <p className="text-base font-medium">Sin retornos</p>
              <p className="text-sm mt-1">No se han registrado retornos de expedientes</p>
            </div>
          ) : isMobile ? (
            <div className="flex flex-col gap-3">
              {returnMovements.map((mov) => {
                const instance = service.getInstanceById(mov.instanceId);
                return (
                  <Link key={mov.movementId} href={`/DocFlow/expedientes/${mov.instanceId}`}>
                    <div
                      className="p-3 rounded-md border border-border hover-elevate cursor-pointer"
                      data-testid={`card-return-mobile-${mov.movementId}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {formatExpedienteCode(mov.instanceId)}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-destructive/15 text-destructive dark:text-destructive/80 border-transparent"
                        >
                          Retorno
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {instance?.processName}
                      </p>
                      {mov.comments && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {mov.comments}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {mov.createdByName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(mov.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expediente</TableHead>
                    <TableHead>Proceso</TableHead>
                    <TableHead>Retornado por</TableHead>
                    <TableHead>Asignado a</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnMovements.map((mov) => {
                    const instance = service.getInstanceById(mov.instanceId);
                    return (
                      <TableRow
                        key={mov.movementId}
                        className="cursor-pointer"
                        data-testid={`row-return-${mov.movementId}`}
                      >
                        <TableCell>
                          <Link href={`/DocFlow/expedientes/${mov.instanceId}`}>
                            <span className="font-semibold text-sm text-primary hover:underline">
                              {formatExpedienteCode(mov.instanceId)}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {instance?.processName || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {mov.createdByName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {mov.assignedToName || "-"}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          <p className="truncate text-muted-foreground" title={mov.comments || ""}>
                            {mov.comments || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(mov.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
