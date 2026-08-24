import { useCallback, useRef, useState } from "react";
import { SignatureProcessesAPI } from "@/lib/api";
import type { FirmaEcCertificateType } from "@/types/electronic-signature";

// El salto a "firmaec://" (protocolo personalizado) SOLO lo permiten los navegadores
// moviles (Chrome/Safari) si ocurre de forma SINCRONA, directamente dentro del toque del
// usuario, sin ningun "await" de por medio (confirmado: sin este cambio, firmar desde
// celular con FirmaEC instalado no hacia nada, sin error visible). Por eso el flujo se
// separa en dos pasos: "launch" prepara el enlace llamando al backend (async), y "openNow"
// hace el redireccionamiento en si, para llamarse desde un onClick separado y directo.
export function useFirmaEc() {
  const [state, setState] = useState<"idle" | "launching" | "ready" | "unavailable" | "launched">("idle");
  const timer = useRef<number>();
  const launchUrlRef = useRef<string | null>(null);

  const launch = useCallback(
    async (
      processId: number,
      position?: { page: number; llx: number; lly: number; width?: number; height?: number },
      certificateType?: FirmaEcCertificateType
    ) => {
      setState("launching");
      const result = await SignatureProcessesAPI.startSigning(processId, position, certificateType);
      if (result.status === "error") {
        setState("unavailable");
        return;
      }
      launchUrlRef.current = result.data.launchUrl;
      setState("ready");
    },
    []
  );

  const openNow = useCallback(() => {
    if (!launchUrlRef.current) return;
    window.location.assign(launchUrlRef.current);
    setState("launched");
    timer.current = window.setTimeout(() => setState("unavailable"), Number(import.meta.env.VITE_FIRMAEC_DETECTION_TIMEOUT_MS || "120000"));
  }, []);

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    launchUrlRef.current = null;
    setState("idle");
  };

  return { state, launch, openNow, reset };
}
