import type { FirmaEcErrorInfo } from "@/hooks/electronicSignature/useFirmaEc";

export function FirmaEcNotInstalledDialog({open,onRetry,onCancel,error}:{open:boolean;onRetry:()=>void;onCancel:()=>void;error?:FirmaEcErrorInfo|null}){
 if(!open)return null;
 // Sin "error": timeout real esperando firmaec:// (FirmaEC no instalado/no responde).
 // Con "error": el backend rechazo la peticion antes de llegar a FirmaEC (permisos, etc.)
 // — mostrar el motivo real en vez del mensaje de instalacion, que aqui no aplica.
 const isPermissionDenied=error?.code===403;
 const title=error?"No se pudo iniciar la firma":"No se detectó FirmaEC";
 const message=isPermissionDenied
   ?"No tienes permiso para firmar este documento. Contacta al administrador."
   :error
     ?(error.message||"Ocurrió un error al conectar con el servidor. Intenta de nuevo.")
     :"Instale o abra FirmaEC y vuelva a intentarlo.";
 return <div role="dialog" className="fixed inset-0 z-50 grid place-items-center bg-black/50"><div className="max-w-md rounded-xl bg-background p-6 shadow-xl">
  <h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p>
  <div className="mt-5 flex flex-wrap gap-2">
  {!error && <a className="rounded bg-primary px-4 py-2 text-primary-foreground" href={import.meta.env.VITE_FIRMAEC_DOWNLOAD_URL} target="_blank" rel="noreferrer">Descargar FirmaEC</a>}
  {!isPermissionDenied && <button className="rounded border px-4 py-2" onClick={onRetry}>Volver a intentar</button>}
  <button className="rounded px-4 py-2" onClick={onCancel}>Cancelar</button></div></div></div>;
}
