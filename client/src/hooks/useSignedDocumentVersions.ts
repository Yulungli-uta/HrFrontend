// Versiones del documento firmado de una acción de personal o de un contrato.
import { useQuery } from '@tanstack/react-query';
import { ContractsRHAPI, PersonnelActionsAPI } from '@/lib/api/services/contracts';
import { unwrapApiResponse } from '@/lib/api/utils/error-handling';
import type { StoredFileVersion } from '@/types/storedFileVersions';

export type SignedDocumentKind = 'action' | 'contract';

export const signedDocumentVersionsKey = (kind: SignedDocumentKind, id: number) =>
  ['signed-document-versions', kind, id] as const;

export function useSignedDocumentVersions(kind: SignedDocumentKind, id: number, enabled = true) {
  return useQuery({
    queryKey: signedDocumentVersionsKey(kind, id),
    enabled: enabled && id > 0,
    queryFn: async (): Promise<StoredFileVersion[]> => {
      const api = kind === 'action' ? PersonnelActionsAPI : ContractsRHAPI;
      return unwrapApiResponse(await api.getSignedDocumentVersions(id));
    },
  });
}
