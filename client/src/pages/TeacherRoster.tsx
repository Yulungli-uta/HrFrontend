import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TitularesTab } from "@/components/teacher-roster/TitularesTab";
import { NonTitularesTab } from "@/components/teacher-roster/NonTitularesTab";
import { useAuth } from "@/features/auth";
import { useActionPermission } from "@/hooks/useActionPermission";
import { ACTION_PERMISSIONS } from "@/features/actionPermissions";

type RosterTab = "titulares" | "no-titulares";

/**
 * Personal Docente: dos pestañas independientes (cada una con sus filtros, tarjetas y listado).
 * Ambas quedan montadas aunque una esté oculta, para conservar lo filtrado al cambiar de pestaña
 * y para que la etiqueta de cada una muestre su total.
 */
export default function TeacherRosterPage() {
  const { user } = useAuth();
  const { can } = useActionPermission();
  // Si la sesión no trae la lista de permisos de acción no se esconde la columna: el servidor solo entrega el RMU con permiso.
  const permissionsLoaded = Array.isArray(user?.actionPermissions);
  const showSalary = permissionsLoaded ? can(ACTION_PERMISSIONS.SALARY_HISTORY_READ) : true;

  const [tab, setTab] = useState<RosterTab>("titulares");
  const [titularesTotal, setTitularesTotal] = useState<number | undefined>(undefined);
  const [noTitularesTotal, setNoTitularesTotal] = useState<number | undefined>(undefined);

  return (
    <div className="container mx-auto p-4 lg:p-6">

      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          Personal Docente
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Docentes titulares (estructura docente vigente) y no titulares (contrato ocasional): dedicación, documento
          {showSalary ? " y remuneración" : ""}.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as RosterTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="titulares" className="gap-2">
            Titulares
            {titularesTotal != null && <Badge variant="secondary">{titularesTotal}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="no-titulares" className="gap-2">
            No titulares
            {noTitularesTotal != null && <Badge variant="secondary">{noTitularesTotal}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="titulares" forceMount className="mt-0 data-[state=inactive]:hidden">
          <TitularesTab onTotalChange={setTitularesTotal} />
        </TabsContent>
        <TabsContent value="no-titulares" forceMount className="mt-0 data-[state=inactive]:hidden">
          <NonTitularesTab showSalary={showSalary} onTotalChange={setNoTitularesTotal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
