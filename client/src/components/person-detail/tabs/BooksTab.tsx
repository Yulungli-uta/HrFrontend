// client/src/components/person-detail/tabs/BooksTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Edit, Trash2, Calendar, User, Book } from "lucide-react";
import { Book as BookType } from "@/types/person";

interface BooksTabProps {
  books: BookType[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
}

export function BooksTab({ books, onEdit, onDelete }: BooksTabProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long'
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
          className="bg-uta-blue hover:bg-uta-blue/90"
          onClick={() => onEdit('book', null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Libro
        </Button>
      </CardHeader>
      <CardContent>
        {books.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay libros registrados</p>
            <p className="text-sm">Agrega el primer libro haciendo clic en el botón "Nuevo Libro"</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {books.map((book) => (
                <Card key={book.bookId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-gray-900 text-lg leading-tight">
                            {book.title}
                          </h4>
                          <div className="flex gap-2 ml-4 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit('book', book)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDelete(book.bookId)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          {book.publisher && (
                            <div className="flex items-center gap-2">
                              <Book className="h-4 w-4 text-gray-400" />
                              <span>
                                <strong>Editorial:</strong> {book.publisher}
                              </span>
                            </div>
                          )}

                          {book.publicationDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>
                                <strong>Fecha de publicación:</strong> {formatDate(book.publicationDate)}
                              </span>
                            </div>
                          )}

                          {book.isbn && (
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-gray-400" />
                              <span>
                                <strong>ISBN:</strong> {book.isbn}
                              </span>
                            </div>
                          )}

                          {book.peerReviewed && (
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-xs">
                                Revisado por pares
                              </Badge>
                            </div>
                          )}
                        </div>

                        {book.coAuthors && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>
                              <strong>Coautores:</strong> {book.coAuthors}
                            </span>
                          </div>
                        )}

                        {book.category && (
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {book.category}
                            </Badge>
                          </div>
                        )}

                        {book.description && (
                          <div className="text-sm text-gray-600">
                            <p className="line-clamp-2">{book.description}</p>
                          </div>
                        )}
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