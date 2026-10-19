// pages/PunchControl.tsx
// "Control de picadas": redes del campus, picada externa por empleado y registro.
// La UI solo administra; quien decide si una picada se acepta es el backend.
import { ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth";
import { useActionPermission } from "@/hooks/useActionPermission";
import { ACTION_PERMISSIONS } from "@/features/actionPermissions";
import PunchSummary from "@/components/punchPolicy/PunchSummary";
import PunchNetworksTab from "@/components/punchPolicy/PunchNetworksTab";
import ExternalPunchTab from "@/components/punchPolicy/ExternalPunchTab";
import PunchAccessLogTab from "@/components/punchPolicy/PunchAccessLogTab";

export default function PunchControlPage() {
  const { can } = useActionPermission();
  const { user } = useAuth();
  // Si el servicio de autenticación no entrega la lista de permisos de acción (sesiones antiguas o servicios que aún
  // no la devuelven), no se esconden los controles: el backend exige los permisos de todas formas (403 con mensaje).
  const permissionsLoaded = Array.isArray(user?.actionPermissions);
  // Lista de IP y modo: DITIC y administradores técnicos. Autorización por empleado: administradores y RRHH.
  const canManageNetworks = permissionsLoaded ? can(ACTION_PERMISSIONS.PUNCH_NETWORK_MANAGE) : true;
  const canManagePolicies = permissionsLoaded ? can(ACTION_PERMISSIONS.PUNCH_POLICY_MANAGE) : true;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="page-title">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" /> Control de picadas
        </h1>
        <p className="page-subtitle">Dónde se puede registrar la asistencia</p>
      </div>

      <PunchSummary canManage={canManageNetworks} />

      <Tabs defaultValue="networks">
        <TabsList>
          <TabsTrigger value="networks">Redes del campus</TabsTrigger>
          <TabsTrigger value="external">Picada externa</TabsTrigger>
          <TabsTrigger value="log">Registro</TabsTrigger>
        </TabsList>
        <TabsContent value="networks" className="mt-4">
          <PunchNetworksTab canManage={canManageNetworks} />
        </TabsContent>
        <TabsContent value="external" className="mt-4">
          <ExternalPunchTab canManage={canManagePolicies} />
        </TabsContent>
        <TabsContent value="log" className="mt-4">
          <PunchAccessLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
