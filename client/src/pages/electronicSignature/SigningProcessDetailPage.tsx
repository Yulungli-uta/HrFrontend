// src/pages/electronicSignature/SigningProcessDetailPage.tsx
import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, RefreshCw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SigningProgress } from "@/components/electronicSignature/SigningProgress";
import { SignatureProcessesAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const TERMINAL_STATUSES = new Set(["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED", "VALIDATIONFAILED"]);
const ACTIVE_STATUSES = new Set(["INPROGRESS", "PARTIALLYSIGNED"]);

export default function SigningProcessDetailPage() {
  const [, params] = useRoute("/signatures/processes/:id");
  const processId = Number(params?.id);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["signature-process-progress", processId],
    queryFn: () => SignatureProcessesAPI.progress(processId),
    enabled: Number.isFinite(processId),
    refetchInterval: (query) => {
      const status = query.state.data?.status === "success" ? query.state.data.data.status : undefined;
      return status && TERMINAL_STATUSES.has(status.toUpperCase()) ? false : 8_000;
    },
    refetchOnWindowFocus: true,
  });

  const progress = data?.status === "success" ? data.data : null;
  const errorMessage =
    isError ? "No se pudo cargar el proceso de firma." : data?.status === "error" ? data.error.message : null;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const remindMutation = useMutation({
    mutationFn: () => SignatureProcessesAPI.remind(processId),
    onSuccess: (res) => {
      if (res.status === "error") {
        toast({ variant: "destructive", title: "No se pudo enviar", description: res.error.message });
        return;
      }
      toast({ title: "Correo enviado", description: "Se notificó por correo a los firmantes pendientes." });
      queryClient.invalidateQueries({ queryKey: ["signature-process-progress", processId] });
    },
    onError: () => toast({ variant: "destructive", title: "No se pudo enviar", description: "Intenta de nuevo en unos segundos." }),
  });

  const canRemind = !!progress && ACTIVE_STATUSES.has(progress.status.toUpperCase());
  const [previewing, setPreviewing] = useState(false);

  const handlePreview = async () => {
    if (!progress) return;
    setPreviewing(true);
    try {
      const docsRes = await SignatureProcessesAPI.documents(processId);
      if (docsRes.status === "error") {
        toast({ variant: "destructive", title: "No se pudo previsualizar", description: docsRes.error.message });
        return;
      }
      const doc = docsRes.data[0];
      const version =
        doc?.versions.find((v) => v.sequenceNumber === progress.currentDocumentVersion) ??
        doc?.versions[doc.versions.length - 1];
      if (!version) {
        toast({ variant: "destructive", title: "No se pudo previsualizar", description: "El proceso no tiene documentos." });
        return;
      }
      const blobRes = await SignatureProcessesAPI.downloadVersion(version.versionId);
      if (blobRes.status === "error") {
        toast({ variant: "destructive", title: "No se pudo previsualizar", description: blobRes.error.message });
        return;
      }
      window.open(URL.createObjectURL(blobRes.data as Blob), "_blank");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/signatures/processes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Procesos de firma
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {!!progress && (
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
              {previewing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Ver documento
            </Button>
          )}
          {canRemind && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => remindMutation.mutate()}
              disabled={remindMutation.isPending}
            >
              {remindMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar correo a pendientes
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Detalle del proceso</h1>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {!isLoading && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {!isLoading && progress && <SigningProgress value={progress} />}
    </main>
  );
}
