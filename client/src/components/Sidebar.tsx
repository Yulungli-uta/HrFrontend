import { Link, useLocation } from "wouter";
import { 
  Users, 
  LayoutDashboard, 
  Clock, 
  CalendarCheck, 
  DollarSign, 
  Newspaper,
  UserCog
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/personas", label: "Personas", icon: Users },
    { path: "/asistencia", label: "Asistencia", icon: Clock },
    { path: "/permisos", label: "Permisos & Vacaciones", icon: CalendarCheck },
    { path: "/nomina", label: "Nómina", icon: DollarSign },
    { path: "/publicaciones", label: "Publicaciones", icon: Newspaper },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <aside className="w-60 bg-surface shadow-lg border-r border-border flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-sm">UTA</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">WsUtaSystem</h1>
            <p className="text-xs text-muted-foreground">Universidad Técnica de Ambato</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Sistema de Gestión de Talento Humano</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link key={path} href={path}>
            <div
              className={`nav-item flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                isActive(path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="mr-3 h-4 w-4" />
              {label}
            </div>
          </Link>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <UserCog className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-foreground">Admin Usuario</p>
            <p className="text-xs text-muted-foreground">admin@empresa.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
