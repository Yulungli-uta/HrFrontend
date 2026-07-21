import { Settings, KeyRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoleMenuItemsPage from "@/pages/admin/RoleMenuItems";
import RoleActionPermissionsPage from "@/pages/admin/RoleActionPermissions";

/**
 * "Editor de Rol" — unifica en pestañas la asignación de menús (visibilidad
 * de UI) y la asignación de permisos de acción ("MODULO.ACCION", control
 * real que aplica el backend). Son cosas distintas: menús solo controlan qué
 * ve el usuario en el sidebar, permisos de acción controlan qué puede hacer.
 *
 * Cada pestaña reutiliza la página existente tal cual (no se duplicó lógica
 * ni se modificó `RoleMenuItems.tsx`, que sigue funcionando como página
 * independiente en /admin/role-menu-items). Cada pestaña tiene su propio
 * selector de rol — no comparten selección entre sí.
 */
export default function RoleEditorPage() {
  return (
    <div className="container mx-auto p-6 pb-0">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-foreground">Editor de Rol</h1>
        <p className="text-muted-foreground mt-2">
          Configure en un solo lugar qué ve (menús) y qué puede hacer (permisos de acción) cada rol
        </p>
      </div>

      <Tabs defaultValue="menus" className="mt-4">
        <TabsList>
          <TabsTrigger value="menus" className="gap-2">
            <Settings className="h-4 w-4" />
            Menús
          </TabsTrigger>
          <TabsTrigger value="permisos" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Permisos de Acción
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menus" className="mt-0">
          <div className="-mx-6">
            <RoleMenuItemsPage />
          </div>
        </TabsContent>

        <TabsContent value="permisos" className="mt-0">
          <div className="-mx-6">
            <RoleActionPermissionsPage />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
