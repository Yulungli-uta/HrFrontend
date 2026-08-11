import { apiFetch } from "../core/fetch";
export function validateSignedDocument(file:File){const body=new FormData();body.append("document",file);return apiFetch("/api/v1/signature/validation/documents",{method:"POST",body,timeoutMs:120000});}
// La contraseña viaja solo en este request (form-data), nunca se guarda en el cliente ni
// se manda a ningun otro lado — el backend la usa en memoria para abrir el certificado y
// la descarta de inmediato (ver CertificateValidationService).
export function validateCertificate(file:File,password:string){const body=new FormData();body.append("certificate",file);body.append("password",password);return apiFetch("/api/v1/signature/validation/certificate",{method:"POST",body,timeoutMs:30000});}
