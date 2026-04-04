// src/pages/certification-finance/CertificationStats.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Clock, DollarSign, Calendar } from "lucide-react";
import type { UIFinancialCertification } from "@/types/certificationFinance";

type RefTypeItem = any;

function getRefId(rt: RefTypeItem): string {
  return String(rt?.id ?? rt?.refTypeId ?? rt?.typeId ?? rt?.valueId ?? "");
}

function isApprovedRef(rt: RefTypeItem): boolean {
  const code = String(rt?.code ?? "").toUpperCase();
  const name = String(rt?.name ?? rt?.description ?? "").toUpperCase();
  const text = `${code} ${name}`;
  return text.includes("APROB") || text.includes("APPROV") || code.includes("APR") || text.includes("APPROVED");
}

function isPendingRef(rt: RefTypeItem): boolean {
  const code = String(rt?.code ?? "").toUpperCase();
  const name = String(rt?.name ?? rt?.description ?? "").toUpperCase();
  const text = `${code} ${name}`;
  return text.includes("PEND") || code.includes("PEN") || text.includes("PENDING") || text.includes("EN PROCESO");
}

export function CertificationStats(props: {
  list: UIFinancialCertification[];
  statusRefTypes: RefTypeItem[];
  totalBudget: number;
  expiringSoon: number;
}) {
  const { list, statusRefTypes, totalBudget, expiringSoon } = props;

  const { total, approved, pending } = useMemo(() => {
    const total = list.length;

    // mapa id -> refType
    const map = new Map<string, RefTypeItem>();
    for (const rt of statusRefTypes || []) {
      const id = getRefId(rt);
      if (id) map.set(id, rt);
    }

    let approved = 0;
    let pending = 0;

    for (const c of list) {
      const id = c.status !== undefined && c.status !== null ? String(c.status) : "";
      const rt = id ? map.get(id) : undefined;

      if (rt && isApprovedRef(rt)) approved++;
      else if (rt && isPendingRef(rt)) pending++;
    }

    return { total, approved, pending };
  }, [list, statusRefTypes]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
            <span className="flex items-center">
              <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-primary mr-2" />
              Total
            </span>
            <Badge variant="secondary" className="bg-blue-200 text-primary text-xs lg:text-sm">
              {total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs lg:text-sm text-muted-foreground">Certificaciones registradas</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-50 to-green-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
            <span className="flex items-center">
              <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-success mr-2" />
              Aprobadas
            </span>
            <Badge variant="secondary" className="bg-success/20 text-success text-xs lg:text-sm">
              {approved}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs lg:text-sm text-muted-foreground">
            {total > 0 ? ((approved / total) * 100).toFixed(1) : 0}% del total
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-secondary-foreground mr-2" />
              Pendientes
            </span>
            <Badge variant="secondary" className="bg-orange-200 text-secondary-foreground text-xs lg:text-sm">
              {pending}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs lg:text-sm text-muted-foreground">
            {total > 0 ? ((pending / total) * 100).toFixed(1) : 0}% del total
          </div>
        </CardContent>
      </Card>

      {/* <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
            <span className="flex items-center">
              <DollarSign className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600 mr-2" />
              Presupuesto Total
            </span>
            <Badge variant="secondary" className="bg-purple-200 text-accent-foreground text-xs lg:text-sm">
              ${totalBudget.toLocaleString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent><div className="text-xs lg:text-sm text-muted-foreground">Monto total certificado</div></CardContent>
      </Card> */}

      {/* <Card className="bg-gradient-to-r from-red-50 to-red-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
            <span className="flex items-center">
              <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-destructive mr-2" />
              Por Vencer
            </span>
            <Badge variant="secondary" className="bg-destructive/20 text-destructive text-xs lg:text-sm">
              {expiringSoon}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent><div className="text-xs lg:text-sm text-muted-foreground">En los próximos 30 días</div></CardContent>
      </Card> */}
    </div>
  );
}
