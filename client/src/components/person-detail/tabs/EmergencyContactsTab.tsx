// client/src/components/person-detail/tabs/EmergencyContactsTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, Edit, Trash2, MapPin, User, IdCard } from "lucide-react";
import type { EmergencyContact } from "@/types/person";

interface EmergencyContactsTabProps {
  emergencyContacts: EmergencyContact[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
}

export function EmergencyContactsTab({
  emergencyContacts,
  onEdit,
  onDelete,
}: EmergencyContactsTabProps) {
  const handleDelete = (contact: EmergencyContact | any) => {
    const id =
      (contact as any).contactId ??
      (contact as any).emergencyContactId ??
      0;
    onDelete(id);
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
          className="bg-uta-blue hover:bg-uta-blue/90"
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
          <ScrollArea className="h-[400px] pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emergencyContacts.map((contact, index) => (
                <Card
                  key={
                    (contact as any).contactId ??
                    (contact as any).emergencyContactId ??
                    index
                  }
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    {/* Cabecera: nombre + botones */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm sm:text-base">
                            {contact.firstName} {contact.lastName}
                          </span>
                        </div>
                        { (contact as any).identification && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <IdCard className="h-3 w-3" />
                            <span>
                              {(contact as any).identification}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => onEdit("emergency", contact)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(contact)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Datos de contacto */}
                    <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <span>Teléfono: {contact.phone}</span>
                      </div>
                      {contact.mobile && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          <span>Móvil: {contact.mobile}</span>
                        </div>
                      )}
                      {contact.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{contact.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
