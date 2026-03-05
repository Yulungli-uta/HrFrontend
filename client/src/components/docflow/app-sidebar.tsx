import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  FolderTree,
  FileStack,
  FileUp,
  RotateCcw,
  Settings,
  Layers,
  Settings2,
  Search,
  SearchCheck,
} from "lucide-react";
import { NotificationBell } from "@/components/docflow/notification-bell";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Panel", url: "/", icon: LayoutDashboard },
  { title: "Procesos", url: "/procesos", icon: FolderTree },
  { title: "Expedientes", url: "/expedientes", icon: FileStack },
  { title: "Por Proceso", url: "/procesos/all/expedientes", icon: Layers },
  { title: "Buscar Expedientes", url: "/buscar-expedientes", icon: Search },
  { title: "Busqueda General", url: "/busqueda", icon: SearchCheck },
];

const toolItems = [
  { title: "Nuevo Expediente", url: "/expedientes/nuevo", icon: FileUp },
  { title: "Campos Dinamicos", url: "/campos-dinamicos", icon: Settings2 },
  { title: "Auditoria de Retornos", url: "/auditoria", icon: RotateCcw },
];

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <FileStack className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground" data-testid="text-app-title">
                DocFlow
              </span>
              <span className="text-xs text-muted-foreground">
                Gestion Documental
              </span>
            </div>
          </div>
          <NotificationBell />
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegacion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Herramientas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`link-tool-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Settings className="h-3 w-3" />
          <span>DocFlow v1.0</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
