import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Edit, Trash2, Calendar, IdCard, GraduationCap, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { FamilyMember } from "@/types/person";
import { ReusableDocumentManager } from "@/components/ReusableDocumentManager";
import { FAMILY_MEMBER_DOCUMENT_DIRECTORY_CODE, FAMILY_MEMBER_DOCUMENT_ENTITY_TYPE } from "@/features/constants";
import { useCvListState, buildFilterOptions, type CvSortOption, type CvFilterField } from "@/hooks/personDetails/useCvListState";
import { CvListToolbar } from "@/components/person-detail/CvListToolbar";
import { CvFilterBar } from "@/components/person-detail/CvFilterBar";
import { DataPagination } from "@/components/ui/DataPagination";

interface FamilyMembersTabProps {
  familyMembers: FamilyMember[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /**
   * Mapa id → nombre para resolver identificationType, disabilityType y cualquier otro ref_type.
   * (DIP: el componente depende de la abstracción, no del API directamente)
   */
  refTypesMap?: Record<number, string>;
  /** Identificación de la persona — agrupa su expediente completo en una sola carpeta. */
  personIdCard?: string;
}

export function FamilyMembersTab({
  familyMembers,
  onEdit,
  onDelete,
  refTypesMap = {},
  personIdCard,
}: FamilyMembersTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    return new Date(dateString).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const resolveRefType = (id: number | null | undefined): string | null => {
    if (!id) return null;
    return refTypesMap[Number(id)] ?? `Tipo ${id}`;
  };

  const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    REGISTRADO: "secondary",
    APROBADO: "default",
    RECHAZADO: "destructive",
  };
  const STATUS_LABEL: Record<string, string> = {
    REGISTRADO: "Pendiente",
    APROBADO: "Aprobado",
    RECHAZADO: "Rechazado",
  };

  const sortOptions: CvSortOption<FamilyMember>[] = [
    {
      value: "name_asc",
      label: "Nombre (A-Z)",
      compare: (a, b) => `${a.firstName ?? ""} ${a.lastName ?? ""}`.localeCompare(`${b.firstName ?? ""} ${b.lastName ?? ""}`),
    },
    {
      value: "birthDate_desc",
      label: "Más jóvenes primero",
      compare: (a, b) => new Date(b.birthDate ?? 0).getTime() - new Date(a.birthDate ?? 0).getTime(),
    },
    {
      value: "birthDate_asc",
      label: "Mayores primero",
      compare: (a, b) => new Date(a.birthDate ?? 0).getTime() - new Date(b.birthDate ?? 0).getTime(),
    },
  ];

  const getStatusName = (m: FamilyMember) => resolveRefType(m.statusTypeId) ?? "REGISTRADO";

  const filterFields: CvFilterField<FamilyMember>[] = [
    {
      key: "status",
      label: "Estado",
      options: [
        { value: "REGISTRADO", label: "Pendiente" },
        { value: "APROBADO", label: "Aprobado" },
        { value: "RECHAZADO", label: "Rechazado" },
      ],
      getValue: (m) => getStatusName(m),
    },
  ];

  const list = useCvListState({
    items: familyMembers,
    searchText: (m) => `${m.firstName ?? ""} ${m.lastName ?? ""}`,
    sortOptions,
    defaultSort: "name_asc",
    filterFields,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <Users className="mr-2 h-5 w-5" />
          Cargas Familiares
          <Badge variant="outline" className="ml-2">
            {familyMembers.length}
          </Badge>
        </CardTitle>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={() => onEdit("family", null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Carga Familiar
        </Button>
      </CardHeader>

      <CardContent>
        {familyMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay cargas familiares registradas</p>
            <p className="text-sm">
              Agrega la primera carga familiar haciendo clic en el botón "Nueva Carga Familiar"
            </p>
          </div>
        ) : (
          <>
            <CvListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Buscar por nombre..."
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
                No se encontraron cargas familiares con ese criterio.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {list.paginatedItems.map((member) => {
              const age = calculateAge(member.birthDate ?? "");
              const idTypeName = resolveRefType(member.identificationTypeId as any);
              const disabilityTypeName = resolveRefType(member.disabilityTypeId as any);
              const statusName = resolveRefType(member.statusTypeId) ?? "REGISTRADO";

              return (
                <Card
                  key={`family-member-${member.burdenId}`}
                  className="hover:shadow-md transition-shadow border-l-4 border-l-success"
                >
                  <CardContent className="p-3">
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="flex items-center justify-center h-8 w-8 rounded-md bg-success/10 shrink-0">
                            <Users className="h-4 w-4 text-success" />
                          </div>
                          <div className="min-w-0">
                          <h4 className="font-semibold text-foreground text-sm leading-tight">
                            {member.firstName} {member.lastName}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant={STATUS_BADGE_VARIANT[statusName] ?? "outline"} className="text-xs">
                              {STATUS_LABEL[statusName] ?? statusName}
                            </Badge>
                          </div>
                          {statusName === "RECHAZADO" && member.rejectionReason && (
                            <p className="text-xs text-destructive mt-1">Motivo: {member.rejectionReason}</p>
                          )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <ActionIconButton
                            icon={Edit}
                            label="Editar carga familiar"
                            tone="primary"
                            onClick={() => onEdit("family", member)}
                            touch
                          />
                          <ActionIconButton
                            icon={Trash2}
                            label="Eliminar carga familiar"
                            tone="destructive"
                            onClick={() => onDelete(member.burdenId)}
                            touch
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
                        {((member.identificationTypeId != null && member.dependentId) || member.birthDate) && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {member.identificationTypeId != null && member.dependentId && (
                              <div className="flex items-center gap-1">
                                <IdCard className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                <span>
                                  {idTypeName ?? "Identificación"}: {member.dependentId}
                                </span>
                              </div>
                            )}

                            {member.birthDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                <span>
                                  {formatDate(member.birthDate)}
                                  {age !== null && ` (${age} años)`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {member.hasDisability && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="destructive" className="text-xs">
                              Discapacidad
                            </Badge>
                            {disabilityTypeName && (
                              <span className="text-xs text-muted-foreground">
                                {disabilityTypeName}
                                {member.disabilityPercentage
                                  ? ` (${member.disabilityPercentage}%)`
                                  : ""}
                              </span>
                            )}
                          </div>
                        )}

                        {member.isStudying && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default" className="text-xs">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              Estudiante
                            </Badge>
                            {member.educationInstitution && (
                              <span className="text-xs text-muted-foreground truncate">
                                {member.educationInstitution}
                              </span>
                            )}
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="self-start text-xs -ml-2 h-7"
                          onClick={() =>
                            setExpandedId(expandedId === member.burdenId ? null : member.burdenId)
                          }
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Documento
                          {expandedId === member.burdenId ? (
                            <ChevronUp className="h-3.5 w-3.5 ml-1" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 ml-1" />
                          )}
                        </Button>

                        {expandedId === member.burdenId && (
                          <ReusableDocumentManager
                            directoryCode={FAMILY_MEMBER_DOCUMENT_DIRECTORY_CODE}
                            entityType={FAMILY_MEMBER_DOCUMENT_ENTITY_TYPE}
                            entityId={member.burdenId}
                            relativePath={personIdCard ? `${personIdCard}/${FAMILY_MEMBER_DOCUMENT_ENTITY_TYPE.toLowerCase()}` : undefined}
                            accept=".pdf,.jpg,.jpeg,.png"
                            maxSizeMB={10}
                            label="Partida de nacimiento u otro soporte"
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
