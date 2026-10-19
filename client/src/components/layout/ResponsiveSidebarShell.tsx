// components/layout/ResponsiveSidebarShell.tsx
// En escritorio muestra el Sidebar fijo (expandido o colapsado); en pantallas pequeñas lo muestra como
// panel superpuesto (drawer) que se cierra al elegir una opción o con Esc. La lógica del menú sigue
// viviendo en Sidebar.tsx; este componente solo decide cómo se presenta.
import Sidebar from "@/components/Sidebar";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

interface ResponsiveSidebarShellProps {
  isDesktop: boolean;
  collapsed: boolean;
  onToggle: () => void;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  onLogout: () => void;
}

export default function ResponsiveSidebarShell({
  isDesktop,
  collapsed,
  onToggle,
  drawerOpen,
  onDrawerOpenChange,
  onLogout,
}: ResponsiveSidebarShellProps) {
  if (isDesktop) {
    return <Sidebar id="app-sidebar" onLogout={onLogout} collapsed={collapsed} onToggle={onToggle} />;
  }

  return (
    <Sheet open={drawerOpen} onOpenChange={onDrawerOpenChange}>
      <SheetContent
        side="left"
        className="w-[min(20rem,88vw)] max-w-none gap-0 p-0 sm:max-w-none"
      >
        <SheetTitle className="sr-only">Menú principal</SheetTitle>
        <SheetDescription className="sr-only">Navegación del sistema de talento humano</SheetDescription>
        <Sidebar
          id="app-sidebar"
          variant="drawer"
          onLogout={onLogout}
          collapsed={false}
          onToggle={() => onDrawerOpenChange(false)}
          onNavigate={() => onDrawerOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
