import { apiFetch } from "../core/fetch";
import type { AuditEvent, CreateSigningRequest, SigningDocument, SigningProcessListItem, SigningProgress, SigningSession } from "@/types/electronic-signature";
export const SignatureProcessesAPI={
 create:(body:CreateSigningRequest,idempotencyKey=crypto.randomUUID())=>apiFetch("/api/v1/signature/processes",{method:"POST",headers:{"Idempotency-Key":idempotencyKey},body:JSON.stringify(body)}),
 list:()=>apiFetch<SigningProcessListItem[]>("/api/v1/signature/processes"),
 listAll:()=>apiFetch<SigningProcessListItem[]>("/api/v1/signature/processes/all"),
 inbox:()=>apiFetch<SigningProcessListItem[]>("/api/v1/signature/inbox"),
 get:(id:number)=>apiFetch<SigningProgress>(`/api/v1/signature/processes/${id}`),
 progress:(id:number)=>apiFetch<SigningProgress>(`/api/v1/signature/processes/${id}/progress`),
 audit:(id:number)=>apiFetch<AuditEvent[]>(`/api/v1/signature/processes/${id}/audit`),
 documents:(id:number)=>apiFetch<SigningDocument[]>(`/api/v1/signature/processes/${id}/documents`),
 cancel:(id:number)=>apiFetch(`/api/v1/signature/processes/${id}/cancel`,{method:"POST"}),
 remind:(id:number)=>apiFetch(`/api/v1/signature/processes/${id}/remind`,{method:"POST"}),
 startSigning:(id:number,position?:{page:number;llx:number;lly:number;width?:number;height?:number})=>apiFetch<SigningSession>(`/api/v1/signature/processes/${id}/start-signing`,{method:"POST",body:position?JSON.stringify(position):undefined}),
 downloadVersion:(versionId:number)=>apiFetch<Blob>(`/api/v1/signature/documents/versions/${versionId}/download`,{headers:{Accept:"application/pdf"}}),
 // El cliente movil de FirmaEC no notifica solo al terminar de firmar (su pantalla final
 // solo ofrece Visualizar/Verificar/Compartir/Regresar) — este endpoint permite subir el
 // PDF que la app le entrego al firmante para completar el proceso manualmente.
 uploadSigned:(id:number,file:File)=>{const body=new FormData();body.append("document",file);return apiFetch(`/api/v1/signature/processes/${id}/upload-signed`,{method:"POST",body,timeoutMs:120000});}
};
