import React from "react";
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
  ChevronDown,
  ChevronRight,
  Folder,
  Briefcase,
  User,
  Loader2,
  Home,
  BarChart3,
  Shield,
  AlertTriangle,
  Heart,
  Star,
  BookOpen,
  UserPlus,
  FolderOpen,
  Bell,
  GraduationCap,
  MapPin,
  Lock,
  ClipboardCheck,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LogoUTA from "@assets/LogoUTA.png";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  onLogout?: () => void;
  collapsed?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  icon: React.ComponentType<any>;
  initiallyOpen?: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
}

// Mapa de iconos para convertir strings a componentes
const iconMap: Record<string, React.ComponentType<any>> = {
  Home,
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
  Briefcase,
  User,
  BarChart3,
  Shield,
  AlertTriangle,
  Heart,
  Star,
  BookOpen,
  UserPlus,
  FolderOpen,
  Bell,
  GraduationCap,
  MapPin,
  Lock,
  ClipboardCheck,
  Search,
};

export default function Sidebar({ onLogout, collapsed = false }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  const { user, isAuthenticated } = useAuth();

  /**
   * Transforma menuItems del AuthContext en NavGroups
   * Usa useMemo para evitar recalcular en cada render
   */
  const navGroups = useMemo(() => {
    if (!user?.menuItems || user.menuItems.length === 0) {
      return [];
    }

    const menuItems = user.menuItems;

    // Filtrar grupos principales (sin padre)
    const mainGroups = menuItems
      .filter(item => item.parentId === null)
      .sort((a, b) => a.order - b.order);

    // Transformar a NavGroups
    const groups: NavGroup[] = mainGroups.map(group => {
      const IconComponent = iconMap[group.icon] || Folder;

      // Obtener items hijos del grupo
      const groupItems = menuItems
        .filter(item => item.parentId === group.menuItemId && item.url !== null)
        .sort((a, b) => a.order - b.order)
        .map(item => {
          const ItemIcon = iconMap[item.icon] || FileText;
          return {
            path: item.url || "#",
            label: item.menuItemName,
            icon: ItemIcon
          };
        });

      return {
        title: group.menuItemName,
        icon: IconComponent,
        initiallyOpen: groupItems.length > 0,
        items: groupItems
      };
    });

    return groups;
  }, [user?.menuItems]);

  // Inicializar grupos abiertos
  useEffect(() => {
    if (navGroups.length > 0) {
      const initialOpenState: Record<string, boolean> = {};
      navGroups.forEach(group => {
        if (group.initiallyOpen) {
          initialOpenState[group.title] = true;
        }
      });
      setOpenGroups(initialOpenState);
    }
  }, [navGroups]);

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  // Filtrar grupos y items según búsqueda
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return navGroups;
    }

    const query = searchQuery.toLowerCase();
    return navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.label.toLowerCase().includes(query) ||
          item.path.toLowerCase().includes(query)
        )
      }))
      .filter(group => 
        group.title.toLowerCase().includes(query) || 
        group.items.length > 0
      );
  }, [navGroups, searchQuery]);

  // Auto-abrir grupos cuando hay búsqueda
  useEffect(() => {
    if (searchQuery.trim()) {
      const allOpen: Record<string, boolean> = {};
      filteredGroups.forEach(group => {
        allOpen[group.title] = true;
      });
      setOpenGroups(allOpen);
    }
  }, [searchQuery, filteredGroups]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  // Mostrar loading mientras se cargan los permisos
  if (isAuthenticated && !user?.menuItems) {
    return (
      <aside className={`bg-gradient-to-b from-blue-900 to-blue-800 text-white h-screen flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Cargando menú...</p>
          </div>
        </div>
      </aside>
    );
  }

  // Mostrar mensaje si no hay menú asignado
  if (isAuthenticated && navGroups.length === 0) {
    return (
      <aside className={`bg-gradient-to-b from-blue-900 to-blue-800 text-white h-screen flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-sm">No tienes opciones de menú asignadas</p>
            <p className="text-xs mt-2 text-blue-200">Contacta al administrador</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`bg-gradient-to-b from-blue-900 to-blue-800 text-white h-screen flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo y título */}
      <div className="p-4 border-b border-blue-700">
        <div className="flex items-center justify-center gap-2">
          <img src={LogoUTA} alt="Logo UTA" className={`transition-all ${collapsed ? 'w-8 h-8' : 'w-12 h-12'}`} />
          {!collapsed && (
            <div className="text-center">
              <h2 className="text-sm font-semibold">Universidad Técnica de Ambato</h2>
            </div>
          )}
        </div>
      </div>

      {/* Barra de búsqueda */}
      {!collapsed && (
        <div className="p-4 border-b border-blue-700">
          {showSearch ? (
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar en el menú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pr-8 bg-blue-800 border border-blue-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-blue-800 hover:bg-blue-700 rounded-md text-sm transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Buscar en el menú...</span>
            </button>
          )}
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <button
              onClick={() => toggleGroup(group.title)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-blue-700 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <group.icon className="h-5 w-5" />
                {!collapsed && <span className="font-medium">{group.title}</span>}
              </div>
              {!collapsed && (
                openGroups[group.title] ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {openGroups[group.title] && !collapsed && (
              <div className="ml-4 space-y-1">
                {group.items.map((item) => (
                  <a
                    key={item.path}
                    href={item.path}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Botón de logout */}
      <div className="p-4 border-t border-blue-700">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-blue-700"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">
              <p>Cerrar Sesión</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}
