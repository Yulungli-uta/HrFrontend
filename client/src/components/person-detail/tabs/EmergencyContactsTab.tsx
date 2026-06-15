import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, Edit, Trash2, MapPin, User, IdCard } from "lucide-react";
import type { EmergencyContact } from "@/types/person";

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyContacts.map((contact, index) => {
              const relationship = resolveRelationship(contact);
              return (
                <Card
                  key={resolveId(contact) || index}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base">
                            {contact.firstName} {contact.lastName}
                          </span>
                          {relationship && (
                            <Badge variant="secondary" className="text-xs">
                              {relationship}
                            </Badge>
                          )}
                        </div>
                        {(contact as any).identification && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <IdCard className="h-3 w-3" />
                            <span>{(contact as any).identification}</span>
                          </div>
                        )}
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

                    <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>Tel: {contact.phone}</span>
                        </div>
                      )}
                      {contact.mobile && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>Móvil: {contact.mobile}</span>
                        </div>
                      )}
                      {contact.address && (
                        <div className="flex items-center gap-2">
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
      </CardContent>
    </Card>
  );
}
