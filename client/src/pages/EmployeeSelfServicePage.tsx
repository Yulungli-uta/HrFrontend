// src/pages/EmployeeSelfServicePage.tsx
import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User, CalendarDays, Sun, FileBadge, ClipboardList, FolderOpen, History, Loader2, AlertCircle,
  Clock, FileText, ChevronRight,
} from 'lucide-react';
import { EmployeeSelfServiceAPI } from '@/lib/api/services/employeeSelfService';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { StatusBadge } from '@/components/shared/StatusBadge';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return dateStr;
  }
}

type SummaryTone = 'success' | 'warning' | 'primary' | 'muted' | 'destructive';

const TONE_ACCENT: Record<SummaryTone, string> = {
  success: 'border-l-success bg-success-subtle text-success',
  warning: 'border-l-warning bg-warning-subtle text-warning',
  primary: 'border-l-primary bg-primary-subtle text-primary',
  destructive: 'border-l-destructive bg-destructive/15 text-destructive',
  muted: 'border-l-border bg-muted text-foreground',
};

/** Card de resumen reutilizable — un solo lugar para el estilo "llamativo" de las 6 cards. */
function SummaryCard({
  icon,
  tone,
  value,
  label,
  onClick,
}: {
  icon: ReactNode;
  tone: SummaryTone;
  value: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const [accentBorder, accentBg, accentText] = TONE_ACCENT[tone].split(' ');
  return (
    <Card
      className={`border-l-4 ${accentBorder} transition-all ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${accentBg} ${accentText}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-bold leading-tight truncate">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
        {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </CardContent>
    </Card>
  );
}

export default function EmployeeSelfServicePage() {
  const [, navigate] = useLocation();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-self-service-summary'],
    queryFn: () => EmployeeSelfServiceAPI.getSummary(),
  });

  const summary = data?.status === 'success' ? data.data : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="border-destructive/40">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {parseApiError(error) || 'No se pudo cargar tu información. ¿Tienes un empleado asociado en el sistema?'}
            </p>
            <Button onClick={() => refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile } = summary;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-lg">
            <User className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
          </div>
          Autoservicio del Empleado
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Hola, {profile.fullName}. Este es tu panel personal — solo muestra tu propia información.
        </p>
      </div>

      {/* Datos básicos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Mis datos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Cédula</div>
            <div className="font-medium">{profile.idCard}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Cargo</div>
            <div className="font-medium">{profile.jobTitle ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Dependencia</div>
            <div className="font-medium">{profile.departmentName ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fecha de ingreso</div>
            <div className="font-medium">{formatDate(profile.hireDate)}</div>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          {/* Único punto de acceso al perfil completo — no duplicar en otra card */}
          <Button variant="outline" size="sm" onClick={() => navigate('/perfil')}>
            Ver mi perfil completo
          </Button>
        </CardContent>
      </Card>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard
          icon={<Sun className="h-5 w-5" />}
          tone="success"
          value={summary.vacationAvailableDays}
          label="Días de vacaciones disponibles"
          onClick={() => navigate('/permissions')}
        />
        <SummaryCard
          icon={<CalendarDays className="h-5 w-5" />}
          tone="warning"
          value={summary.pendingPermissionsCount}
          label="Permisos pendientes"
          onClick={() => navigate('/permissions')}
        />
        <SummaryCard
          icon={<ClipboardList className="h-5 w-5" />}
          tone="primary"
          value={summary.pendingInternalRequestsCount}
          label="Solicitudes internas pendientes"
          onClick={() => navigate('/self-service/requests')}
        />
        <SummaryCard
          icon={<FileBadge className="h-5 w-5" />}
          tone="muted"
          value={summary.recentCertificates.length}
          label="Certificados recientes"
          onClick={() => navigate('/self-service/certificates')}
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5" />}
          tone="primary"
          value={summary.lastPunchTime ? formatDateTime(summary.lastPunchTime) : 'Sin marcaciones'}
          label={`Última marcación${summary.lastPunchType ? ` (${summary.lastPunchType})` : ''}`}
          onClick={() => navigate('/attendance')}
        />
        <SummaryCard
          icon={<FileText className="h-5 w-5" />}
          tone="warning"
          value={summary.pendingJustificationsCount}
          label="Justificaciones pendientes"
          onClick={() => navigate('/justifications')}
        />
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate('/permissions')}>
          <CalendarDays className="h-5 w-5" /> Mis Permisos
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate('/permissions')}>
          <Sun className="h-5 w-5" /> Mis Vacaciones
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate('/attendance')}>
          <Clock className="h-5 w-5" /> Marcaciones
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate('/justifications')}>
          <FileText className="h-5 w-5" /> Justificaciones
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate('/self-service/certificates')}>
          <FileBadge className="h-5 w-5" /> Certificados
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate('/self-service/requests')}>
          <ClipboardList className="h-5 w-5" /> Solicitudes
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate('/self-service/history')}>
          <History className="h-5 w-5" /> Historial
        </Button>
      </div>

      {/* Solicitudes internas recientes */}
      {summary.recentInternalRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Solicitudes internas recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.recentInternalRequests.slice(0, 5).map((r) => (
              <div key={r.requestId} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <span>{r.subject}</span>
                <StatusBadge label={r.status} tone={statusTone(r.status)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Certificados recientes */}
      {summary.recentCertificates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Documentos recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.recentCertificates.slice(0, 5).map((c) => (
              <div key={c.requestId} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <span>Certificado {c.certificateType}</span>
                <StatusBadge label={c.status} tone={statusTone(c.status)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function statusTone(status: string): 'success' | 'warning' | 'destructive' | 'primary' | 'muted' {
  if (['EMITIDO', 'APROBADO', 'COMPLETADO'].includes(status)) return 'success';
  if (['PENDIENTE', 'EN_REVISION', 'DEVUELTO', 'Pending'].includes(status)) return 'warning';
  if (['RECHAZADO', 'ANULADO'].includes(status)) return 'destructive';
  return 'muted';
}
