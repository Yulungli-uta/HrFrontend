import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Calendar,
  BookOpen,
  MapPin,
} from "lucide-react";
import { Publication } from "@/types/person";

interface PublicationsTabProps {
  publications: Publication[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
}

export function PublicationsTab({
  publications,
  onEdit,
  onDelete,
}: PublicationsTabProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleNewPublication = () => {
    console.log("[PublicationsTab] click NUEVA publicación");
    onEdit("publication", null);
  };

  const handleEditPublication = (publication: Publication) => {
    console.log("[PublicationsTab] click EDITAR publicación", {
      publicationId: (publication as any)?.publicationId,
      publication,
    });
    onEdit("publication", publication);
  };

  const handleDeletePublication = (publication: Publication) => {
    const id =
      (publication as any)?.publicationId ??
      (publication as any)?.id ??
      0;

    console.log("[PublicationsTab] click ELIMINAR publicación", {
      id,
      publication,
    });

    if (!id) {
      console.error(
        "[PublicationsTab] NO se encontró id para eliminar publicación",
        publication
      );
      return;
    }

    onDelete(id);
  };

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
        <Button size="sm" onClick={handleNewPublication}>
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
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {publications.map((publication) => (
                <Card
                  key={
                    (publication as any).publicationId ??
                    (publication as any).id
                  }
                  className="border-l-4 border-l-primary/60"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
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
                            <MapPin className="h-3 w-3" />
                            <span>{publication.location}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {publication.journalName && (
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              <span>{publication.journalName}</span>
                            </div>
                          )}

                          {publication.publicationDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {formatDate(publication.publicationDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleEditPublication(publication)
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() =>
                            handleDeletePublication(publication)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
