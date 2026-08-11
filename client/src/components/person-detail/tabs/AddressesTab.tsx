import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Edit, Trash2 } from "lucide-react";
import type { Address } from "@/types/person";

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => {
              const typeName = refTypesMap[Number(address.addressTypeId)] ?? null;
              const countryName = countryMap[Number(address.countryId)] ?? null;
              const provinceName = provinceMap[Number(address.provinceId)] ?? null;
              const cantonName = cantonMap[Number(address.cantonId)] ?? null;

              return (
                <Card key={address.addressId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base">{address.mainStreet}</span>
                          {typeName && (
                            <Badge variant="secondary" className="text-xs">
                              {typeName}
                            </Badge>
                          )}
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

                    <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                      {(countryName || provinceName || cantonName) && (
                        <p>
                          {[cantonName, provinceName, countryName].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {address.parish && <p>Parroquia: {address.parish}</p>}
                      {address.neighborhood && <p>Barrio: {address.neighborhood}</p>}
                      {address.secondaryStreet && <p>Calle secundaria: {address.secondaryStreet}</p>}
                      {address.houseNumber && <p>N.°: {address.houseNumber}</p>}
                      {address.reference && <p className="italic">Ref: {address.reference}</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
