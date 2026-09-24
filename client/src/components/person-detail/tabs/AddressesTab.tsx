import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Edit, Trash2 } from "lucide-react";
import type { Address } from "@/types/person";
import { useCvListState, buildFilterOptions, type CvSortOption, type CvFilterField } from "@/hooks/personDetails/useCvListState";
import { CvListToolbar } from "@/components/person-detail/CvListToolbar";
import { CvFilterBar } from "@/components/person-detail/CvFilterBar";
import { DataPagination } from "@/components/ui/DataPagination";

interface AddressesTabProps {
  addresses: Address[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
  /** Mapa id → nombre para resolver el tipo de dirección desde ref_types */
  refTypesMap?: Record<number, string>;
  /** Mapas id → nombre para resolver país/provincia/cantón (PKs string, mismo patrón que WorkExperiencesTab/BooksTab) */
  countryMap?: Record<number, string>;
  provinceMap?: Record<number, string>;
  cantonMap?: Record<number, string>;
}

export function AddressesTab({
  addresses,
  onEdit,
  onDelete,
  refTypesMap = {},
  countryMap = {},
  provinceMap = {},
  cantonMap = {},
}: AddressesTabProps) {
  const sortOptions: CvSortOption<Address>[] = [
    {
      value: "street_asc",
      label: "Calle (A-Z)",
      compare: (a, b) => (a.mainStreet || "").localeCompare(b.mainStreet || ""),
    },
    {
      value: "type_asc",
      label: "Tipo de dirección",
      compare: (a, b) =>
        (refTypesMap[Number(a.addressTypeId)] || "").localeCompare(refTypesMap[Number(b.addressTypeId)] || ""),
    },
  ];

  const filterFields: CvFilterField<Address>[] = [
    {
      key: "type",
      label: "Tipo de dirección",
      options: buildFilterOptions(addresses.map((a) => refTypesMap[Number(a.addressTypeId)] ?? null)),
      getValue: (a) => refTypesMap[Number(a.addressTypeId)] ?? null,
    },
  ];

  const list = useCvListState({
    items: addresses,
    searchText: (a) =>
      `${a.mainStreet ?? ""} ${a.neighborhood ?? ""} ${a.parish ?? ""} ${refTypesMap[Number(a.addressTypeId)] ?? ""} ${countryMap[Number(a.countryId)] ?? ""} ${provinceMap[Number(a.provinceId)] ?? ""} ${cantonMap[Number(a.cantonId)] ?? ""}`,
    sortOptions,
    defaultSort: "street_asc",
    filterFields,
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-uta-blue" />
          <span>Direcciones</span>
          <Badge variant="outline" className="ml-1">
            {addresses.length}
          </Badge>
        </CardTitle>

        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => onEdit("address", null)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva dirección
        </Button>
      </CardHeader>

      <CardContent>
        {addresses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay direcciones registradas</p>
            <p className="text-sm">Agrega una dirección haciendo clic en &quot;Nueva dirección&quot;.</p>
          </div>
        ) : (
          <>
            <CvListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Buscar por calle, barrio o ubicación..."
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
                No se encontraron direcciones con ese criterio.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.paginatedItems.map((address) => {
              const typeName = refTypesMap[Number(address.addressTypeId)] ?? null;
              const countryName = countryMap[Number(address.countryId)] ?? null;
              const provinceName = provinceMap[Number(address.provinceId)] ?? null;
              const cantonName = cantonMap[Number(address.cantonId)] ?? null;

              return (
                <Card key={address.addressId} className="hover:shadow-md transition-shadow border-l-4 border-l-teal-500">
                  <CardContent className="p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-md bg-teal-500/10 shrink-0">
                          <MapPin className="h-4 w-4 text-teal-500" />
                        </div>
                        <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{address.mainStreet}</span>
                          {typeName && (
                            <Badge variant="secondary" className="text-xs">
                              {typeName}
                            </Badge>
                          )}
                        </div>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <ActionIconButton
                          icon={Edit}
                          label="Editar dirección"
                          tone="primary"
                          onClick={() => onEdit("address", address)}
                          touch
                        />
                        <ActionIconButton
                          icon={Trash2}
                          label="Eliminar dirección"
                          tone="destructive"
                          onClick={() => onDelete(address.addressId)}
                          touch
                        />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {(countryName || provinceName || cantonName) && (
                        <p>
                          {[cantonName, provinceName, countryName].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <p className="flex flex-wrap gap-x-2">
                        {address.parish && <span>Parroquia: {address.parish}</span>}
                        {address.neighborhood && <span>Barrio: {address.neighborhood}</span>}
                        {address.secondaryStreet && <span>Calle sec.: {address.secondaryStreet}</span>}
                        {address.houseNumber && <span>N.°: {address.houseNumber}</span>}
                      </p>
                      {address.reference && <p className="italic">Ref: {address.reference}</p>}
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
