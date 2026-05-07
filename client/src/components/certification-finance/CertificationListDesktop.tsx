// src/pages/certification-finance/CertificationListDesktop.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Download, Eye } from "lucide-react";
import type { UIFinancialCertification } from "@/types/certificationFinance";

function formatECDate(input?: string | null): string {
  if (!input) return "-";
  const dateOnly = input.length >= 10 ? input.slice(0, 10) : "";
  if (!dateOnly) return "-";
  const d = new Date(`${dateOnly}T00:00:00-05:00`);
  return new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil" }).format(d);
}

function statusBadgeCls(statusName?: string | null): string {
  const n = (statusName ?? "").toUpperCase();
  if (n === "APROBADA") return "bg-success/15 text-success hover:bg-success/15 border-success/30";
  if (n === "PENDIENTE_REVISION") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15 border-amber-500/30";
  if (n === "RECHAZADA") return "bg-destructive/15 text-destructive hover:bg-destructive/15 border-destructive/30";
  return "bg-muted text-foreground hover:bg-muted border-border";
}

export function CertificationListDesktop(props: {
  list: UIFinancialCertification[];
  total: number;
  searchTerm: string;
  directoryCode: string;
  onView: (c: UIFinancialCertification) => void;
  onDownloadLegacy: (directoryCode: string, filepath: string, filename: string) => void;
}) {
  const { list, total, searchTerm, directoryCode, onView, onDownloadLegacy } = props;

  return (
    <Card className="hidden md:block">
      <CardHeader>
        <CardTitle>Lista de Certificaciones Financieras</CardTitle>
        <CardDescription>
          {list.length} de {total} certificaciones mostradas
          {searchTerm && ` - Filtrado por: "${searchTerm}"`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Código</TableHead>
                <TableHead className="min-w-[150px]">Número</TableHead>
                <TableHead className="min-w-[150px]">Presupuesto</TableHead>
                {/* <TableHead className="min-w-[120px]">RMU Hora</TableHead>
                <TableHead className="min-w-[120px]">RMU Contrato</TableHead>
                <TableHead className="min-w-[120px]">Monto Total</TableHead> */}
                <TableHead className="min-w-[120px]">Fecha</TableHead>
                <TableHead className="min-w-[100px]">Estado</TableHead>
                <TableHead className="text-right min-w-[190px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {list.map((c) => (
                <TableRow key={c.certificationId} className="group">
                  <TableCell className="font-medium">
                    <div className="font-mono">{c.certCode}</div>
                  </TableCell>
                  <TableCell>{c.certNumber}</TableCell>
                  <TableCell>{c.budget}</TableCell>

                  {/* <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />$
                      {Number(c.rmuHour ?? 0).toLocaleString()}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />$
                      {Number(c.rmuCon ?? 0).toLocaleString()}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1 font-medium">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />$
                      {c.totalAmount.toLocaleString()}
                    </div>
                  </TableCell> */}

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatECDate(c.certBudgetDate)}
                    </div>
                    {c.daysUntilExpiry && c.daysUntilExpiry < 30 && (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs mt-1">
                        {c.daysUntilExpiry}d
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className={statusBadgeCls(c.statusName)}>
                      {c.statusText}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {c.filename && c.filepath && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDownloadLegacy(directoryCode, c.filepath!, c.filename!)}
                          className="h-8"
                          title="Descargar archivo"
                        >
                          <Download className="h-3 w-3 mr-2" />
                          Descargar
                        </Button>
                      )}

                      <Button variant="outline" size="sm" onClick={() => onView(c)} className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Detalles
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
