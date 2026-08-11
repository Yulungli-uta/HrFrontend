export function FirmaEcNotInstalledDialog({open,onRetry,onCancel}:{open:boolean;onRetry:()=>void;onCancel:()=>void}){
 if(!open)return null;return <div role="dialog" className="fixed inset-0 z-50 grid place-items-center bg-black/50"><div className="max-w-md rounded-xl bg-background p-6 shadow-xl">
  <h2 className="text-lg font-semibold">No se detectó FirmaEC</h2><p className="mt-2 text-sm text-muted-foreground">Instale o abra FirmaEC y vuelva a intentarlo.</p>
  <div className="mt-5 flex flex-wrap gap-2"><a className="rounded bg-primary px-4 py-2 text-primary-foreground" href={import.meta.env.VITE_FIRMAEC_DOWNLOAD_URL} target="_blank" rel="noreferrer">Descargar FirmaEC</a>
  <button className="rounded border px-4 py-2" onClick={onRetry}>Volver a intentar</button><button className="rounded px-4 py-2" onClick={onCancel}>Cancelar</button></div></div></div>;
}
