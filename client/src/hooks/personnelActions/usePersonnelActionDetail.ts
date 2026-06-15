// src/hooks/personnelActions/usePersonnelActionDetail.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { PersonnelActionsAPI } from '@/lib/api/services/contracts';
import type {
  UpdatePersonnelActionRequest,
  CancelPersonnelActionRequest,
  CommentRequest,
  GenerateDocumentOverridesRequest,
  CreatePersonnelActionResponse,
} from '@/types/personnel-actions';

// Statuses que representan que una acción ya cerró su ciclo de vida
const TERMINAL_STATUSES = ['FINALIZADO', 'ANULADO'];

export function usePersonnelActionDetail(actionId: number | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['personnel-action', actionId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => PersonnelActionsAPI.getById(actionId!),
    enabled: actionId !== null && actionId > 0,
    staleTime: 30_000,
  });

  const action = data?.status === 'success' ? data.data : null;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['personnel-actions'] });
    queryClient.invalidateQueries({ queryKey: ['personnel-action-history', actionId] });
  }

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePersonnelActionRequest) =>
      PersonnelActionsAPI.update(actionId!, payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Acción actualizada.' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al actualizar la acción.' }),
  });

  const generateDocumentMutation = useMutation({
    mutationFn: (payload?: GenerateDocumentOverridesRequest) =>
      PersonnelActionsAPI.generateDocument(actionId!, payload),
    onSuccess: (resp) => {
      invalidate();
      toast({ title: 'Documento generado.' });
      return resp;
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al generar el documento.' }),
  });

  const markPendingMutation = useMutation({
    mutationFn: (payload?: CommentRequest) =>
      PersonnelActionsAPI.markPendingSignatures(actionId!, payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Acción marcada como Pendiente de Firmas.' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al cambiar el estado.' }),
  });

  const finalizeMutation = useMutation({
    mutationFn: (payload?: CommentRequest) =>
      PersonnelActionsAPI.finalize(actionId!, payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Acción finalizada exitosamente.' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al finalizar la acción.' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (payload: CancelPersonnelActionRequest) =>
      PersonnelActionsAPI.cancel(actionId!, payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Acción anulada.' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al anular la acción.' }),
  });

  // ── Finalizar la acción previa vigente del empleado ──────────────────────────
  // Servicio: HrBackend — GET /api/v1/rh/personnel-actions/by-employee/{employeeId}
  //           HrBackend — POST /api/v1/rh/personnel-actions/{id}/finalize
  // Busca la acción no-terminal más reciente del empleado (distinta a la actual)
  // y la finaliza. Se usa cuando requiresAdUserCreation = true al cargar el firmado.
  const finalizePreviousVigente = async (employeeId: number) => {
    try {
      const resp = await PersonnelActionsAPI.getByEmployee(employeeId);
      if (resp.status !== 'success') return;

      const previous = (resp.data ?? [])
        .filter(a => a.actionId !== actionId && !TERMINAL_STATUSES.includes(a.status))
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];

      if (!previous) return;

      const finalizeResp = await PersonnelActionsAPI.finalize(previous.actionId);
      if (finalizeResp.status === 'success') {
        toast({ title: 'Acción anterior finalizada.', description: `Acción #${previous.actionId} cerrada como vigente anterior.` });
        invalidate();
      } else {
        toast({ variant: 'destructive', title: 'No se pudo finalizar la acción anterior.', description: finalizeResp.error?.message });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error al buscar la acción anterior del empleado.' });
    }
  };

  const isBusy =
    updateMutation.isPending ||
    generateDocumentMutation.isPending ||
    markPendingMutation.isPending ||
    finalizeMutation.isPending ||
    cancelMutation.isPending;

  const generatedDocResponse =
    generateDocumentMutation.data?.status === 'success'
      ? (generateDocumentMutation.data.data as CreatePersonnelActionResponse)
      : null;

  const cachedCreatedDoc = queryClient.getQueryData<{ pdfBase64: string; fileName: string | null }>(
    ['personnel-action-created-pdf', actionId ?? 0]
  );

  return {
    action,
    isLoading,
    isError,
    isBusy,
    isGeneratingDocument: generateDocumentMutation.isPending,
    generatedDocResponse,
    createdDocPdfBase64: cachedCreatedDoc?.pdfBase64 ?? null,
    createdDocFileName: cachedCreatedDoc?.fileName ?? null,
    updateAction: updateMutation.mutate,
    generateDocument: (overrides?: GenerateDocumentOverridesRequest) =>
      generateDocumentMutation.mutate(overrides),
    markPending: markPendingMutation.mutate,
    finalize: finalizeMutation.mutate,
    finalizeAsync: finalizeMutation.mutateAsync,
    finalizePreviousVigente,
    cancelAction: cancelMutation.mutate,
  };
}
