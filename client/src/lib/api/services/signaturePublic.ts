// Servicio para el flujo publico de firmante externo: sin sesion, autorizacion por
// token de un solo uso en la URL (ver PublicSignatureController en el backend).
import { apiFetch } from "../core/fetch";
import { resolveBaseUrl } from "../core/config";
import type { FirmaEcCertificateType } from "@/types/electronic-signature";

export interface PublicParticipantInfo {
  participantId: number;
  fullName: string;
  processNumber: string;
  title: string;
  description: string | null;
  creatorEmail: string;
  status: string;
  alreadyUsed: boolean;
}

export interface PublicStartSigningResult {
  signingSessionId: string;
  launchUrl: string;
  expiresAt: string;
}

const path = (participantId: number) => `/api/v1/signature/public/participants/${participantId}`;

export const PublicSignatureAPI = {
  get: (participantId: number, token: string) =>
    apiFetch<PublicParticipantInfo>(`${path(participantId)}?token=${encodeURIComponent(token)}`),
  documentUrl: (participantId: number, token: string) =>
    `${resolveBaseUrl(path(participantId))}${path(participantId)}/document?token=${encodeURIComponent(token)}`,
  startSigning: (
    participantId: number,
    token: string,
    position?: { page: number; llx: number; lly: number; width?: number; height?: number },
    certificateType?: FirmaEcCertificateType
  ) =>
    apiFetch<PublicStartSigningResult>(`${path(participantId)}/start-signing?token=${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify({ ...position, certificateType }),
    }),
  // El cliente movil de FirmaEC no notifica solo al terminar de firmar (su pantalla final
  // solo ofrece Visualizar/Verificar/Compartir/Regresar) — este endpoint permite subir el
  // PDF que la app le entrego al firmante para completar el proceso manualmente.
  uploadSigned: (participantId: number, token: string, file: File) => {
    const body = new FormData();
    body.append("document", file);
    return apiFetch(`${path(participantId)}/upload-signed?token=${encodeURIComponent(token)}`, { method: "POST", body, timeoutMs: 120000 });
  },
};
