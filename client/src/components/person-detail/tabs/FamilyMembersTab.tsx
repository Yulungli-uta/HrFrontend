// client/src/components/person-detail/tabs/FamilyMembersTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Edit, Trash2, Calendar, IdCard } from "lucide-react";
import { FamilyMember } from "@/types/person";

interface FamilyMembersTabProps {
  familyMembers: FamilyMember[];
  onEdit: (type: string, item: any) => void;
  onDelete: (id: number) => void;
}

export function FamilyMembersTab({ familyMembers, onEdit, onDelete }: FamilyMembersTabProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Mapeo de tipos de identificación
  const getIdentificationTypeLabel = (id: number) => {
    const types: Record<number, string> = {
      1: 'Cédula',
      2: 'Pasaporte',
      3: 'RUC',
      4: 'Otro',
      130: 'Cédula' // Si tu API usa 130 como cédula
    };
    return types[id] || `Tipo ${id}`;
  };

  // Mapeo de tipos de discapacidad
  const getDisabilityTypeLabel = (id?: number) => {
    if (!id) return 'No especificada';
    const types: Record<number, string> = {
      1: 'Física',
      2: 'Visual',
      3: 'Auditiva',
      4: 'Intelectual',
      5: 'Psicosocial',
      6: 'Múltiple'
    };
    return types[id] || `Tipo ${id}`;
  };

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
          className="bg-uta-blue hover:bg-uta-blue/90"
          onClick={() => onEdit('family', null)}
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
            <p className="text-sm">Agrega la primera carga familiar haciendo clic en el botón "Nueva Carga Familiar"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {familyMembers.map((member) => (
              <Card 
                key={`family-member-${member.burdenId}`} // ✅ Cambiado a burdenId
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground text-lg">
                          {member.firstName} {member.lastName}
                        </h4>
                        {member.relationship && (
                          <Badge variant="secondary" className="mt-1">
                            {member.relationship}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit('family', member)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(member.burdenId)} // ✅ Cambiado a burdenId
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground flex-1">
                      {member.identificationTypeId && member.dependentId && (
                        <div className="flex items-center gap-2">
                          <IdCard className="h-4 w-4 text-muted-foreground/70" />
                          <span>
                            <strong>{getIdentificationTypeLabel(member.identificationTypeId)}:</strong> {member.dependentId}
                          </span>
                        </div>
                      )}

                      {member.birthDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground/70" />
                          <span>
                            <strong>Nacimiento:</strong> {formatDate(member.birthDate)} 
                            <span className="text-muted-foreground ml-1">
                              ({calculateAge(member.birthDate)} años)
                            </span>
                          </span>
                        </div>
                      )}

                      {member.hasDisability && (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            Discapacidad
                          </Badge>
                          {member.disabilityTypeId && (
                            <span className="text-xs text-muted-foreground">
                              {getDisabilityTypeLabel(member.disabilityTypeId)}
                              {member.disabilityPercentage && ` (${member.disabilityPercentage}%)`}
                            </span>
                          )}
                        </div>
                      )}

                      {member.isStudying && (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">
                            Estudiante
                          </Badge>
                          {member.educationInstitution && (
                            <span className="text-xs text-muted-foreground truncate">
                              {member.educationInstitution}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}