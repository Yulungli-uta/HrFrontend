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
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoUTA from "@assets/LogoUTA.png";

interface SidebarProps {
  onLogout?: () => void;
  collapsed?: boolean;
}

export default function Sidebar({ onLogout, collapsed = false }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/people", label: "Personas", icon: Users },
    { path: "/employees", label: "Empleados", icon: UserCog },
    { path: "/faculties", label: "Facultades", icon: Building2 },
    { path: "/departments", label: "Departamentos", icon: Building2 },
    { path: "/schedules", label: "Horarios", icon: Clock },
    { path: "/contracts", label: "Contratos", icon: FileText },
    { path: "/attendance", label: "Asistencia", icon: Timer },
    { path: "/permissions", label: "Permisos", icon: CalendarCheck },
    { path: "/vacations", label: "Vacaciones", icon: Calendar },
    { path: "/overtime", label: "Horas Extra", icon: ClipboardList },
    { path: "/payroll", label: "Nómina", icon: DollarSign },
    { path: "/reports", label: "Reportes", icon: FileText },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

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
        <div className="flex items-center space-x-3 mb-2">
          <div className="flex-shrink-0">
            <img 
              src={LogoUTA} 
              alt="Logo Universidad Técnica de Ambato" 
              className={`${collapsed ? 'h-8' : 'h-10'} w-auto object-contain uta-official-logo transition-all duration-300`}
              style={{ maxWidth: collapsed ? '40px' : '100px' }}
            />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xl uta-system-title">WsUtaSystem</h1>
              <p 
                className="text-sm" 
                style={{ color: '#64748b' }}
              >
                Sistema de Gestión
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <p 
            className="text-xs" 
            style={{ color: '#64748b' }}
          >
            Universidad Técnica de Ambato
          </p>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'} space-y-2 transition-all duration-300`}>
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link key={path} href={path}>
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
          </Link>
        ))}
      </nav>

      {/* User Info */}
      <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-border space-y-3 transition-all duration-300`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#265792' }}
          >
            <UserCog className="h-4 w-4" style={{ color: '#ffffff' }} />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Admin Usuario</p>
              <p className="text-xs text-gray-500">Administrador</p>
            </div>
          )}
        </div>
        
        {onLogout && (!collapsed ? (
          <Button
            onClick={onLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            data-testid="logout-button"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        ) : (
          <Button
            onClick={onLogout}
            variant="outline"
            size="sm"
            className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
            data-testid="logout-button-collapsed"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        ))}
      </div>
    </aside>
  );
}
