// src/components/resignationRetirement/EmployeeInfoCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Briefcase, FileText } from 'lucide-react';
import type { EmployeeConsolidatedInfo } from '@/types/resignation-retirement';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? '—'}</div>
    </div>
  );
}

/**
 * Bloque informativo de solo lectura con los datos del empleado, resueltos
 * en backend a partir del usuario autenticado. Nunca es editable aquí.
 */
export function EmployeeInfoCard({ info }: { info: EmployeeConsolidatedInfo }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-primary" />
          Datos del empleado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Nombre completo" value={info.fullName} />
          <Field label="Cédula" value={info.idCard} />
          <Field label="Email institucional" value={info.email} />
          <Field label="Cargo" value={info.jobTitle} />
          <Field label="Dependencia" value={info.departmentName} />
          <Field label="Régimen laboral" value={info.laborRegimeName} />
          <Field label="Fecha de ingreso" value={formatDate(info.hireDate)} />
          <Field label="Jefe inmediato" value={info.immediateBossName} />
          <Field
            label="Tiempo de servicio"
            value={`${info.serviceTimeYears}a ${info.serviceTimeMonths}m`}
          />
          <Field label="Vacaciones disponibles" value={`${info.vacationAvailableDays} días`} />
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Contrato / acción vigente
            {info.vigenteSourceType ? (
              <Badge variant="outline" className="ml-1">
                {info.vigenteSourceType === 'CONTRACT' ? 'Contrato' : 'Acción de personal'}
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-1 bg-red-50 text-red-700 border-red-200">
                Sin vigente
              </Badge>
            )}
          </div>
          {info.vigenteSourceType ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Documento" value={info.vigenteDocumentNumber} />
              <Field label="Cargo" value={info.vigenteJobTitle} />
              <Field label="Dependencia" value={info.vigenteDepartmentName} />
              <Field
                label="Vigencia"
                value={`${formatDate(info.vigenteStartDate)} — ${formatDate(info.vigenteEndDate) || 'indefinida'}`}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Este empleado no tiene un contrato o acción de personal vigente.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
