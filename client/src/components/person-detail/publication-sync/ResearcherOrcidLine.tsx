import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicationSyncReadiness } from "@/hooks/usePublicationSync";

interface ResearcherOrcidLineProps {
  personId: number;
  onGoToPersonal?: () => void;
}

/** Solo lectura: el perfil de investigador se edita en la pestaña Personal. */
export function ResearcherOrcidLine({ personId, onGoToPersonal }: ResearcherOrcidLineProps) {
  const readiness = usePublicationSyncReadiness(personId);
  const data = readiness.data;
  if (!data) return null;

  return (
    <p className="mb-3 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
      <span>ORCID:</span>
      {data.hasOrcid ? (
        <a
          href={`https://orcid.org/${data.orcid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
        >
          {data.orcid} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span>no registrado</span>
      )}
      {onGoToPersonal && (
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onGoToPersonal}>
          {data.canEdit ? "Editar en Personal" : "Ver en Personal"}
        </Button>
      )}
    </p>
  );
}
