// src/pages/docflow/dashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/docflow/status-badge";
import {
  FileStack,
  FileText,
  ArrowRightLeft,
  RotateCcw,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  FolderOpen,
  BarChart3,
  Zap,
} from "lucide-react";
import { useDocflowService } from "@/services/docflow/docflow-service-context";
import { formatDateTime, formatExpedienteCode } from "@/lib/docflow/formatters";
import { INSTANCE_STATUS_OPTIONS } from "@/lib/docflow/constants";
import { Link, useLocation } from "wouter";
import { useMemo } from "react";

const statusIconMap: Record<string, typeof TrendingUp> = {
  "Borrador": Clock,
  "Pendiente": AlertTriangle,
  "En Revision": TrendingUp,
  "Aprobado": CheckCircle2,
  "Retornado": RotateCcw,
  "Finalizado": FileStack,
};

const statusBarColors: Record<string, string> = {
  "Borrador": "bg-muted-foreground/60",
  "Pendiente": "bg-yellow-500 dark:bg-yellow-400",
  "En Revision": "bg-blue-500 dark:bg-blue-400",
  "Aprobado": "bg-green-500 dark:bg-green-400",
  "Retornado": "bg-red-500 dark:bg-red-400",
  "Finalizado": "bg-purple-500 dark:bg-purple-400",
};

const processBarColors = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

export default function Dashboard() {
  const service = useDocflowService();
  const [, setLocation] = useLocation();
  const stats = service.getDashboardStats();
  const recentInstances = service.getRecentInstances(5);
  const recentMovements = service.getRecentMovements(5);
  const instances = service.getInstances();
  const processes = service.getProcesses();

  const processDistribution = useMemo(() => {
    const countByProcess: Record<number, { name: string; count: number }> = {};

    for (const proc of processes) {
      countByProcess[proc.processId] = { name: proc.processName, count: 0 };
    }

    for (const inst of instances) {
      const proc = processes.find((p) => {
        if (p.processId === inst.processId) return true;
        return p.children?.some((c) => c.processId === inst.processId);
      });
      if (proc) {
        if (!countByProcess[proc.processId]) {
          countByProcess[proc.processId] = { name: proc.processName, count: 0 };
        }
        countByProcess[proc.processId].count += 1;
      }
    }

    return Object.entries(countByProcess)
      .map(([id, data]) => ({ processId: Number(id), ...data }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [instances, processes]);

  const maxProcessCount = Math.max(...processDistribution.map((d) => d.count), 1);

  const statCards = [
    {
      title: "Total Expedientes",
      value: stats.totalInstances,
      icon: FileStack,
      description: "Expedientes registrados",
      color: "text-primary",
    },
    {
      title: "Documentos",
      value: stats.totalDocuments,
      icon: FileText,
      description: "Archivos cargados",
      color: "text-chart-2",
    },
    {
      title: "Movimientos",
      value: stats.totalMovements,
      icon: ArrowRightLeft,
      description: "Transiciones realizadas",
      color: "text-chart-3",
    },
    {
      title: "Retornos",
      value: stats.recentReturns,
      icon: RotateCcw,
      description: "Expedientes devueltos",
      color: "text-destructive",
    },
  ];

  const quickActions = [
    {
      label: "Nuevo Expediente",
      icon: Plus,
      href: "/DocFlow/expedientes/nuevo",
      testId: "link-quick-new-instance",
    },
    {
      label: "Buscar Expedientes",
      icon: Search,
      href: "/DocFlow/expedientes",
      testId: "link-quick-search-instances",
    },
    {
      label: "Ver Procesos",
      icon: FolderOpen,
      href: "/DocFlow/procesos",
      testId: "link-quick-processes",
    },
    {
      label: "Auditoria",
      icon: BarChart3,
      href: "/DocFlow/auditoria",
      testId: "link-quick-audit",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
          Panel de Control
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen general del modulo de gestion documental
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Estado de Expedientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {stats.totalInstances > 0 && (
                <div className="flex h-4 w-full rounded-md overflow-hidden" data-testid="chart-status-bar">
                  {INSTANCE_STATUS_OPTIONS.map((statusKey) => {
                    const count = stats.byStatus[statusKey] || 0;
                    const percentage = (count / stats.totalInstances) * 100;
                    if (percentage === 0) return null;
                    return (
                      <div
                        key={statusKey}
                        className={`${statusBarColors[statusKey] || "bg-muted"} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                        title={`${statusKey}: ${count} (${Math.round(percentage)}%)`}
                      />
                    );
                  })}
                </div>
              )}
              {INSTANCE_STATUS_OPTIONS.map((statusKey) => {
                const Icon = statusIconMap[statusKey] || Clock;
                const count = stats.byStatus[statusKey] || 0;
                const percentage = stats.totalInstances > 0
                  ? Math.round((count / stats.totalInstances) * 100)
                  : 0;

                return (
                  <div key={statusKey} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`h-3 w-3 rounded-sm shrink-0 ${statusBarColors[statusKey] || "bg-muted"}`} />
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{statusKey}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                        {percentage}%
                      </span>
                      <span className="text-sm font-medium w-6 text-right tabular-nums" data-testid={`text-count-${statusKey.toLowerCase().replace(/\s+/g, "-")}`}>
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Distribucion por Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {processDistribution.length === 0 && (
                <p className="text-sm text-muted-foreground" data-testid="text-no-process-data">
                  Sin datos de procesos
                </p>
              )}
              {processDistribution.map((proc, index) => {
                const barWidth = (proc.count / maxProcessCount) * 100;
                const colorClass = processBarColors[index % processBarColors.length];
                return (
                  <div key={proc.processId} className="flex flex-col gap-1" data-testid={`chart-process-${proc.processId}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{proc.name}</span>
                      <span className="text-sm font-medium tabular-nums shrink-0">
                        {proc.count}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Acciones Rapidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.href}
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => setLocation(action.href)}
                  data-testid={action.testId}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Expedientes Recientes</CardTitle>
          <Link href="/DocFlow/expedientes">
            <Badge variant="outline" className="cursor-pointer text-xs" data-testid="link-ver-todos-expedientes">
              Ver todos
            </Badge>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {recentInstances.map((instance) => (
              <Link
                key={instance.instanceId}
                href={`/DocFlow/expedientes/${instance.instanceId}`}
              >
                <div
                  className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer flex-wrap"
                  data-testid={`card-instance-${instance.instanceId}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {formatExpedienteCode(instance.instanceId)}
                      </span>
                      <StatusBadge status={instance.currentStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {instance.processName} &middot; {instance.createdByName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <FileText className="h-3 w-3" />
                    <span>{instance.totalFiles}</span>
                    <span className="hidden sm:inline">&middot; {formatDateTime(instance.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
          <Link href="/DocFlow/auditoria">
            <Badge variant="outline" className="cursor-pointer text-xs" data-testid="link-ver-auditoria">
              Ver auditoria
            </Badge>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {recentMovements.map((mov) => (
              <div
                key={mov.movementId}
                className="flex items-start gap-3 p-3 rounded-md"
                data-testid={`card-movement-${mov.movementId}`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  mov.movementType === "RETURN"
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-green-100 dark:bg-green-900/30"
                }`}>
                  {mov.movementType === "RETURN" ? (
                    <RotateCcw className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {formatExpedienteCode(mov.instanceId)}
                    </span>
                    <Badge variant="outline" className="text-xs border-transparent">
                      {mov.fromStatus} &rarr; {mov.toStatus}
                    </Badge>
                  </div>
                  {mov.comments && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {mov.comments}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {mov.createdByName} &middot; {formatDateTime(mov.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
