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
import { useState, useEffect, useRef } from "react";
import { tokenService } from '@/services/auth';
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
  const [navGroups, setNavGroups] = useState<NavGroup[]>([
    {
      title: "Principal",
      icon: LayoutDashboard,
      initiallyOpen: true,
      items: [
        {
          path: "/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard
        }
      ]
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const isMounted = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated } = useAuth();
  
  // 🆕 Flag para evitar cargar antes de tiempo
  const hasLoadedMenuRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const fetchMenuData = async (retryCount = 0) => {
      if (!isMounted.current) return;

      // 🆕 Delay inicial más largo para asegurar que el token esté listo
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      try {
        if (retryCount === 0) {
          setLoading(true);
        }
        setError(null);
        
        const accessToken = tokenService.getAccessToken();
        if (!accessToken) {
          console.warn("No hay token de acceso disponible, reintentando...");
          throw new Error("No hay token de autenticación disponible");
        }
        
        const response = await fetch(`${AUTH_API_BASE_URL}/api/menu/user`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          console.error("Respuesta no JSON recibida:", textResponse.substring(0, 200));
          
          if (response.status === 404) {
            console.warn("Endpoint de menú no encontrado (404), usando menú por defecto");
            setError(null);
            hasLoadedMenuRef.current = true;
            return;
          } else if (response.status === 401 || response.status === 403) {
            throw new Error("No autorizado para acceder al menú");
          } else {
            throw new Error(`El servidor respondió con: ${response.status} ${response.statusText}`);
          }
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            console.warn("Endpoint de menú no encontrado (404), usando menú por defecto");
            setError(null);
            hasLoadedMenuRef.current = true;
            return;
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          console.warn("No tiene asignada ninguna opción de menú, usando menú por defecto");
          setError(null);
          hasLoadedMenuRef.current = true;
          return;
        }
        
        const menuItems = result.data;
        
        const mainGroups = menuItems
          .filter(item => item.parentId === null)
          .sort((a, b) => a.order - b.order);
        
        const transformedGroups: NavGroup[] = mainGroups.map(group => {
          const IconComponent = iconMap[group.icon] || Folder;
          
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
        }).filter(group => group.items.length > 0);
        
        if (transformedGroups.length > 0 && isMounted.current) {
          setNavGroups(transformedGroups);
          
          const initialOpenState: Record<string, boolean> = {};
          transformedGroups.forEach(group => {
            const key = group.title.toLowerCase().replace(/\s+/g, '-');
            initialOpenState[key] = group.initiallyOpen || false;
          });
          setOpenGroups(initialOpenState);
          hasLoadedMenuRef.current = true;
        }
        
      } catch (err: any) {
        console.error(`Error fetching menu (intento ${retryCount + 1}):`, err);
        
        // 🆕 Reintentos más inteligentes
        const maxRetries = 3;
        if (retryCount < maxRetries && !hasLoadedMenuRef.current) {
          const delay = 1000 * Math.pow(2, retryCount);
          console.log(`Reintentando en ${delay}ms... (${retryCount + 1}/${maxRetries})`);
          
          retryTimeoutRef.current = setTimeout(() => {
            if (isMounted.current) {
              fetchMenuData(retryCount + 1);
            }
          }, delay);
          return;
        }
        
        if (isMounted.current) {
          const errorMessage = err.message || "Error al cargar el menú. Verifique la conexión con el servidor.";
          
          if (errorMessage.includes("No hay token")) {
            setError("Usuario no autenticado");
          } else {
            setError(errorMessage);
          }
        }
      } finally {
        if (isMounted.current && retryTimeoutRef.current === null) {
          setLoading(false);
        }
      }
    };

    // 🆕 Solo cargar si está autenticado Y no se ha cargado antes
    if (isAuthenticated && !hasLoadedMenuRef.current) {
      fetchMenuData();
    } else if (!isAuthenticated) {
      setLoading(false);
      setError("No autenticado");
      hasLoadedMenuRef.current = false;
    } else {
      // Ya está cargado
      setLoading(false);
    }

  }, [isAuthenticated]);

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
    // No mostrar error si es "No autenticado" - eso significa que aún no se ha iniciado sesión
    if (error === "No autenticado") {
      return (
        <aside className={`${collapsed ? 'w-16' : 'w-60'} shadow-lg border-r flex flex-col transition-all duration-300`}
          style={{ 
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0'
          }}>
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Lock className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-muted-foreground">
              Inicie sesión para ver el menú
            </p>
          </div>
        </aside>
      );
    }

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