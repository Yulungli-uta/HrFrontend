import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { EducationLevel } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import { SenescytSyncDialog } from "@/components/person-detail/SenescytSyncDialog";
import { EDUCATION_CERTIFICATE_DIRECTORY_CODE, EDUCATION_CERTIFICATE_ENTITY_TYPE } from "@/features/constants";
import { useCvListState, buildFilterOptions, type CvSortOption, type CvFilterField } from "@/hooks/personDetails/useCvListState";
import { CvListToolbar } from "@/components/person-detail/CvListToolbar";
import { CvFilterBar } from "@/components/person-detail/CvFilterBar";
import { DataPagination } from "@/components/ui/DataPagination";

interface EducationLevelsTabProps {
  educationLevels: EducationLevel[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver educationLevelTypeId */
  refTypesMap?: Record<number, string>;
  /** Mapa id → nombre de institución */
  institutionMap?: Record<number, string>;
  /** Identificación de la persona — agrupa su expediente completo en una sola carpeta. */
  personIdCard?: string;
  /** Requerido para el botón "Sincronizar" (consulta/crea títulos vía DINARDAP). */
  personId?: number;
}

export function EducationLevelsTab({
  educationLevels,
  onEdit,
  onDelete,
  refTypesMap = {},
  institutionMap = {},
  personIdCard,
  personId,
}: EducationLevelsTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("es-EC", { year: "numeric", month: "long" });
  };

  const resolveName = (id: number | undefined | null, map: Record<number, string>): string | null => {
    if (!id) return null;
    return map[Number(id)] ?? null;
  };

  const sortOptions: CvSortOption<EducationLevel>[] = [
    {
      value: "startDate_desc",
      label: "Más recientes primero",
      compare: (a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime(),
    },
    {
      value: "startDate_asc",
      label: "Más antiguas primero",
      compare: (a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime(),
    },
    {
      value: "title_asc",
      label: "Título (A-Z)",
      compare: (a, b) => (a.title || "").localeCompare(b.title || ""),
    },
  ];

  const filterFields: CvFilterField<EducationLevel>[] = [
    {
      key: "level",
      label: "Nivel",
      options: buildFilterOptions(educationLevels.map((edu) => resolveName(edu.educationLevelTypeId, refTypesMap))),
      getValue: (edu) => resolveName(edu.educationLevelTypeId, refTypesMap),
    },
    {
      key: "source",
      label: "Origen",
      options: [
        { value: "Dinardap", label: "Sincronizado con SENESCYT" },
        { value: "Manual", label: "Ingresado manualmente" },
      ],
      getValue: (edu) => (edu.source === "Dinardap" ? "Dinardap" : "Manual"),
    },
  ];

  const list = useCvListState({
    items: educationLevels,
    searchText: (edu) =>
      `${edu.title ?? ""} ${edu.specialty ?? ""} ${edu.institutionNameOriginal ?? ""} ${resolveName(edu.institutionId, institutionMap) ?? ""}`,
    sortOptions,
    defaultSort: "startDate_desc",
    filterFields,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <GraduationCap className="mr-2 h-5 w-5" />
          Formación Académica
          <Badge variant="outline" className="ml-2">
            {educationLevels.length}
          </Badge>
        </CardTitle>

        <div className="flex gap-2">
          {personId != null && (
            <Button size="sm" variant="outline" onClick={() => setSyncDialogOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar
            </Button>
          )}
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => onEdit("educationLevel", null)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Formación
          </Button>
        </div>
      </CardHeader>

      {personId != null && (
        <SenescytSyncDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen} personId={personId} />
      )}

      <CardContent>
        {educationLevels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay formación académica registrada</p>
            <p className="text-sm">
              Agrega títulos, maestrías o doctorados haciendo clic en "Nueva Formación"
            </p>
          </div>
        ) : (
          <>
            <CvListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Buscar por título, especialidad o institución..."
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
                No se encontró formación académica con ese criterio.
              </div>
            ) : (
              <div className="space-y-2">
            {list.paginatedItems.map((edu) => {
                const levelName = resolveName(edu.educationLevelTypeId, refTypesMap);
                // Fallback al nombre libre de DINARDAP cuando la institución no está catalogada.
                const institutionName = resolveName(edu.institutionId, institutionMap) ?? edu.institutionNameOriginal;
                const isExpanded = expandedId === edu.educationId;

                return (
                  <Card key={edu.educationId} className="hover:shadow-md transition-shadow border-l-4 border-l-cyan-600">
                    <CardContent className="p-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-cyan-600/10 shrink-0">
                                <GraduationCap className="h-4 w-4 text-cyan-600" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-foreground text-sm">{edu.title}</h4>
                                {edu.specialty && (
                                  <p className="text-muted-foreground text-xs mt-0.5">{edu.specialty}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-1 shrink-0">
                              <ActionIconButton
                                icon={Edit}
                                label="Editar formación académica"
                                tone="primary"
                                onClick={() => onEdit("educationLevel", edu)}
                                touch
                              />
                              <ActionIconButton
                                icon={Trash2}
                                label="Eliminar formación académica"
                                tone="destructive"
                                onClick={() => onDelete(edu.educationId)}
                                touch
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {levelName && (
                              <Badge variant="secondary" className="text-xs">
                                {levelName}
                              </Badge>
                            )}
                            {edu.grade && (
                              <Badge variant="outline" className="text-xs">
                                {edu.grade}
                              </Badge>
                            )}
                            {edu.source === "Dinardap" && (
                              <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Sincronizado con SENESCYT
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {institutionName && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                <span>{institutionName}</span>
                              </div>
                            )}

                            {(edu.startDate || edu.endDate) && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                <span>
                                  {formatDate(edu.startDate) ?? "No especificada"} —{" "}
                                  {formatDate(edu.endDate) ?? "No especificada"}
                                </span>
                              </div>
                            )}

                            {edu.senescytRegistrationNumber && (
                              <div className="flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                <span>SENESCYT: {edu.senescytRegistrationNumber}</span>
                              </div>
                            )}

                            {edu.score != null && (
                              <span>
                                <span className="font-medium">Puntaje:</span> {edu.score}
                              </span>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="self-start text-xs -ml-2 h-7"
                            onClick={() => setExpandedId(isExpanded ? null : edu.educationId)}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Título / certificado de respaldo
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 ml-1" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 ml-1" />
                            )}
                          </Button>

                          {isExpanded && (
                            <div className="mt-2">
                              <ReusableDocumentManager
                                directoryCode={EDUCATION_CERTIFICATE_DIRECTORY_CODE}
                                entityType={EDUCATION_CERTIFICATE_ENTITY_TYPE}
                                entityId={edu.educationId}
                                relativePath={personIdCard ? `${personIdCard}/${EDUCATION_CERTIFICATE_ENTITY_TYPE.toLowerCase()}` : undefined}
                                accept=".pdf,.jpg,.jpeg,.png"
                                maxSizeMB={10}
                                label="Título / certificado de respaldo"
                                entityReady={true}
                                allowReplace
                                documentType={{ enabled: true, category: "CV_DOCUMENT_TYPE", label: "Tipo de documento" }}
                              />
                            </div>
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
