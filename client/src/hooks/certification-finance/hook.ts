// src/pages/certification-finance/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FinancialCertification } from "@/types/certificationFinance";
import type { DirectoryParameter } from "@/types/directoryParameter";
import { DirectoryParametersAPI, FinancialCertificationAPI, TiposReferenciaAPI, type ApiResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from '@/lib/error-handling';

const CERT_LIST_KEY = ["/api/v1/rh/financial-certification"];
const CERT_PENDING_KEY = ["/api/v1/rh/financial-certification/pending"];

export function useDirectoryParams(code: string) {
  return useQuery<ApiResponse<DirectoryParameter>>({
    queryKey: ["directory-parameter", code],
    queryFn: () => DirectoryParametersAPI.getByCode(code),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCertifications() {
  return useQuery<ApiResponse<FinancialCertification[]>>({
    queryKey: CERT_LIST_KEY,
    queryFn: () => FinancialCertificationAPI.list(),
  });
}

export function usePendingCertifications() {
  return useQuery<ApiResponse<FinancialCertification[]>>({
    queryKey: CERT_PENDING_KEY,
    queryFn: () => FinancialCertificationAPI.getPending(),
    staleTime: 30_000,
  });
}

export function useCertStatusTypes() {
  return useQuery<ApiResponse<any[]>>({
    queryKey: ["ref-types", "FIN_CERT_STATUS"],
    queryFn: () => TiposReferenciaAPI.byCategory("FIN_CERT_STATUS"),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCertificationMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: CERT_LIST_KEY });
    qc.invalidateQueries({ queryKey: CERT_PENDING_KEY });
  }

  const createMutation = useMutation({
    mutationFn: (payload: Omit<FinancialCertification, "certificationId">) =>
      FinancialCertificationAPI.create(payload as any),
    onSuccess: (resp: any) => {
      if (resp?.status === "success") {
        invalidateAll();
      } else {
        toast({
          title: "Error al guardar",
          description: resp?.error?.message ?? "No se pudo guardar la certificación",
          variant: "destructive",
        });
      }
    },
    onError: (e: unknown) => {
      toast({
        title: "Error de conexión",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; payload: Partial<Omit<FinancialCertification, "certificationId">> }) =>
      FinancialCertificationAPI.update(args.id, args.payload as any),
    onSuccess: (resp: any) => {
      if (resp?.status === "success") {
        invalidateAll();
        qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });
        toast({ title: "Actualizado", description: "Los cambios se guardaron correctamente." });
      } else {
        toast({
          title: "Error al actualizar",
          description: resp?.error?.message ?? "No se pudo actualizar la certificación",
          variant: "destructive",
        });
      }
    },
    onError: (e: unknown) => {
      toast({
        title: "Error de conexión",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    }
  });

  const approveMutation = useMutation({
    mutationFn: (certificationId: number) => FinancialCertificationAPI.approve(certificationId),
    onSuccess: (resp: any) => {
      if (resp?.status === "success") {
        invalidateAll();
        qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });
        toast({ title: "Certificación aprobada", description: "La solicitud pasa a Pendiente de contratación." });
      } else {
        toast({
          title: "Error al aprobar",
          description: resp?.error?.message ?? "No se pudo aprobar la certificación",
          variant: "destructive",
        });
      }
    },
    onError: (e: unknown) => {
      toast({
        title: "Error de conexión",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      FinancialCertificationAPI.reject(id, reason),
    onSuccess: (resp: any) => {
      if (resp?.status === "success") {
        invalidateAll();
        qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });
        toast({ title: "Certificación rechazada", description: "La solicitud pasó a Certificación rechazada." });
      } else {
        toast({
          title: "Error al rechazar",
          description: resp?.error?.message ?? "No se pudo rechazar la certificación",
          variant: "destructive",
        });
      }
    },
    onError: (e: unknown) => {
      toast({
        title: "Error de conexión",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    },
  });

  const rejectTemporaryMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      FinancialCertificationAPI.rejectTemporary(id, reason),
    onSuccess: (resp: any) => {
      if (resp?.status === "success") {
        invalidateAll();
        qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });
        toast({
          title: "Rechazo temporal registrado",
          description: "El solicitante puede corregir y reenviar la solicitud.",
        });
      } else {
        toast({
          title: "Error al rechazar temporalmente",
          description: resp?.error?.message ?? "No se pudo registrar el rechazo temporal.",
          variant: "destructive",
        });
      }
    },
    onError: (e: unknown) => {
      toast({
        title: "Error de conexión",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (certificationId: number) => FinancialCertificationAPI.resend(certificationId),
    onSuccess: (resp: any) => {
      if (resp?.status === "success") {
        invalidateAll();
        qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/contract-request"] });
        toast({
          title: "Certificación reenviada",
          description: "La certificación volvió a Pendiente de revisión.",
        });
      } else {
        toast({
          title: "Error al reenviar",
          description: resp?.error?.message ?? "No se pudo reenviar la certificación.",
          variant: "destructive",
        });
      }
    },
    onError: (e: unknown) => {
      toast({
        title: "Error de conexión",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    },
  });

  return { createMutation, updateMutation, approveMutation, rejectMutation, rejectTemporaryMutation, resendMutation };
}
