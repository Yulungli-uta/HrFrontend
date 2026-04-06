// src/components/certification-finance/CertificationListMobile.tsx
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    return "bg-secondary/15 text-secondary-foreground hover:bg-secondary/15 border-warning/30";
  }
  if (text.includes("RECH") || code.includes("REC") || text.includes("ANUL")) {
    return "bg-destructive/15 text-destructive hover:bg-destructive/15 border-destructive/30";
  }
  return "bg-muted text-foreground hover:bg-muted border-border";
}

export function CertificationListMobile(props: {
  list: UIFinancialCertification[];
  statusRefTypes: RefTypeItem[];
  directoryCode: string;
  onView: (c: UIFinancialCertification) => void;
  onDownloadLegacy: (directoryCode: string, filepath: string, filename: string) => void;
}) {
  const { list, statusRefTypes, directoryCode, onView, onDownloadLegacy } = props;

  const statusMap = useMemo(() => {
    const m = new Map<string, RefTypeItem>();
    for (const rt of statusRefTypes || []) {
      const id = getRefId(rt);
      if (id) m.set(id, rt);
    }
    return m;
  }, [statusRefTypes]);

  return (
    <div className="md:hidden space-y-3">
      {list.map((c) => (
        <Card key={c.certificationId}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-sm font-semibold">{c.certCode}</div>
                <div className="text-xs text-muted-foreground">Nro: {c.certNumber ?? "-"}</div>
              </div>

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
            </div>

            <div className="text-sm">
              <div className="text-foreground">{c.budget ?? "-"}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                {formatECDate(c.certBudgetDate)}
                {c.daysUntilExpiry && c.daysUntilExpiry < 30 && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                    {c.daysUntilExpiry}d
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 font-medium">
                <DollarSign className="h-3 w-3 text-muted-foreground" />${c.totalAmount.toLocaleString()}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {c.filename && c.filepath && (
                <Button
                  variant="outline"
                  onClick={() => onDownloadLegacy(directoryCode, c.filepath!, c.filename!)}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              )}
              <Button variant="outline" onClick={() => onView(c)} className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Detalles
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
