import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Edit, Trash2, Calendar, User, Book } from "lucide-react";
import { Book as BookType } from "@/types/person";

interface BooksTabProps {
  books: BookType[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver país de publicación */
  countryMap?: Record<number, string>;
}

export function BooksTab({ books, onEdit, onDelete, countryMap = {} }: BooksTabProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <BookOpen className="mr-2 h-5 w-5" />
          Libros Publicados
          <Badge variant="outline" className="ml-2">
            {books.length}
          </Badge>
        </CardTitle>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={() => onEdit("book", null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Libro
        </Button>
      </CardHeader>

      <CardContent>
        {books.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay libros registrados</p>
            <p className="text-sm">
              Agrega el primer libro haciendo clic en el botón "Nuevo Libro"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <Card key={book.bookId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-lg leading-tight">
                          {book.title}
                        </h4>
                        <div className="flex gap-2 shrink-0">
                          <ActionIconButton
                            icon={Edit}
                            label="Editar libro"
                            tone="primary"
                            onClick={() => onEdit("book", book)}
                            touch
                          />
                          <ActionIconButton
                            icon={Trash2}
                            label="Eliminar libro"
                            tone="destructive"
                            onClick={() => onDelete(book.bookId)}
                            touch
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                        {book.publisher && (
                          <div className="flex items-center gap-2">
                            <Book className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                            <span>
                              <strong>Editorial:</strong> {book.publisher}
                            </span>
                          </div>
                        )}

                        {book.publicationDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                            <span>
                              <strong>Publicación:</strong>{" "}
                              {formatDate(book.publicationDate)}
                            </span>
                          </div>
                        )}

                        {book.isbn && (
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                            <span>
                              <strong>ISBN:</strong> {book.isbn}
                            </span>
                          </div>
                        )}

                        {(book as any).countryId && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground/70">🌍</span>
                            <span>
                              <strong>País:</strong>{" "}
                              {countryMap[Number((book as any).countryId)] ??
                                `País #${(book as any).countryId}`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {book.peerReviewed && (
                          <Badge variant="default" className="text-xs">
                            Revisado por pares
                          </Badge>
                        )}
                        {book.category && (
                          <Badge variant="outline" className="text-xs">
                            {book.category}
                          </Badge>
                        )}
                      </div>

                      {book.coAuthors && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                          <span>
                            <strong>Coautores:</strong> {book.coAuthors}
                          </span>
                        </div>
                      )}

                      {book.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {book.description}
                        </p>
                      )}
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
