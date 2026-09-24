import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, Edit, Trash2, MapPin, User, IdCard } from "lucide-react";
import type { EmergencyContact } from "@/types/person";
import { useCvListState, buildFilterOptions, type CvSortOption, type CvFilterField } from "@/hooks/personDetails/useCvListState";
import { CvListToolbar } from "@/components/person-detail/CvListToolbar";
import { CvFilterBar } from "@/components/person-detail/CvFilterBar";
import { DataPagination } from "@/components/ui/DataPagination";

interface EmergencyContactsTabProps {
  emergencyContacts: EmergencyContact[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver tipo de relación desde ref_types */
  refTypesMap?: Record<number, string>;
}

export function EmergencyContactsTab({
  emergencyContacts,
  onEdit,
  onDelete,
  refTypesMap = {},
}: EmergencyContactsTabProps) {
  const resolveId = (contact: EmergencyContact | any): number =>
    contact.contactId ?? contact.emergencyContactId ?? 0;

  const resolveRelationship = (contact: any): string | null => {
    const typeId = contact.relationshipTypeId ?? contact.relationshipType ?? null;
    if (!typeId) return contact.relationship ?? null;
    if (typeof typeId === "number" || !isNaN(Number(typeId))) {
      return refTypesMap[Number(typeId)] ?? contact.relationship ?? null;
    }
    return String(typeId);
  };

  const sortOptions: CvSortOption<EmergencyContact>[] = [
    {
      value: "name_asc",
      label: "Nombre (A-Z)",
      compare: (a: any, b: any) =>
        `${a.firstName ?? ""} ${a.lastName ?? ""}`.localeCompare(`${b.firstName ?? ""} ${b.lastName ?? ""}`),
    },
    {
      value: "name_desc",
      label: "Nombre (Z-A)",
      compare: (a: any, b: any) =>
        `${b.firstName ?? ""} ${b.lastName ?? ""}`.localeCompare(`${a.firstName ?? ""} ${a.lastName ?? ""}`),
    },
  ];

  const filterFields: CvFilterField<EmergencyContact>[] = [
    {
      key: "relationship",
      label: "Parentesco",
      options: buildFilterOptions(emergencyContacts.map((c) => resolveRelationship(c))),
      getValue: (c) => resolveRelationship(c),
    },
  ];

  const list = useCvListState({
    items: emergencyContacts,
    searchText: (c: any) => `${c.firstName ?? ""} ${c.lastName ?? ""} ${resolveRelationship(c) ?? ""} ${c.phone ?? ""} ${c.mobile ?? ""}`,
    sortOptions,
    defaultSort: "name_asc",
    filterFields,
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-uta-blue" />
          <span>Contactos de Emergencia</span>
          <Badge variant="outline" className="ml-1">
            {emergencyContacts.length}
          </Badge>
        </CardTitle>

        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={() => onEdit("emergency", null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo contacto
        </Button>
      </CardHeader>

      <CardContent>
        {emergencyContacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay contactos registrados</p>
            <p className="text-sm">
              Agrega un contacto de emergencia haciendo clic en &quot;Nuevo contacto&quot;.
            </p>
          </div>
        ) : (
          <>
            <CvListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Buscar por nombre, parentesco o teléfono..."
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
                No se encontraron contactos con ese criterio.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.paginatedItems.map((contact, index) => {
              const relationship = resolveRelationship(contact);
              return (
                <Card
                  key={resolveId(contact) || index}
                  className="hover:shadow-md transition-shadow border-l-4 border-l-warning"
                >
                  <CardContent className="p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-md bg-warning/10 shrink-0">
                          <Phone className="h-4 w-4 text-warning" />
                        </div>
                        <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {contact.firstName} {contact.lastName}
                          </span>
                          {relationship && (
                            <Badge variant="secondary" className="text-xs">
                              {relationship}
                            </Badge>
                          )}
                        </div>
                        {(contact as any).identification && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <IdCard className="h-3 w-3" />
                            <span>
                              {contact.identificationTypeId
                                ? `${refTypesMap[Number(contact.identificationTypeId)] ?? "ID"}: `
                                : ""}
                              {(contact as any).identification}
                            </span>
                          </div>
                        )}
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <ActionIconButton
                          icon={Edit}
                          label="Editar contacto"
                          tone="primary"
                          onClick={() => onEdit("emergency", contact)}
                          touch
                        />
                        <ActionIconButton
                          icon={Trash2}
                          label="Eliminar contacto"
                          tone="destructive"
                          onClick={() => onDelete(resolveId(contact))}
                          disabled={resolveId(contact) === 0}
                          touch
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {contact.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>Tel: {contact.phone}</span>
                        </div>
                      )}
                      {contact.mobile && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>Móvil: {contact.mobile}</span>
                        </div>
                      )}
                      {contact.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{contact.address}</span>
                        </div>
                      )}
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
