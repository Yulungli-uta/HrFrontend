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
    cancelAction: cancelMutation.mutate,
  };
}
