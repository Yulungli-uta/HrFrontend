import { Users, Shield, Calendar, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useGuardDashboard, usePendingChanges } from '@/hooks/guards/useGuards';

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ComponentType<any>;
  label: string;
  value: number | undefined;
  color: string;
  href?: string;
}) {
  const content = (
    <Card className={`hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>
              {value ?? '—'}
            </p>
          </div>
          <div className={`p-3 rounded-full bg-current/10 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function GuardDashboardPage() {
  const { data: dashResp, isLoading, refetch } = useGuardDashboard();
  const { data: pendingResp } = usePendingChanges();

  const dash = dashResp?.status === 'success' ? dashResp.data : null;
  const pendingList = pendingResp?.status === 'success' ? pendingResp.data : [];

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Panel de Guardias Rotativos</h1>
            <p className="text-sm text-muted-foreground">Resumen del estado del sistema de guardias</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Guardias activos"
          value={dash?.totalActiveGuards}
          color="text-blue-600"
          href="/guards/groups"
        />
        <StatCard
          icon={Shield}
          label="Grupos de rotación"
          value={dash?.totalGroups}
          color="text-purple-600"
          href="/guards/groups"
        />
        <StatCard
          icon={Calendar}
          label="Planificaciones hoy"
          value={dash?.planningsToday}
          color="text-green-600"
          href="/guards/planning"
        />
        <StatCard
          icon={AlertCircle}
          label="Cambios pendientes"
          value={dash?.pendingChanges}
          color="text-orange-500"
          href="/guards/changes"
        />
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cambios pendientes de aprobación */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Cambios pendientes de aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingList.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                No hay cambios pendientes
              </div>
            ) : (
              <ul className="space-y-2">
                {pendingList.slice(0, 5).map(c => (
                  <li key={c.shiftChangeId} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span className="font-medium">{c.originalEmployeeName}</span>
                    <span className="text-muted-foreground">{c.workDate}</span>
                  </li>
                ))}
                {pendingList.length > 5 && (
                  <li className="text-xs text-muted-foreground pt-1">
                    y {pendingList.length - 5} más…
                  </li>
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

        {/* Módulos del sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Módulos del sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/guards/locations',   label: 'Ubicaciones',       icon: '📍' },
                { href: '/guards/groups',       label: 'Grupos',            icon: '👥' },
                { href: '/guards/patterns',     label: 'Patrones',          icon: '🔄' },
                { href: '/guards/coverage',     label: 'Cobertura',         icon: '📋' },
                { href: '/guards/planning',     label: 'Planificación',     icon: '📅' },
                { href: '/guards/changes',      label: 'Cambios',           icon: '🔃' },
                { href: '/guards/availability', label: 'Disponibilidad',    icon: '🚫' },
              ].map(({ href, label, icon }) => (
                <Link key={href} href={href}>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <span>{icon}</span>
                    <span className="truncate">{label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
