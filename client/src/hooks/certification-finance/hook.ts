// src/pages/certification-finance/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FinancialCertification } from "@/types/certificationFinance";
import type { DirectoryParameter } from "@/types/directoryParameter";
import { DirectoryParametersAPI, FinancialCertificationAPI, type ApiResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useDirectoryParams(code: string) {
  return useQuery<ApiResponse<DirectoryParameter>>({
    queryKey: ["directory-parameter", code],
    queryFn: () => DirectoryParametersAPI.getByCode(code),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCertifications() {
  return useQuery<ApiResponse<FinancialCertification[]>>({
    queryKey: ["/api/v1/rh/financial-certification"],
    queryFn: () => FinancialCertificationAPI.list(),
  });
}

export function useCertificationMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (payload: Omit<FinancialCertification, "certificationId">) =>
      FinancialCertificationAPI.create(payload as any),
    onSuccess: (resp: any) => {
      if (resp?.status === "success") {
        qc.invalidateQueries({ queryKey: ["/api/v1/rh/financial-certification"] });
      } else {
        toast({
          title: "❌ Error al guardar",
          description: resp?.error?.message ?? "No se pudo guardar la certificación",
          variant: "destructive",
        });
      }
    },
    onError: (e: any) => {
      toast({
        title: "❌ Error de conexión",
        description: e?.message ?? "No se pudo conectar con el servidor",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; payload: Partial<Omit<FinancialCertification, "certificationId">> }) =>
      FinancialCertificationAPI.update(args.id, args.payload as any),
    onSuccess: (resp: any) => {
      if (resp?.status === "success") {
        qc.invalidateQueries({ queryKey: ["/api/v1/rh/financial-certification"] });
        toast({ title: "✅ Actualizado", description: "Los cambios se guardaron correctamente." });
      } else {
        toast({
          title: "❌ Error al actualizar",
          description: resp?.error?.message ?? "No se pudo actualizar la certificación",
          variant: "destructive",
        });
      }
    },
    onError: (e: any) => {
      toast({
        title: "❌ Error de conexión",
        description: e?.message ?? "No se pudo conectar con el servidor",
        variant: "destructive",
      });
    }
  });

  return { createMutation, updateMutation };
}
