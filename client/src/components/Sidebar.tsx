// components/layout/Sidebar.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Users,
  LayoutDashboard,
  Clock,
  CalendarCheck,
  DollarSign,
  Building2,
  FileText,
  Settings,
  Calendar,
  ClipboardList,
  UserCog,
  Timer,
  LogOut,
  Folder,
  Bell,
  ShieldCheck,
  HardHat,
  ClipboardCheck,
  FileCheck,
  FileWarning,
  FileSignature,
  FileSearch,
  FileClock,
  FileSpreadsheet,
  FilePlus,
  User,
  Briefcase,
  BadgeCheck,
  Handshake,
  GraduationCap,
  BookOpen,
  PenSquare,
  Clipboard,
  AlarmClock,
  CalendarDays,
  CalendarX,
  CalendarPlus,
  CalendarSearch,
  CalendarClock,
  Cog,
  Info,
  HelpCircle,
  MessageSquare,
  Settings2,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  User2,
  ChartLine,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoPath from "../../public/LogoUTA.png";

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

const logSidebar = (...args: any[]) => {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[SIDEBAR]", ...args);
  }
};

interface NavItem {
  id: number;
  path: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface NavGroup {
  id: number;
  title: string;
  icon: React.ComponentType<any>;
  initiallyOpen?: boolean;
  items: NavItem[];
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Dashboard: LayoutDashboard,
  Users,
  Clock,
  CalendarCheck,
  DollarSign,
  Building2,
  FileText,
  Settings,
  Calendar,
  ClipboardList,
  UserCog,
  Timer,
  LogOut,
  Bell,
  ShieldCheck,
  HardHat,
  ClipboardCheck,
  FileCheck,
  FileWarning,
  FileSignature,
  FileSearch,
  FileClock,
  FileSpreadsheet,
  FilePlus,
  User,
  Briefcase,
  BadgeCheck,
  Handshake,
  GraduationCap,
  BookOpen,
  PenSquare,
  Clipboard,
  AlarmClock,
  CalendarDays,
  CalendarX,
  CalendarPlus,
  CalendarSearch,
  CalendarClock,
  Cog,
  Info,
  HelpCircle,
  MessageSquare,
  Settings2,
  Layers,
  ChartLine,
  Folder,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onLogout?: () => void;
}

interface NormalizedMenuItem {
  id: number;
  parentId: number | null;
  name: string;
  url: string | null;
  icon: string;
  order: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  onLogout,
}) => {
  const [location] = useLocation();
  const [navGroups, setNavGroups] = useState<NavGroup[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 nuevo
  const { user, isAuthenticated, isLoading } = useAuth();

  const normalizeMenuItem = (item: any): NormalizedMenuItem => {
    const id = item.menuItemId ?? item.id;
    const parentId =
      item.parentId === undefined || item.parentId === null
        ? null
        : item.parentId;
    const name = item.menuItemName ?? item.name ?? "";
    const url = item.url ?? null;
    const icon = item.icon ?? "Folder";
    const order = item.order ?? 0;

    return { id, parentId, name, url, icon, order };
  };

  useEffect(() => {
    if (!user) {
      setNavGroups([]);
      return;
    }

    if (typeof (user as any).menuItems === "undefined") {
      // AuthContext todavía no terminó de cargar menú
      return;
    }

    const rawItems: any[] = (user.menuItems || []) as any[];

    if (!rawItems.length) {
      setNavGroups([]);
      return;
    }

    // (logs de debug se mantienen igual)
    const normalized: NormalizedMenuItem[] = rawItems.map(normalizeMenuItem);

    const roots = normalized
      .filter((m) => m.parentId === null || m.parentId === 0)
      .sort((a, b) => a.order - b.order);

    const groups: NavGroup[] = roots
      .map((root) => {
        const IconComponent = iconMap[root.icon] || Folder;

        const children = normalized
          .filter((item) => item.parentId === root.id && item.url !== null)
          .sort((a, b) => a.order - b.order)
          .map((item) => {
            const ItemIcon = iconMap[item.icon] || FileText;
            return {
              id: item.id,
              path: item.url || "#",
              label: item.name,
              icon: ItemIcon,
            };
          });

        return {
          id: root.id,
          title: root.name,
          icon: IconComponent,
          initiallyOpen: children.length > 0,
          items: children,
        };
      })
      .filter((group) => group.items.length > 0);

    DEBUG && logSidebar("NavGroups finales", groups);

    setNavGroups(groups);

    const initialOpenState: Record<string, boolean> = {};
    groups.forEach((group) => {
      const key = group.id.toString();
      initialOpenState[key] = group.initiallyOpen || false;
    });
    setOpenGroups(initialOpenState);
  }, [user]);

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Normalización de rutas para active
  const normalizePath = (p: string) => {
    if (!p) return "/";
    const trimmed = p.replace(/\/+$/, "");
    return trimmed === "" ? "/" : trimmed;
  };

  const isActivePath = (path: string) => {
    const current = normalizePath(location);
    const target = normalizePath(path);

    if (target === "/") {
      return current === "/";
    }

    return current === target || current.startsWith(target + "/");
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  // 🔍 Filtro de búsqueda (por título de grupo e items)
  const filteredNavGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return navGroups;

    return navGroups
      .map((group) => {
        const groupMatches = group.title.toLowerCase().includes(term);
        const filteredItems = group.items.filter((item) =>
          item.label.toLowerCase().includes(term)
        );

        if (!groupMatches && filteredItems.length === 0) {
          return null;
        }

        return {
          ...group,
          items: groupMatches ? group.items : filteredItems,
        };
      })
      .filter(Boolean) as NavGroup[];
  }, [navGroups, searchTerm]);

  // Loader mientras esperamos menú/permiso
  if (
    isLoading ||
    (isAuthenticated && user && typeof (user as any).menuItems === "undefined")
  ) {
    return (
      <aside
        className={`${
          collapsed ? "w-16" : "w-60"
        } h-screen shadow-lg border-r flex flex-col transition-all duration-300`}
        style={{
          backgroundColor: "#ffffff",
          borderColor: "#e2e8f0",
        }}
      >
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          {!collapsed && <span className="ml-2">Cargando menú...</span>}
        </div>
      </aside>
    );
  }

  // Usuario sin menús asignados
  if (isAuthenticated && navGroups.length === 0) {
    return (
      <aside
        className={`${
          collapsed ? "w-16" : "w-60"
        } h-screen shadow-lg border-r flex flex-col transition-all duration-300`}
        style={{
          backgroundColor: "#ffffff",
          borderColor: "#e2e8f0",
        }}
      >
        {/* Header con logo aunque no haya menú */}
        <div
          className="flex flex-col items-center justify-center border-b px-3 py-3"
          style={{
            background:
              "linear-gradient(to right, rgba(38, 87, 146, 0.05), rgba(255, 193, 7, 0.05))",
            borderColor: "#e2e8f0",
          }}
        >
          <div className="flex items-center w-full justify-center">
            <img
              src={logoPath}
              alt="Universidad Técnica de Ambato"
              className="h-10 w-auto mr-3"
            />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-blue-900 leading-tight">
                  Universidad Técnica
                </span>
                <span className="font-semibold text-sm text-blue-900 leading-tight -mt-1">
                  de Ambato
                </span>
                <span className="text-[11px] text-gray-500 mt-1">
                  Sistema de Licencias
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="mt-2 flex items-center justify-center w-7 h-7 rounded-full border text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-200"
            style={{ borderColor: "#e2e8f0" }}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 text-center">
          <div>
            <Folder className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">
              No tienes opciones de menú asignadas.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Contacta al administrador del sistema para asignar tus permisos.
            </p>
          </div>
        </div>

        {/* Footer fijado abajo */}
        <SidebarFooter
          collapsed={collapsed}
          userName={user?.displayName || user?.email}
          userType={user?.userType}
          onLogout={handleLogout}
        />
      </aside>
    );
  }

  const currentUserName = user?.displayName || user?.email || "Usuario";

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-60"
      } h-screen shadow-lg border-r flex flex-col transition-all duration-300`}
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e2e8f0",
      }}
    >
      {/* HEADER CON LOGO UTA */}
      <div
        className="flex flex-col items-center justify-center border-b px-3 py-3"
        style={{
          background:
            "linear-gradient(to right, rgba(38, 87, 146, 0.05), rgba(255, 193, 7, 0.05))",
          borderColor: "#e2e8f0",
        }}
      >
        <div className="flex items-center w-full justify-center">
          <img
            src={logoPath}
            alt="Universidad Técnica de Ambato"
            className="h-10 w-auto mr-3"
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-blue-900 leading-tight">
                Universidad Técnica
              </span>
              <span className="font-semibold text-sm text-blue-900 leading-tight -mt-1">
                de Ambato
              </span>
              <span className="text-[11px] text-gray-500 mt-1">
                Sistema de Licencias
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggle}
          className="mt-2 flex items-center justify-center w-7 h-7 rounded-full border text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-200"
          style={{ borderColor: "#e2e8f0" }}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 🔍 BÚSQUEDA (solo cuando no está colapsado) */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 border-b" style={{ borderColor: "#e2e8f0" }}>
          <div className="relative">
            <span className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en el menú..."
              className="w-full pl-8 pr-2 py-1.5 rounded-md border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
              style={{ borderColor: "#e2e8f0" }}
            />
          </div>
        </div>
      )}

      {/* NAV: ocupa todo el espacio disponible y hace scroll */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-2">
        {filteredNavGroups.map((group) => {
          const groupKey = group.id.toString();
          const isOpen = openGroups[groupKey] ?? group.initiallyOpen ?? false;
          const GroupIcon = group.icon || Folder;

          return (
            <div key={groupKey} className="mb-1">
              <button
                onClick={() => toggleGroup(groupKey)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${
                    isOpen
                      ? "bg-blue-50 text-blue-800"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <span className="flex items-center space-x-2">
                  <GroupIcon className="h-4 w-4" />
                  {!collapsed && <span>{group.title}</span>}
                </span>
                {!collapsed && (
                  <span className="ml-1">
                    {isOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </span>
                )}
              </button>

              {isOpen && (
                <div className="mt-1 space-y-0.5 ml-2">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isActivePath(item.path);

                    return (
                      <Link
                        key={item.id}
                        href={item.path}
                        className={`flex items-center px-2 py-1.5 rounded-lg text-xs transition-colors
                          ${
                            active
                              ? "bg-blue-600 text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                          }`}
                      >
                        <ItemIcon className="h-3.5 w-3.5 mr-2" />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Mensaje si hay búsqueda y no se encontró nada */}
        {!collapsed && searchTerm.trim() && filteredNavGroups.length === 0 && (
          <p className="text-[11px] text-gray-500 px-2 mt-2">
            No se encontraron opciones para “{searchTerm.trim()}”.
          </p>
        )}
      </nav>

      {/* FOOTER FIJADO ABAJO */}
      <SidebarFooter
        collapsed={collapsed}
        userName={currentUserName}
        userType={user?.userType}
        onLogout={handleLogout}
      />
    </aside>
  );
};

interface SidebarFooterProps {
  collapsed: boolean;
  userName?: string;
  userType?: string;
  onLogout: () => void;
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({
  collapsed,
  userName,
  userType,
  onLogout,
}) => (
  <div
    className="border-t px-2 py-2 text-xs flex items-center justify-between mt-auto"
    style={{ borderColor: "#e2e8f0" }}
  >
    <div className="flex items-center space-x-2 min-w-0">
      <User2 className="h-4 w-4 text-gray-500" />
      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-gray-700 truncate">
            {userName || "Usuario"}
          </span>
          <span className="text-[11px] text-gray-500 truncate">
            {userType === "AzureAD" ? "Cuenta institucional" : "Usuario local"}
          </span>
        </div>
      )}
    </div>
    <button
      onClick={onLogout}
      className="ml-2 p-1.5 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors flex-shrink-0"
    >
      <LogOut className="h-4 w-4" />
    </button>
  </div>
);

export default Sidebar;
