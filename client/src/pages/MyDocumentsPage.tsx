// src/pages/MyDocumentsPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Download, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeCertificatesAPI } from '@/lib/api/services/employeeSelfService';
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

/**
 * Documentos propios consolidados. Por ahora agrupa los certificados emitidos (único
 * documento que este módulo genera); si en el futuro las solicitudes internas incorporan
 * adjuntos, se agregan aquí sin duplicar la tabla — mismo patrón de TBL_StoredFile.
 */
export default function MyDocumentsPage() {
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-certificates-documents'],
    queryFn: () => EmployeeCertificatesAPI.getMy({ status: 'EMITIDO', page: 1, pageSize: 50 }),
  });

  const result = data?.status === 'success' ? data.data : null;
  const items = result?.items ?? [];

  const handleDownload = async (id: number) => {
    try {
      const res = await EmployeeCertificatesAPI.downloadMy(id);
      if (res.status !== 'success') throw new Error(parseApiError(res.error));
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo descargar', description: parseApiError(err) });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-lg">
            <FolderOpen className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
          </div>
          Mis Documentos
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">Documentos generados a tu nombre, disponibles para descarga.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{parseApiError(error)}</p>
            <Button onClick={() => refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No tienes documentos disponibles todavía.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium">Documento</th>
                    <th className="p-3 font-medium">Fecha de emisión</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.requestId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">Certificado {c.certificateType}</td>
                      <td className="p-3">{formatDate(c.issuedAt)}</td>
                      <td className="p-3"><StatusBadge label="Emitido" tone="success" /></td>
                      <td className="p-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => handleDownload(c.requestId)}>
                          <Download className="h-4 w-4 mr-1" /> Descargar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
