import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, Edit, Trash2, Calendar, MapPin, Globe, Building2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { WorkExperience } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import { WORK_EXPERIENCE_CERTIFICATE_DIRECTORY_CODE, WORK_EXPERIENCE_CERTIFICATE_ENTITY_TYPE } from "@/features/constants";
import { useCvListState, buildFilterOptions, type CvSortOption, type CvFilterField } from "@/hooks/personDetails/useCvListState";
import { CvListToolbar } from "@/components/person-detail/CvListToolbar";
import { CvFilterBar } from "@/components/person-detail/CvFilterBar";
import { DataPagination } from "@/components/ui/DataPagination";

interface WorkExperiencesTabProps {
  workExperiences: WorkExperience[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver cualquier ref_type (institutionTypeId, experienceTypeId…) */
  refTypesMap?: Record<number, string>;
  /** Mapa id → nombre de país */
  countryMap?: Record<number, string>;
  /** Identificación de la persona — agrupa su expediente completo en una sola carpeta. */
  personIdCard?: string;
}

export function WorkExperiencesTab({
  workExperiences,
  onEdit,
  onDelete,
  refTypesMap = {},
  countryMap = {},
  personIdCard,
}: WorkExperiencesTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "short",
    });
  };

  const calculateDuration = (startDate: string, endDate: string | null, isCurrent: boolean) => {
    const start = new Date(startDate);
    const end = isCurrent ? new Date() : new Date(endDate!);
    let totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (totalMonths < 0) totalMonths = 0;

    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    if (y === 0 && m === 0) return "Menos de 1 mes";

    const parts: string[] = [];
    if (y > 0) parts.push(`${y} año${y > 1 ? "s" : ""}`);
    if (m > 0) parts.push(`${m} mes${m > 1 ? "es" : ""}`);
    return parts.join(" ");
  };

  const resolveName = (id: number | undefined | null, map: Record<number, string>): string | null => {
    if (!id) return null;
    return map[Number(id)] ?? null;
  };

  const sortOptions: CvSortOption<WorkExperience>[] = [
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
      value: "position_asc",
      label: "Cargo (A-Z)",
      compare: (a, b) => (a.position || "").localeCompare(b.position || ""),
    },
  ];

  const filterFields: CvFilterField<WorkExperience>[] = [
    {
      key: "institutionType",
      label: "Tipo de institución",
      options: buildFilterOptions(workExperiences.map((e) => resolveName((e as any).institutionTypeId, refTypesMap))),
      getValue: (e) => resolveName((e as any).institutionTypeId, refTypesMap),
    },
    {
      key: "status",
      label: "Estado",
      options: [
        { value: "current", label: "Actual" },
        { value: "finished", label: "Finalizada" },
      ],
      getValue: (e) => (e.isCurrent ? "current" : "finished"),
    },
  ];

  const list = useCvListState({
    items: workExperiences,
    searchText: (e) => `${e.position ?? ""} ${e.company ?? ""}`,
    sortOptions,
    defaultSort: "startDate_desc",
    filterFields,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <Briefcase className="mr-2 h-5 w-5" />
          Experiencia Laboral
          <Badge variant="outline" className="ml-2">
            {workExperiences.length}
          </Badge>
        </CardTitle>

        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={() => onEdit("experience", null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Experiencia
        </Button>
      </CardHeader>

      <CardContent>
        {workExperiences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay experiencias laborales registradas</p>
            <p className="text-sm">
              Agrega la primera experiencia haciendo clic en "Nueva Experiencia"
            </p>
          </div>
        ) : (
          <>
            <CvListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Buscar por cargo o empresa..."
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
                No se encontraron experiencias laborales con ese criterio.
              </div>
            ) : (
              <div className="space-y-2">
            {list.paginatedItems.map((experience, index) => {
                const experienceId =
                  (experience as any).workExpId ?? (experience as any).id ?? null;

                const countryName = resolveName(experience.countryId as any, countryMap);
                const institutionTypeName = resolveName(
                  (experience as any).institutionTypeId,
                  refTypesMap
                );
                const experienceTypeName = resolveName(
                  (experience as any).experienceTypeId,
                  refTypesMap
                );

                return (
                  <Card
                    key={experienceId ?? `experience-${index}`}
                    className="hover:shadow-md transition-shadow border-l-4 border-l-uta-orange"
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-uta-orange/10 shrink-0">
                                <Briefcase className="h-4 w-4 text-uta-orange" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-foreground text-sm">
                                  {experience.position}
                                </h4>
                                <p className="text-muted-foreground text-xs mt-0.5">
                                  {experience.company}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <ActionIconButton
                                icon={Edit}
                                label="Editar experiencia"
                                tone="primary"
                                onClick={() => onEdit("experience", experience)}
                                touch
                              />
                              <ActionIconButton
                                icon={Trash2}
                                label="Eliminar experiencia"
                                tone="destructive"
                                onClick={() => { if (experienceId != null) onDelete(experienceId); }}
                                disabled={experienceId == null}
                                touch
                              />
                            </div>
                          </div>

                          {/* Badges + fechas + duración en una sola línea */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span>
                                {formatDate(experience.startDate)} —{" "}
                                {experience.isCurrent ? (
                                  <Badge variant="default" className="ml-1">Actual</Badge>
                                ) : experience.endDate ? (
                                  formatDate(experience.endDate)
                                ) : (
                                  "No especificada"
                                )}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {calculateDuration(
                                experience.startDate,
                                experience.endDate || null,
                                experience.isCurrent
                              )}
                            </Badge>
                            {institutionTypeName && (
                              <Badge variant="secondary" className="text-xs">
                                <Building2 className="h-3 w-3 mr-1" />
                                {institutionTypeName}
                              </Badge>
                            )}
                            {experienceTypeName && (
                              <Badge variant="outline" className="text-xs">
                                {experienceTypeName}
                              </Badge>
                            )}
                          </div>

                          {/* Dirección + país */}
                          {(experience.institutionAddress || countryName) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {experience.institutionAddress && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                  <span className="truncate">{experience.institutionAddress}</span>
                                </div>
                              )}
                              {countryName && (
                                <div className="flex items-center gap-1">
                                  <Globe className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                  <span>{countryName}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Razones */}
                          {(experience.entryReason || experience.exitReason) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {experience.entryReason && (
                                <div>
                                  <p className="font-medium text-muted-foreground">Razón de entrada:</p>
                                  <p className="text-foreground line-clamp-2">{experience.entryReason}</p>
                                </div>
                              )}
                              {experience.exitReason && (
                                <div>
                                  <p className="font-medium text-muted-foreground">Razón de salida:</p>
                                  <p className="text-foreground line-clamp-2">{experience.exitReason}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {experienceId != null && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="self-start text-xs -ml-2 h-7"
                                onClick={() => setExpandedId(expandedId === experienceId ? null : experienceId)}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                Certificado laboral
                                {expandedId === experienceId ? (
                                  <ChevronUp className="h-3.5 w-3.5 ml-1" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                                )}
                              </Button>

                              {expandedId === experienceId && (
                                <ReusableDocumentManager
                                  directoryCode={WORK_EXPERIENCE_CERTIFICATE_DIRECTORY_CODE}
                                  entityType={WORK_EXPERIENCE_CERTIFICATE_ENTITY_TYPE}
                                  entityId={experienceId}
                                  relativePath={personIdCard ? `${personIdCard}/${WORK_EXPERIENCE_CERTIFICATE_ENTITY_TYPE.toLowerCase()}` : undefined}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  maxSizeMB={10}
                                  label="Certificado de experiencia laboral"
                                  entityReady={true}
                                  allowReplace
                                  documentType={{ enabled: true, category: "CV_DOCUMENT_TYPE", label: "Tipo de documento" }}
                                />
                              )}
                            </>
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
