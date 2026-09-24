import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Edit, Trash2, Calendar, Clock, Award, Monitor, Users2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Training } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import { TRAINING_CERTIFICATE_DIRECTORY_CODE, TRAINING_CERTIFICATE_ENTITY_TYPE } from "@/features/constants";
import { useCvListState, buildFilterOptions, type CvSortOption, type CvFilterField } from "@/hooks/personDetails/useCvListState";
import { CvListToolbar } from "@/components/person-detail/CvListToolbar";
import { CvFilterBar } from "@/components/person-detail/CvFilterBar";
import { DataPagination } from "@/components/ui/DataPagination";

interface TrainingsTabProps {
  trainings: Training[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver certificateTypeId y otros ref_types */
  refTypesMap?: Record<number, string>;
  /** Identificación de la persona — agrupa su expediente completo en una sola carpeta. */
  personIdCard?: string;
}

type ModalityVariant = "default" | "secondary" | "outline";

export function TrainingsTab({ trainings, onEdit, onDelete, refTypesMap = {}, personIdCard }: TrainingsTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
    });
  };

  const resolveRefType = (id: number | string | null | undefined): string | null => {
    if (id == null || id === "" || id === 0 || id === "0") return null;
    const n = Number(id);
    if (!isNaN(n) && n > 0) return refTypesMap[n] ?? null;
    return String(id);
  };

  const getModalityMeta = (modality: string | number | null | undefined): { label: string; variant: ModalityVariant; icon: typeof Monitor } | null => {
    if (!modality) return null;
    const resolved = resolveRefType(modality) ?? String(modality);
    const lower = resolved.toLowerCase();
    if (lower.includes("virtual") || lower.includes("en línea") || lower.includes("online")) {
      return { label: resolved, variant: "secondary", icon: Monitor };
    }
    if (lower.includes("híbrido") || lower.includes("semipresencial")) {
      return { label: resolved, variant: "outline", icon: Users2 };
    }
    return { label: resolved, variant: "default", icon: Users2 };
  };

  const sortOptions: CvSortOption<Training>[] = [
    {
      value: "startDate_desc",
      label: "Más recientes primero",
      compare: (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    },
    {
      value: "startDate_asc",
      label: "Más antiguas primero",
      compare: (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    },
    {
      value: "title_asc",
      label: "Título (A-Z)",
      compare: (a, b) => (a.title || "").localeCompare(b.title || ""),
    },
  ];

  const filterFields: CvFilterField<Training>[] = [
    {
      key: "certType",
      label: "Tipo de certificado",
      options: buildFilterOptions(trainings.map((t) => resolveRefType(t.certificateTypeId))),
      getValue: (t) => resolveRefType(t.certificateTypeId),
    },
    {
      key: "hasCertificate",
      label: "Tiene certificado",
      options: [
        { value: "true", label: "Sí" },
        { value: "false", label: "No" },
      ],
      getValue: (t) => (Boolean((t as any).hasCertificate) ? "true" : "false"),
    },
  ];

  const list = useCvListState({
    items: trainings,
    searchText: (t) => `${t.title ?? ""} ${t.institution ?? ""}`,
    sortOptions,
    defaultSort: "startDate_desc",
    filterFields,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <GraduationCap className="mr-2 h-5 w-5" />
          Capacitaciones
          <Badge variant="outline" className="ml-2">
            {trainings.length}
          </Badge>
        </CardTitle>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={() => onEdit("training", null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Capacitación
        </Button>
      </CardHeader>

      <CardContent>
        {trainings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay capacitaciones registradas</p>
            <p className="text-sm">
              Agrega la primera capacitación haciendo clic en el botón "Nueva Capacitación"
            </p>
          </div>
        ) : (
          <>
            <CvListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Buscar por título o institución..."
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
                No se encontraron capacitaciones con ese criterio.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {list.paginatedItems.map((training) => {
                const trainingAny = training as any;
                const modalityMeta = getModalityMeta(trainingAny.modality);
                const hasCertificate = Boolean(trainingAny.hasCertificate);
                const certTypeName = resolveRefType(training.certificateTypeId);

                  return (
                    <Card key={training.trainingId} className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
                      <CardContent className="p-3">
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <div className="flex items-center justify-center h-8 w-8 rounded-md bg-purple-500/10 shrink-0">
                              <GraduationCap className="h-4 w-4 text-purple-500" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-foreground text-sm leading-tight mb-0.5">
                                {training.title}
                              </h4>
                              <p className="text-muted-foreground text-xs truncate">
                                {training.institution}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <ActionIconButton
                              icon={Edit}
                              label="Editar capacitación"
                              tone="primary"
                              onClick={() => onEdit("training", training)}
                              touch
                            />
                            <ActionIconButton
                              icon={Trash2}
                              label="Eliminar capacitación"
                              tone="destructive"
                              onClick={() => onDelete(training.trainingId)}
                              touch
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 text-sm text-muted-foreground flex-1">
                          <div className="flex flex-wrap gap-1.5">
                            {certTypeName && (
                              <Badge variant="secondary" className="text-xs">
                                {certTypeName}
                              </Badge>
                            )}
                            {modalityMeta && (
                              <Badge variant={modalityMeta.variant} className="text-xs">
                                <modalityMeta.icon className="h-3 w-3 mr-1" />
                                {modalityMeta.label}
                              </Badge>
                            )}
                            {hasCertificate && (
                              <Badge variant="default" className="text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                Certificado
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span>
                                {formatDate(training.startDate)}
                                {" — "}
                                {training.endDate
                                  ? formatDate(training.endDate)
                                  : "No especificado"}
                              </span>
                            </div>
                            {!!training.hours && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span>{training.hours} horas</span>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="self-start text-xs -ml-2 h-7"
                            onClick={() =>
                              setExpandedId(expandedId === training.trainingId ? null : training.trainingId)
                            }
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Certificado
                            {expandedId === training.trainingId ? (
                              <ChevronUp className="h-3.5 w-3.5 ml-1" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 ml-1" />
                            )}
                          </Button>

                          {expandedId === training.trainingId && (
                            <ReusableDocumentManager
                              directoryCode={TRAINING_CERTIFICATE_DIRECTORY_CODE}
                              entityType={TRAINING_CERTIFICATE_ENTITY_TYPE}
                              entityId={training.trainingId}
                              relativePath={personIdCard ? `${personIdCard}/${TRAINING_CERTIFICATE_ENTITY_TYPE.toLowerCase()}` : undefined}
                              accept=".pdf,.jpg,.jpeg,.png"
                              maxSizeMB={10}
                              label="Certificado de capacitación"
                              entityReady={true}
                              allowReplace
                              documentType={{ enabled: true, category: "CV_DOCUMENT_TYPE", label: "Tipo de documento" }}
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
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
