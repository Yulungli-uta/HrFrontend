import { Users, Shield, Calendar, AlertCircle, CheckCircle2, AlertTriangle, Clock, Ban } from 'lucide-react';
import { RowAction } from "@/components/ui/row-action";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import type { LucideIcon } from 'lucide-react';
import { StatCard as SharedStatCard } from '@/components/ui/stat-card';
import { useGuardDashboard } from '@/hooks/guards/useGuards';

function StatCard({ icon: Icon, label, value, color, href, alert }: {
  icon: React.ComponentType<any>;
  label: string;
  value: number | undefined;
  color: string;
  href?: string;
  alert?: boolean;
}) {
  const tone = alert && (value ?? 0) > 0 ? 'warning'
    : color.includes('success') ? 'success'
    : color.includes('warning') ? 'warning'
    : color.includes('destructive') ? 'danger'
    : 'primary';
  const content = <SharedStatCard tone={tone} icon={Icon as LucideIcon} label={label} value={value ?? '—'} className={href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} />;
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function GuardDashboardPage() {
  const { data: dashResp, isLoading, isFetching, refetch } = useGuardDashboard();

  const dash = dashResp?.status === 'success' ? dashResp.data : null;
  const todayShifts = dash?.todayShifts ?? [];
  const pendingReplacements = dash?.pendingReplacements ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Panel de Guardias Rotativos</h1>
            <p className="text-sm text-muted-foreground">Resumen operativo del día</p>
          </div>
        </div>
        <RowAction action="refresh" spinning={isFetching} onClick={() => refetch()} disabled={isFetching} />
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Calendar}
          label="Turnos hoy"
          value={dash?.todayShiftsCount}
          color="text-primary"
          href="/guards/planning"
        />
        <StatCard
          icon={AlertTriangle}
          label="Sin cobertura"
          value={dash?.uncoveredPostsCount}
          color="text-destructive"
          href="/guards/planning"
          alert
        />
        <StatCard
          icon={AlertCircle}
          label="Reemplazos pendientes"
          value={dash?.pendingReplacementsCount}
          color="text-warning"
          href="/guards/changes"
          alert
        />
        <StatCard
          icon={Ban}
          label="En permiso/vacación"
          value={dash?.employeesWithPermissionOrVacationCount}
          color="text-warning"
          href="/guards/availability"
        />
        <StatCard
          icon={Clock}
          label="Alertas doble turno"
          value={dash?.doubleShiftAlertsCount}
          color="text-cat-3"
          alert
        />
      </div>

      {/* Listas y accesos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Turnos de hoy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Turnos de hoy ({todayShifts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay turnos planificados para hoy.</p>
            ) : (
              <ul className="space-y-1.5">
                {todayShifts.slice(0, 6).map(s => (
                  <li key={s.planningId} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span className="font-medium truncate max-w-[160px]">{s.employeeFullName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{s.locationName}</span>
                      {(s.hasPermissionConflict || s.hasVacationConflict) && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">Conflicto</Badge>
                      )}
                    </div>
                  </li>
                ))}
                {todayShifts.length > 6 && (
                  <li className="text-xs text-muted-foreground pt-1">y {todayShifts.length - 6} más…</li>
                )}
              </ul>
            )}
            <div className="mt-3">
              <Link href="/guards/planning">
                <Button variant="outline" size="sm" className="w-full">Ver planificación</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Reemplazos pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Reemplazos pendientes ({pendingReplacements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReplacements.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-success" />
                No hay cambios pendientes
              </div>
            ) : (
              <ul className="space-y-1.5">
                {pendingReplacements.slice(0, 5).map(c => (
                  <li key={c.shiftChangeId} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span className="font-medium truncate max-w-[160px]">{c.originalEmployeeFullName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{c.workDate}</span>
                  </li>
                ))}
                {pendingReplacements.length > 5 && (
                  <li className="text-xs text-muted-foreground pt-1">y {pendingReplacements.length - 5} más…</li>
                )}
              </ul>
            )}
            <div className="mt-3">
              <Link href="/guards/changes">
                <Button variant="outline" size="sm" className="w-full">Ver todos los cambios</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Módulos del sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Módulos del sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { href: '/guards/locations',   label: 'Ubicaciones',    icon: '📍', step: '1' },
              { href: '/guards/groups',       label: 'Grupos',         icon: '👥', step: '2' },
              { href: '/guards/patterns',     label: 'Patrones',       icon: '🔄', step: '3' },
              { href: '/guards/coverage',     label: 'Cobertura',      icon: '📋', step: '4' },
              { href: '/guards/availability', label: 'Disponibilidad', icon: '🚫', step: '5' },
              { href: '/guards/planning',     label: 'Planificación',  icon: '📅', step: '6' },
              { href: '/guards/changes',      label: 'Cambios',        icon: '🔃', step: '7' },
            ].map(({ href, label, icon, step }) => (
              <Link key={href} href={href}>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2">
                  <span>{icon}</span>
                  <div className="text-left">
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">Paso {step}</p>
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
