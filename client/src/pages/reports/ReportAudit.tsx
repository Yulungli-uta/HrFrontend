/**
 * Página de Auditoría de Reportes
 * Universidad Técnica de Ambato
 */

import { useEffect } from 'react';
import { useReportAudit } from '@/hooks/useReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatBytes } from '@/types/reports';

// ============================================
// Componente Principal
// ============================================

export function ReportAudit() {
  const { audits, isLoading, fetchAudits } = useReportAudit();

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Auditoría de Reportes
          </h1>
          <p className="text-muted-foreground mt-1">
            Historial de reportes generados y descargados
          </p>
        </div>
      </div>

      {/* Tabla de Auditoría */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Reportes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : audits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay registros de auditoría disponibles
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Reporte</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Tiempo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Archivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((audit) => (
                    <TableRow key={audit.id}>
                      
                      {/* Fecha */}
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(audit.generatedAt), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>

                      {/* Usuario */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{audit.userEmail}</span>
                          <span className="text-xs text-muted-foreground">{audit.clientIp}</span>
                        </div>
                      </TableCell>

                      {/* Tipo de Reporte */}
                      <TableCell className="capitalize">
                        {audit.reportType}
                      </TableCell>

                      {/* Formato */}
                      <TableCell>
                        <Badge variant={audit.reportFormat === 'PDF' ? 'default' : 'secondary'}>
                          {audit.reportFormat}
                        </Badge>
                      </TableCell>

                      {/* Tamaño */}
                      <TableCell className="whitespace-nowrap">
                        {formatBytes(audit.fileSizeBytes)}
                      </TableCell>

                      {/* Tiempo de Generación */}
                      <TableCell className="whitespace-nowrap">
                        {audit.generationTimeMs ? `${audit.generationTimeMs}ms` : 'N/A'}
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        {audit.success ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Exitoso
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Error
                          </Badge>
                        )}
                      </TableCell>

                      {/* Nombre de Archivo */}
                      <TableCell className="max-w-[200px] truncate" title={audit.fileName || ''}>
                        {audit.fileName || 'N/A'}
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Reportes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audits.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reportes Exitosos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {audits.filter(a => a.success).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reportes con Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {audits.filter(a => !a.success).length}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

export default ReportAudit;
