import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit, Trash2, Calendar, BookOpen, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Publication } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import { PUBLICATION_DOCUMENT_DIRECTORY_CODE, PUBLICATION_DOCUMENT_ENTITY_TYPE } from "@/features/constants";

interface PublicationsTabProps {
  publications: Publication[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Identificación de la persona — agrupa su expediente completo en una sola carpeta. */
  personIdCard?: string;
}

export function PublicationsTab({ publications, onEdit, onDelete, personIdCard }: PublicationsTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const resolveId = (pub: Publication): number =>
    (pub as any).publicationId ?? (pub as any).id ?? 0;

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg sm:text-xl">
            Publicaciones
            <Badge variant="outline" className="ml-2">
              {publications.length}
            </Badge>
          </CardTitle>
        </div>
        <Button size="sm" onClick={() => onEdit("publication", null)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva publicación
        </Button>
      </CardHeader>

      <CardContent>
        {publications.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No hay publicaciones registradas. Usa el botón
            <span className="font-semibold"> "Nueva publicación" </span>
            para agregar una.
          </div>
        ) : (
          <div className="space-y-3">
            {publications.map((publication) => (
              <Card
                key={resolveId(publication)}
                className="border-l-4 border-l-primary/60"
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base">
                          {publication.title || "Título no especificado"}
                        </h3>
                        {publication.publicationTypeName && (
                          <Badge variant="outline" className="text-xs">
                            {publication.publicationTypeName}
                          </Badge>
                        )}
                      </div>

                      {publication.location && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>{publication.location}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {publication.journalName && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            <span>{publication.journalName}</span>
                          </div>
                        )}
                        {publication.publicationDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(publication.publicationDate)}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs -ml-2"
                        onClick={() =>
                          setExpandedId(expandedId === resolveId(publication) ? null : resolveId(publication))
                        }
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Documento
                        {expandedId === resolveId(publication) ? (
                          <ChevronUp className="h-3.5 w-3.5 ml-1" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 ml-1" />
                        )}
                      </Button>

                      {expandedId === resolveId(publication) && (
                        <ReusableDocumentManager
                          directoryCode={PUBLICATION_DOCUMENT_DIRECTORY_CODE}
                          entityType={PUBLICATION_DOCUMENT_ENTITY_TYPE}
                          entityId={resolveId(publication)}
                          relativePath={personIdCard ? `${personIdCard}/${PUBLICATION_DOCUMENT_ENTITY_TYPE.toLowerCase()}` : undefined}
                          accept=".pdf"
                          maxSizeMB={15}
                          label="Documento de la publicación"
                          entityReady={true}
                          allowReplace
                          documentType={{ enabled: true, category: "CV_DOCUMENT_TYPE", label: "Tipo de documento" }}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <ActionIconButton
                        icon={Edit}
                        label="Editar publicación"
                        tone="primary"
                        onClick={() => onEdit("publication", publication)}
                        touch
                      />
                      <ActionIconButton
                        icon={Trash2}
                        label="Eliminar publicación"
                        tone="destructive"
                        onClick={() => onDelete(resolveId(publication))}
                        disabled={resolveId(publication) === 0}
                        touch
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
