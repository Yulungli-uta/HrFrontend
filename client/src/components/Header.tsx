import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

interface HeaderProps {
  onLogout: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  currentUserId?: number; // ID del usuario actual
}

export default function Header({ onLogout, onToggleSidebar, sidebarCollapsed, currentUserId }: HeaderProps) {
  const [location, navigate] = useLocation();

  const handleUpdateData = () => {
    if (currentUserId) {
      navigate(`/people/${currentUserId}`);
    } else {
      // Redirigir a una página de error o mostrar mensaje si no hay ID
      console.error("No user ID available for profile update");
    }
  };

  return (
    <header className="border-b bg-white dark:bg-gray-800 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="text-gray-600 hover:text-gray-900"
              data-testid="sidebar-toggle-button"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center space-x-2"
                data-testid="user-menu-trigger"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#265792' }}
                >
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">Admin Usuario</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Nueva opción para actualizar datos */}
              <DropdownMenuItem 
                onClick={handleUpdateData}
                className="text-gray-700 focus:text-gray-700 cursor-pointer"
                data-testid="update-data-menu-item"
              >
                <UserCog className="mr-2 h-4 w-4" />
                Actualizar Datos
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onLogout}
                className="text-red-600 focus:text-red-600 cursor-pointer"
                data-testid="logout-menu-item"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}