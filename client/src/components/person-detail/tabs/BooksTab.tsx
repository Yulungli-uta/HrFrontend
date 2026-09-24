import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Edit, Trash2, Calendar, User, Book, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Book as BookType } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import { BOOK_DOCUMENT_DIRECTORY_CODE, BOOK_DOCUMENT_ENTITY_TYPE } from "@/features/constants";
import { useCvListState, buildFilterOptions, type CvSortOption, type CvFilterField } from "@/hooks/personDetails/useCvListState";
import { CvListToolbar } from "@/components/person-detail/CvListToolbar";
import { CvFilterBar } from "@/components/person-detail/CvFilterBar";
import { DataPagination } from "@/components/ui/DataPagination";

interface BooksTabProps {
  books: BookType[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver país de publicación */
  countryMap?: Record<number, string>;
  /** Identificación de la persona — agrupa su expediente completo en una sola carpeta. */
  personIdCard?: string;
}

export function BooksTab({ books, onEdit, onDelete, countryMap = {}, personIdCard }: BooksTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
    });
  };

  const sortOptions: CvSortOption<BookType>[] = [
    {
      value: "date_desc",
      label: "Más recientes primero",
      compare: (a, b) => new Date(b.publicationDate || 0).getTime() - new Date(a.publicationDate || 0).getTime(),
    },
    {
      value: "date_asc",
      label: "Más antiguas primero",
      compare: (a, b) => new Date(a.publicationDate || 0).getTime() - new Date(b.publicationDate || 0).getTime(),
    },
    {
      value: "title_asc",
      label: "Título (A-Z)",
      compare: (a, b) => (a.title || "").localeCompare(b.title || ""),
    },
  ];

  const filterFields: CvFilterField<BookType>[] = [
    {
      key: "category",
      label: "Categoría",
      options: buildFilterOptions(books.map((b) => b.category)),
      getValue: (b) => b.category,
    },
    {
      key: "peerReviewed",
      label: "Revisado por pares",
      options: [
        { value: "true", label: "Sí" },
        { value: "false", label: "No" },
      ],
      getValue: (b) => (b.peerReviewed ? "true" : "false"),
    },
  ];

  const list = useCvListState({
    items: books,
    searchText: (b) => `${b.title ?? ""} ${b.publisher ?? ""} ${b.coAuthors ?? ""}`,
    sortOptions,
    defaultSort: "date_desc",
    filterFields,
  });

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
          <>
            <CvListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Buscar por título, editorial o coautores..."
              sortValue={list.sortValue}
              onSortChange={list.setSortValue}
              sortOptions={sortOptions}
            />
            <CvFilterBar
              fields={list.filterFields}
              values={list.filterValues}
              onChange={list.setFilterValue}
              onClear={list.clearFilters}
            />

            {list.totalCount === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No se encontraron libros con ese criterio.
              </div>
            ) : (
              <div className="space-y-2">
            {list.paginatedItems.map((book) => (
              <Card key={book.bookId} className="hover:shadow-md transition-shadow border-l-4 border-l-destructive">
                <CardContent className="p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="flex items-center justify-center h-8 w-8 rounded-md bg-destructive/10 shrink-0">
                            <BookOpen className="h-4 w-4 text-destructive" />
                          </div>
                          <h4 className="font-semibold text-foreground text-sm leading-tight">
                            {book.title}
                          </h4>
                        </div>
                        <div className="flex gap-1 shrink-0">
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

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {book.publisher && (
                          <div className="flex items-center gap-1">
                            <Book className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            <span>{book.publisher}</span>
                          </div>
                        )}

                        {book.publicationDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            <span>{formatDate(book.publicationDate)}</span>
                          </div>
                        )}

                        {book.isbn && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            <span>ISBN {book.isbn}</span>
                          </div>
                        )}

                        {(book as any).countryId && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">🌍</span>
                            <span>
                              {countryMap[Number((book as any).countryId)] ??
                                `País #${(book as any).countryId}`}
                            </span>
                          </div>
                        )}

                        {book.coAuthors && (
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            <span>{book.coAuthors}</span>
                          </div>
                        )}
                      </div>

                      {(book.peerReviewed || book.category) && (
                        <div className="flex flex-wrap gap-1.5">
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
                      )}

                      {book.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {book.description}
                        </p>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start text-xs -ml-2 h-7"
                        onClick={() => setExpandedId(expandedId === book.bookId ? null : book.bookId)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Documento
                        {expandedId === book.bookId ? (
                          <ChevronUp className="h-3.5 w-3.5 ml-1" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 ml-1" />
                        )}
                      </Button>

                      {expandedId === book.bookId && (
                        <ReusableDocumentManager
                          directoryCode={BOOK_DOCUMENT_DIRECTORY_CODE}
                          entityType={BOOK_DOCUMENT_ENTITY_TYPE}
                          entityId={book.bookId}
                          relativePath={personIdCard ? `${personIdCard}/${BOOK_DOCUMENT_ENTITY_TYPE.toLowerCase()}` : undefined}
                          accept=".pdf,.jpg,.jpeg,.png"
                          maxSizeMB={15}
                          label="Portada o ficha del libro"
                          entityReady={true}
                          allowReplace
                          documentType={{ enabled: true, category: "CV_DOCUMENT_TYPE", label: "Tipo de documento" }}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
              </div>
            )}

            <DataPagination
              page={list.page}
              totalPages={list.totalPages}
              totalCount={list.totalCount}
              pageSize={list.pageSize}
              hasPreviousPage={list.hasPreviousPage}
              hasNextPage={list.hasNextPage}
              onPageChange={list.setPage}
              onPageSizeChange={list.setPageSize}
              pageSizeOptions={[6, 12, 24, 48]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
