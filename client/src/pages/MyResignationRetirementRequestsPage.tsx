// src/pages/MyResignationRetirementRequestsPage.tsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LogOut, Plus, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { ResignationRetirementAPI } from '@/lib/api/services/resignationRetirement';
import { parseApiError } from '@/lib/api/utils/error-handling';
import { RequestStatusBadge } from '@/components/resignationRetirement/RequestStatusBadge';
import { RequestForm } from '@/components/resignationRetirement/RequestForm';
import { MyRequestDetailDialog } from '@/components/resignationRetirement/MyRequestDetailDialog';
import type { ResignationRetirementSummary } from '@/types/resignation-retirement';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const REQUEST_TYPE_LABEL: Record<string, string> = {
  RESIGNATION: 'Renuncia',
  RETIREMENT: 'Jubilación',
};

export default function MyResignationRetirementRequestsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const { setIsFormDirty, handleOpenChange, close: closeForm, confirmOpen, confirmExit, closeConfirm } =
    useUnsavedChangesGuard(setIsFormOpen);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-resignation-retirement-requests', page],
    queryFn: () => ResignationRetirementAPI.getMy({ page, pageSize: 10 }),
  });

  const result = data?.status === 'success' ? data.data : null;
  const items: ResignationRetirementSummary[] = result?.items ?? [];

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/15 rounded-lg">
              <LogOut className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            </div>
            Mis Solicitudes de Renuncia/Jubilación
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Registra y da seguimiento a tus solicitudes. Solo puedes ver y gestionar las tuyas.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </Button>
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium">Tipo</th>
                    <th className="p-3 font-medium">Fecha de solicitud</th>
                    <th className="p-3 font-medium">Fecha propuesta de salida</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No tienes solicitudes registradas.
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr key={r.requestId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">{REQUEST_TYPE_LABEL[r.requestType] ?? r.requestType}</td>
                        <td className="p-3">{formatDate(r.requestDate)}</td>
                        <td className="p-3">{formatDate(r.proposedExitDate)}</td>
                        <td className="p-3">
                          <RequestStatusBadge status={r.status} />
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequestId(r.requestId)}
                          >
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {result && result.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Página {result.page} de {result.totalPages} — {result.totalCount} solicitudes
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= result.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva solicitud de renuncia/jubilación</DialogTitle>
            <DialogDescription>
              Tus datos laborales se cargan automáticamente; solo completa los campos de la solicitud.
            </DialogDescription>
          </DialogHeader>
          <RequestForm onSuccess={closeForm} onCancel={closeForm} onDirtyChange={setIsFormDirty} />
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog open={confirmOpen} onClose={closeConfirm} onConfirmExit={confirmExit} />

      <MyRequestDetailDialog
        open={selectedRequestId !== null}
        onOpenChange={(open) => !open && setSelectedRequestId(null)}
        requestId={selectedRequestId}
        onChanged={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['my-resignation-retirement-requests'] });
        }}
      />
    </div>
  );
}
