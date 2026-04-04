// src/pages/certification-finance/CertificationListDesktop.tsx
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, DollarSign, Download, Eye } from "lucide-react";
import type { UIFinancialCertification } from "@/types/certificationFinance";

type RefTypeItem = any;

function formatECDate(input?: string | null): string {
  if (!input) return "-";
  const dateOnly = input.length >= 10 ? input.slice(0, 10) : "";
  if (!dateOnly) return "-";
  const d = new Date(`${dateOnly}T00:00:00-05:00`);
  return new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil" }).format(d);
}

function getRefId(rt: RefTypeItem): string {
  return String(rt?.id ?? rt?.refTypeId ?? rt?.typeId ?? rt?.valueId ?? "");
}

function getRefLabel(rt: RefTypeItem, fallback: string): string {
  return String(rt?.name ?? rt?.description ?? rt?.code ?? fallback);
}

function getStatusClass(rt: RefTypeItem): string {
  const code = String(rt?.code ?? "").toUpperCase();
  const name = String(rt?.name ?? rt?.description ?? "").toUpperCase();
  const text = `${code} ${name}`;

  if (text.includes("APROB") || text.includes("APPROV") || code.includes("APR")) {
    return "bg-success/15 text-success hover:bg-success/15 border-success/30";
  }
  if (text.includes("PEND") || code.includes("PEN") || text.includes("EN PROCESO")) {
    return "bg-secondary/15 text-secondary-foreground hover:bg-secondary/15 border-orange-200";
  }
  if (text.includes("RECH") || code.includes("REC") || text.includes("ANUL")) {
    return "bg-destructive/15 text-destructive hover:bg-destructive/15 border-destructive/30";
  }
  return "bg-muted text-foreground hover:bg-muted border-border";
}

export function CertificationListDesktop(props: {
  list: UIFinancialCertification[];
  total: number;
  searchTerm: string;
  statusRefTypes: RefTypeItem[];
  directoryCode: string;
  onView: (c: UIFinancialCertification) => void;
  onDownloadLegacy: (directoryCode: string, filepath: string, filename: string) => void;
}) {
  const { list, total, searchTerm, statusRefTypes, directoryCode, onView, onDownloadLegacy } = props;

  const statusMap = useMemo(() => {
    const m = new Map<string, RefTypeItem>();
    for (const rt of statusRefTypes || []) {
      const id = getRefId(rt);
      if (id) m.set(id, rt);
    }
    return m;
  }, [statusRefTypes]);

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
                    {(() => {
                      const id = c.status !== undefined && c.status !== null ? String(c.status) : "";
                      const rt = id ? statusMap.get(id) : undefined;
                      const label = getRefLabel(rt, id ? `Estado ${id}` : "-");
                      const cls = getStatusClass(rt);
                      return (
                        <Badge variant="outline" className={cls}>
                          {label}
                        </Badge>
                      );
                    })()}
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
