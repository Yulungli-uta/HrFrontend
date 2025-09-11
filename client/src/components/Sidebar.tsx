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
  Search, // Importamos el ícono de búsqueda
  X // Importamos el ícono para limpiar búsqueda
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LogoUTA from "@assets/LogoUTA.png";
import { useState, useEffect } from "react";
import { tokenService } from '@/services/auth';

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

// Mapa de iconos para convertir strings a componentes (usando nombres correctos)
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
  X
};

interface MenuItem {
  id: number;
  parentId: number | null;
  name: string;
  url: string | null;
  icon: string;
  order: number;
}

// Obtener la URL base de la API de autenticación desde las variables de entorno
const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL || "http://localhost:5010";

export default function Sidebar({ onLogout, collapsed = false }: SidebarProps) {
  const [location] = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [navGroups, setNavGroups] = useState<NavGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // Estado para el término de búsqueda

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verificar si tenemos un token de acceso
        const accessToken = tokenService.getAccessToken();
        if (!accessToken) {
          throw new Error("No hay token de autenticación disponible");
        }
        
        // Usar la API de autenticación para obtener el menú
        const response = await fetch(`${AUTH_API_BASE_URL}/api/menu/user`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // Si no es JSON, obtener el texto para diagnosticar el problema
          const textResponse = await response.text();
          console.error("Respuesta no JSON recibida:", textResponse.substring(0, 200));
          
          if (response.status === 404) {
            throw new Error("Endpoint de menú no encontrado (404)");
          } else if (response.status === 401 || response.status === 403) {
            throw new Error("No autorizado para acceder al menú");
          } else {
            throw new Error(`El servidor respondió con: ${response.status} ${response.statusText}`);
          }
        }
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          setNavGroups([]);
          setError("No tiene asignada ninguna opción de menú");
          return;
        }
        
        // Procesar los datos del menú
        const menuItems = result.data;
        
        // Obtener los grupos principales (parentId es null)
        const mainGroups = menuItems
          .filter(item => item.parentId === null)
          .sort((a, b) => a.order - b.order);
        
        // Crear la estructura de grupos con sus items
        const transformedGroups: NavGroup[] = mainGroups.map(group => {
          // Obtener el componente de icono
          const IconComponent = iconMap[group.icon] || Folder;
          
          // Encontrar los items que pertenecen a este grupo
          const groupItems = menuItems
            .filter(item => item.parentId === group.id && item.url !== null)
            .sort((a, b) => a.order - b.order)
            .map(item => {
              const ItemIcon = iconMap[item.icon] || FileText;
              return {
                path: item.url || "#",
                label: item.name,
                icon: ItemIcon
              };
            });
          
          return {
            title: group.name,
            icon: IconComponent,
            initiallyOpen: groupItems.length > 0,
            items: groupItems
          };
        }).filter(group => group.items.length > 0); // Solo mostrar grupos con items
        
        setNavGroups(transformedGroups);
        
        // Inicializar el estado de grupos abiertos
        const initialOpenState: Record<string, boolean> = {};
        transformedGroups.forEach(group => {
          const key = group.title.toLowerCase().replace(/\s+/g, '-');
          initialOpenState[key] = group.initiallyOpen || false;
        });
        setOpenGroups(initialOpenState);
        
      } catch (err: any) {
        console.error("Error fetching menu:", err);
        setError(err.message || "Error al cargar el menú. Verifique la conexión con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  const toggleGroup = (groupKey: string) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isActive = (path: string) => {
    if (path === "/" || path === "#") return false;
    if (path === "/dashboard" && location === "/") return true;
    return location.startsWith(path);
  };

  // Filtrar grupos y elementos según el término de búsqueda
  const filteredGroups = searchTerm 
    ? navGroups.map(group => {
        const filteredItems = group.items.filter(item => 
          item.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        // Si el grupo coincide con la búsqueda o tiene items que coinciden
        if (group.title.toLowerCase().includes(searchTerm.toLowerCase()) || filteredItems.length > 0) {
          return {
            ...group,
            items: filteredItems
          };
        }
        
        return null;
      }).filter(Boolean) as NavGroup[]
    : navGroups;

  const renderNavItem = (item: NavItem, groupIndex: number, itemIndex: number) => {
    const { path, label, icon: Icon } = item;
    
    if (path === "#") return null; // No renderizar items sin URL
    
    const navItem = (
      <div
        className={`nav-item flex items-center ${collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} text-sm font-medium rounded-lg transition-colors cursor-pointer ${
          isActive(path)
            ? "text-white"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
        style={isActive(path) ? { backgroundColor: '#265792' } : {}}
        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <Icon className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-4 w-4'}`} />
        {!collapsed && label}
      </div>
    );

    return (
      <Link key={`${groupIndex}-${itemIndex}`} href={path}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {navItem}
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {label}
            </TooltipContent>
          </Tooltip>
        ) : (
          navItem
        )}
      </Link>
    );
  };

  if (loading) {
    return (
      <aside className={`${collapsed ? 'w-16' : 'w-60'} shadow-lg border-r flex flex-col transition-all duration-300`}
        style={{ 
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0'
        }}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          {!collapsed && <span className="ml-2">Cargando menú...</span>}
        </div>
      </aside>
    );
  }

  if (error || navGroups.length === 0) {
    return (
      <aside className={`${collapsed ? 'w-16' : 'w-60'} shadow-lg border-r flex flex-col transition-all duration-300`}
        style={{ 
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0'
        }}>
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
          <p className="text-sm text-muted-foreground">
            {error || "No tiene asignada ninguna opción de menú"}
          </p>
          {!collapsed && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside 
      className={`${collapsed ? 'w-16' : 'w-60'} shadow-lg border-r flex flex-col transition-all duration-300`}
      style={{ 
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0'
      }}
    >
      {/* Logo Section */}
      <div 
        className={`${collapsed ? 'p-3' : 'p-6'} border-b transition-all duration-300`}
        style={{ 
          borderColor: '#e2e8f0',
          background: 'linear-gradient(to right, rgba(38, 87, 146, 0.05), rgba(255, 193, 7, 0.05))'
        }}
      >
        <div className="flex-shrink-0 w-full flex justify-center">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <img 
                  src={LogoUTA} 
                  alt="Logo Universidad Técnica de Ambato" 
                  className="h-8 w-auto object-contain uta-official-logo transition-all duration-300 cursor-help"
                  style={{ maxWidth: '40px' }}
                />
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                <div className="text-center">
                  <div className="font-semibold">WsUtaSystem</div>
                  <div className="text-xs opacity-90">Sistema de Gestión de RRHH</div>
                  <div className="text-xs opacity-75">Universidad Técnica de Ambato</div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <img 
              src={LogoUTA} 
              alt="Logo Universidad Técnica de Ambato" 
              className="h-10 w-auto object-contain uta-official-logo transition-all duration-300"
              style={{ maxWidth: '100px' }}
            />
          )}
        </div>
        {!collapsed && (
          <p 
            className="text-xs text-center mt-2" 
            style={{ color: '#64748b' }}
          >
            Universidad Técnica de Ambato
          </p>
        )}
      </div>

      {/* Search Bar - Solo visible cuando no está colapsado */}
      {!collapsed && (
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar en el menú..."
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <X 
                className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" 
                onClick={() => setSearchTerm("")}
              />
            )}
          </div>
        </div>
      )}

      {/* Navigation Menu with Scroll */}
      <nav className="flex-1 overflow-y-auto">
        <div className={`${collapsed ? 'p-2' : 'p-4'} space-y-4 transition-all duration-300`}>
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group, groupIndex) => {
              if (collapsed) {
                // En modo colapsado, mostramos solo los íconos de cada item sin agrupación
                return (
                  <div key={groupIndex} className="space-y-2">
                    {group.items.map((item, itemIndex) => 
                      renderNavItem(item, groupIndex, itemIndex)
                    )}
                  </div>
                );
              }
              
              // En modo expandido, mostramos los grupos con acordeón
              const groupKey = group.title.toLowerCase().replace(/\s+/g, '-');
              const isOpen = openGroups[groupKey] || searchTerm.length > 0; // Mantener abierto si hay búsqueda
              
              return (
                <div key={groupIndex} className="nav-group">
                  <div 
                    className="flex items-center justify-between py-2 px-2 rounded-md cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <div className="flex items-center">
                      <group.icon className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">{group.title}</span>
                    </div>
                    {group.items.length > 0 ? (
                      isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    ) : null}
                  </div>
                  
                  {isOpen && group.items.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3">
                      {group.items.map((item, itemIndex) => 
                        renderNavItem(item, groupIndex, itemIndex)
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Mostrar mensaje si no hay resultados de búsqueda
            !collapsed && searchTerm && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No se encontraron resultados para "{searchTerm}"
              </div>
            )
          )}
        </div>
      </nav>

      {/* User Info - Mantenemos el código existente comentado */}
    </aside>
  );
}