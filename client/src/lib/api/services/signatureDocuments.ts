import { API_CONFIG } from "../core/config";
import { tokenService } from "@/features/auth";
export const signatureDocumentUrl=(documentId:number)=>`${API_CONFIG.SIGNATURE_BASE_URL}/api/v1/signature/documents/${documentId}/download`;
export async function downloadSignatureDocument(documentId:number){
 const response=await fetch(signatureDocumentUrl(documentId),{headers:{Authorization:`Bearer ${tokenService.getAccessToken()??""}`}});
 if(!response.ok)throw new Error("No fue posible descargar el documento.");return response.blob();
}
