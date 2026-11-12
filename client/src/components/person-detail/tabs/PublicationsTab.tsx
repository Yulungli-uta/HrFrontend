import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, RefreshCw, Edit, Trash2, Calendar, BookOpen, MapPin, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";
import { Publication } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import { PUBLICATION_DOCUMENT_DIRECTORY_CODE, PUBLICATION_DOCUMENT_ENTITY_TYPE } from "@/features/constants";
import { useCvListState, buildFilterOptions, type CvSortOption, type CvFilterField } from "@/hooks/personDetails/useCvListState";
import { CvListToolbar } from "@/components/person-detail/CvListToolbar";
import { CvFilterBar } from "@/components/person-detail/CvFilterBar";
import { DataPagination } from "@/components/ui/DataPagination";
import { formatDate as clockFormatDate } from "@/lib/clock";
import { PublicationStatusBadge } from "@/components/person-detail/PublicationStatusBadge";
import { OrcidRequiredGate } from "@/components/person-detail/publication-sync/OrcidRequiredGate";
import { ResearcherOrcidLine } from "@/components/person-detail/publication-sync/ResearcherOrcidLine";
import { PublicationSyncDialog } from "@/components/person-detail/publication-sync/PublicationSyncDialog";
import { isPendingReview, isPublicationLocked, lockedMessage, publicationCounts } from "@/features/publications/publicationStatus";
import { doiSearchText, doiUrl, normalizeDoi } from "@/features/publications/doi";

interface PublicationsTabProps {
  publications: Publication[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Identificación de la persona — agrupa su expediente completo en una sola carpeta. */
  personIdCard?: string;
  /** Persona dueña de la Hoja de Vida; habilita "Sincronizar publicaciones". */
  personId?: number;
  /** Perfil propio: la persona es quien registra su ORCID (aviso en la pestaña). */
  isOwnProfile?: boolean;
  /** Lleva a la pestaña Personal, donde se edita el perfil de investigador. */
  onGoToPersonal?: () => void;
}

export function PublicationsTab({ publications: allPublications, onEdit, onDelete, personIdCard, personId, isOwnProfile = false, onGoToPersonal }: PublicationsTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  // Solo se ocultan las rechazadas; las "en revisión" se ven (con su insignia) aunque todavía no cuenten en el contador.
  const isRejected = (p: Publication) => p.approvalStatus === "RECHAZADA";
  const rejectedCount = allPublications.filter(isRejected).length;
  const publications = showRejected ? allPublications : allPublications.filter((p) => !isRejected(p));
  const countedTotal = allPublications.filter((p) => publicationCounts(p)).length;
  const reviewCount = allPublications.filter((p) => isPendingReview(p)).length;
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return clockFormatDate(dateString, "es-EC", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const resolveId = (pub: Publication): number =>
    (pub as any).publicationId ?? (pub as any).id ?? 0;

  const sortOptions: CvSortOption<Publication>[] = [
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

  // DOI repetido: el mismo DOI normalizado en más de una publicación de la persona (probable carga duplicada).
  const repeatedDois = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of publications) {
      const n = normalizeDoi(p.doi);
      if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([doi]) => doi));
  }, [publications]);

  const filterFields: CvFilterField<Publication>[] = [
    {
      key: "type",
      label: "Tipo de publicación",
      options: buildFilterOptions(publications.map((p) => p.publicationTypeName)),
      getValue: (p) => p.publicationTypeName,
    },
    {
      key: "doi",
      label: "DOI",
      options: [
        { value: "con", label: "Con DOI válido" },
        { value: "sin", label: "Sin DOI" },
        { value: "invalido", label: "DOI no válido (enlace u otro dato)" },
      ],
      getValue: (p) => (normalizeDoi(p.doi) ? "con" : p.doi?.trim() ? "invalido" : "sin"),
    },
    {
      key: "doiRepeated",
      label: "DOI repetido",
      options: [
        { value: "si", label: "Repetido en otra publicación" },
        { value: "no", label: "Único" },
      ],
      getValue: (p) => {
        const n = normalizeDoi(p.doi);
        return n ? (repeatedDois.has(n) ? "si" : "no") : null;
      },
    },
  ];

  const list = useCvListState({
    items: publications,
    searchText: (p) => `${p.title ?? ""} ${p.journalName ?? ""} ${p.location ?? ""} ${doiSearchText(p.doi)}`,
    sortOptions,
    defaultSort: "date_desc",
    filterFields,
  });

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg sm:text-xl">
            Publicaciones
            <Badge variant="outline" className="ml-2">
              {countedTotal}
            </Badge>
            {reviewCount > 0 && (
              <Badge variant="outline" className="ml-1 text-xs font-normal">
                {reviewCount} en revisión
              </Badge>
            )}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {personId ? (
            <Button size="sm" variant="outline" onClick={() => setSyncOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar publicaciones
            </Button>
          ) : null}
          <Button size="sm" onClick={() => onEdit("publication", null)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva publicación
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {personId ? <OrcidRequiredGate personId={personId} isOwnProfile={isOwnProfile} /> : null}
        {personId ? <ResearcherOrcidLine personId={personId} onGoToPersonal={onGoToPersonal} /> : null}
        {rejectedCount > 0 && (
          <label className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={showRejected} onChange={(e) => setShowRejected(e.target.checked)} />
            Mostrar {rejectedCount} rechazada(s)
          </label>
        )}
        {publications.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No hay publicaciones registradas. Usa el botón
            <span className="font-semibold"> "Nueva publicación" </span>
            para agregar una.
          </div>
        ) : (
          <>
            <CvListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Buscar por título, revista, lugar o DOI..."
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
                No se encontraron publicaciones con ese criterio.
              </div>
            ) : (
              <div className="space-y-2">
            {list.paginatedItems.map((publication) => (
              <Card
                key={resolveId(publication)}
                className="border-l-4 border-l-primary/60"
              >
                <CardContent className="p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">
                          {publication.title || "Título no especificado"}
                        </h3>
                        {publication.publicationTypeName && (
                          <Badge variant="outline" className="text-xs">
                            {publication.publicationTypeName}
                          </Badge>
                        )}
                        <PublicationStatusBadge publication={publication} />
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {publication.journalName && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            <span>{publication.journalName}</span>
                          </div>
                        )}
                        {publication.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{publication.location}</span>
                          </div>
                        )}
                        {publication.publicationDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(publication.publicationDate)}</span>
                          </div>
                        )}
                        {publication.doi && (
                          <div className="flex items-center gap-1">
                            {doiUrl(publication.doi) ? (
                              <a
                                href={doiUrl(publication.doi)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline break-all"
                                onClick={(e) => e.stopPropagation()}
                              >
                                DOI: {publication.doi}
                              </a>
                            ) : (
                              <span>DOI: {publication.doi}</span>
                            )}
                            {normalizeDoi(publication.doi) && repeatedDois.has(normalizeDoi(publication.doi)!) && (
                              <Badge variant="outline" className="ml-1 text-[10px] font-normal text-amber-600 border-amber-300">
                                DOI repetido
                              </Badge>
                            )}
                          </div>
                        )}
                        {publication.link && (
                          <a
                            href={publication.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <LinkIcon className="h-3 w-3" />
                            <span>Enlace</span>
                          </a>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs -ml-2 h-7"
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
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <ActionIconButton
                        icon={Edit}
                        label={isPublicationLocked(publication) ? lockedMessage(publication.approvalStatus) : "Editar publicación"}
                        tone="primary"
                        onClick={() => onEdit("publication", publication)}
                        disabled={isPublicationLocked(publication)}
                        touch
                      />
                      <ActionIconButton
                        icon={Trash2}
                        label={isPublicationLocked(publication) ? lockedMessage(publication.approvalStatus) : "Eliminar publicación"}
                        tone="destructive"
                        onClick={() => onDelete(resolveId(publication))}
                        disabled={resolveId(publication) === 0 || isPublicationLocked(publication)}
                        touch
                      />
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
      {personId ? <PublicationSyncDialog open={syncOpen} onOpenChange={setSyncOpen} personId={personId} /> : null}
    </Card>
  );
}
