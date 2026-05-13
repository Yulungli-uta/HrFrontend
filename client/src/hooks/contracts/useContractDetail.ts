// src/hooks/contracts/useContractDetail.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ContractsRHAPI } from '@/lib/api/services/contracts';
import type {
  GenerateContractDocumentResponse,
  ContractDocumentStatusDto,
  ContractStatusHistoryEntry,
} from '@/types/contractDetail';

export function useContractDetail(contractId: number | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['contract-detail', contractId];
  const docStatusKey = ['contract-doc-status', contractId];
  const historyKey = ['contract-history', contractId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => ContractsRHAPI.getById(contractId!),
    enabled: contractId !== null && contractId > 0,
    staleTime: 30_000,
  });

  const { data: docStatusData } = useQuery({
    queryKey: docStatusKey,
    queryFn: () => ContractsRHAPI.documentStatus(contractId!),
    enabled: contractId !== null && contractId > 0,
    staleTime: 30_000,
  });

  const { data: historyData } = useQuery({
    queryKey: historyKey,
    queryFn: () => ContractsRHAPI.history(contractId!),
    enabled: contractId !== null && contractId > 0,
    staleTime: 30_000,
  });

  const contract = data?.status === 'success' ? data.data : null;
  const docStatus: ContractDocumentStatusDto | null =
    docStatusData?.status === 'success' ? (docStatusData.data as ContractDocumentStatusDto) : null;
  const statusHistory: ContractStatusHistoryEntry[] =
    historyData?.status === 'success' ? (historyData.data as ContractStatusHistoryEntry[]) : [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: docStatusKey });
    queryClient.invalidateQueries({ queryKey: historyKey });
    queryClient.invalidateQueries({ queryKey: ['contracts-rh'] });
  }

  const generateDocumentMutation = useMutation({
    mutationFn: (payload?: { overrides?: Record<string, string>; forceRegenerate?: boolean }) =>
      ContractsRHAPI.generateDocument(contractId!, payload),
    onSuccess: (resp) => {
      if (resp.status === 'success') {
        queryClient.setQueryData<{ pdfBase64: string; fileName: string }>(
          ['contract-generated-pdf', contractId ?? 0],
          {
            pdfBase64: (resp.data as GenerateContractDocumentResponse).pdfBase64,
            fileName: (resp.data as GenerateContractDocumentResponse).fileName,
          }
        );
      }
      invalidate();
      toast({ title: 'Documento del contrato generado.' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al generar el documento.' }),
  });

  const markPendingMutation = useMutation({
    mutationFn: (payload?: { comment?: string | null }) =>
      ContractsRHAPI.markPendingSignatures(contractId!, payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Contrato marcado como Pendiente de Firmas.' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al cambiar el estado.' }),
  });

  const uploadSignedMutation = useMutation({
    mutationFn: (payload: { storedFileId: number; comment?: string | null }) =>
      ContractsRHAPI.uploadSignedDocument(contractId!, payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Documento firmado registrado.' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al registrar el documento firmado.' }),
  });

  const finalizeMutation = useMutation({
    mutationFn: (payload?: { comment?: string | null }) =>
      ContractsRHAPI.finalizeDocument(contractId!, payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Contrato finalizado exitosamente.' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al finalizar el contrato.' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (payload: { reason: string }) =>
      ContractsRHAPI.cancelDocument(contractId!, payload),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['contract-request-pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['contract-request-pending-people'] });
      queryClient.invalidateQueries({ queryKey: ['contract-request-slots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/rh/cv/contract-request'] });
      toast({ title: 'Contrato anulado.' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Error al anular el contrato.' }),
  });

  const isBusy =
    generateDocumentMutation.isPending ||
    markPendingMutation.isPending ||
    uploadSignedMutation.isPending ||
    finalizeMutation.isPending ||
    cancelMutation.isPending;

  const generatedDocResponse =
    generateDocumentMutation.data?.status === 'success'
      ? (generateDocumentMutation.data.data as GenerateContractDocumentResponse)
      : null;

  const cachedGeneratedDoc = queryClient.getQueryData<{ pdfBase64: string; fileName: string }>(
    ['contract-generated-pdf', contractId ?? 0]
  );

  return {
    contract,
    docStatus,
    statusHistory,
    isLoading,
    isError,
    isBusy,
    isGeneratingDocument: generateDocumentMutation.isPending,
    generatedDocResponse,
    generatedPdfBase64: cachedGeneratedDoc?.pdfBase64 ?? null,
    generatedFileName: cachedGeneratedDoc?.fileName ?? null,
    generateDocument: (payload?: { overrides?: Record<string, string>; forceRegenerate?: boolean }) =>
      generateDocumentMutation.mutate(payload),
    markPending: markPendingMutation.mutate,
    uploadSigned: uploadSignedMutation.mutate,
    finalize: finalizeMutation.mutate,
    cancelContract: cancelMutation.mutate,
    invalidate,
  };
}
