// src/pages/certification-finance/CertificationStats.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import type { UIFinancialCertification } from "@/types/certificationFinance";

export function CertificationStats(props: {
  list: UIFinancialCertification[];
  totalBudget: number;
  expiringSoon: number;
}) {
  const { list, totalBudget, expiringSoon } = props;

  const { total, approved, pending, rejected } = useMemo(() => {
    const total = list.length;
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    for (const c of list) {
      const name = (c.statusName ?? "").toUpperCase();
      if (name === "APROBADA") approved++;
      else if (name === "PENDIENTE_REVISION") pending++;
      else if (name === "RECHAZADA") rejected++;
    }
    return { total, approved, pending, rejected };
  }, [list]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-primary/10 dark:bg-primary/15">
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

      <Card className="bg-success/10 dark:bg-success/15">
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

      <Card className="bg-warning/10 dark:bg-warning/15">
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

      <Card className="bg-destructive/10 dark:bg-destructive/15">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
            <span className="flex items-center">
              <XCircle className="h-4 w-4 lg:h-5 lg:w-5 text-destructive mr-2" />
              Rechazadas
            </span>
            <Badge variant="secondary" className="bg-destructive/20 text-destructive text-xs lg:text-sm">
              {rejected}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs lg:text-sm text-muted-foreground">
            {total > 0 ? ((rejected / total) * 100).toFixed(1) : 0}% del total
          </div>
        </CardContent>
      </Card>

      {/* <Card className="bg-secondary/20 dark:bg-secondary/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm lg:text-lg flex items-center justify-between">
            <span className="flex items-center">
              <DollarSign className="h-4 w-4 lg:h-5 lg:w-5 text-secondary-foreground mr-2" />
              Presupuesto Total
            </span>
            <Badge variant="secondary" className="bg-purple-200 text-accent-foreground text-xs lg:text-sm">
              ${totalBudget.toLocaleString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent><div className="text-xs lg:text-sm text-muted-foreground">Monto total certificado</div></CardContent>
      </Card> */}

      {/* <Card className="bg-destructive/10 dark:bg-destructive/15">
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
