// src/components/research-projects/ResearchDocumentLink.tsx
import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ResearchProjectsAPI } from "@/lib/api";
import { getServerErrorMessage } from "@/lib/api/utils/error-handling";

interface ResearchDocumentLinkProps {
  label: string;
  url: string | null;
  fileName?: string | null;
}

/** Abre el PDF de una resolución con la sesión del usuario (el servidor no expone los archivos sin autenticación). */
export function ResearchDocumentLink({ label, url, fileName }: ResearchDocumentLinkProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // El archivo es opcional: sin él se muestra igualmente la resolución (su número), marcada "sin archivo".
  if (!url) return <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{label} · sin archivo</span>;

  const open = async () => {
    setLoading(true);
    try {
      const resp = await ResearchProjectsAPI.downloadDocument(url);
      if (resp.status === "success") {
        const objectUrl = URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
        window.open(objectUrl, "_blank", "noopener");
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      } else {
        toast({ title: "No se pudo abrir el documento", description: getServerErrorMessage(resp.error) ?? "Intente de nuevo más tarde.", variant: "destructive" });
      }
    } catch {
      toast({ title: "No se pudo abrir el documento", description: "Intente de nuevo más tarde.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={open} disabled={loading} title={fileName ?? undefined}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
}
