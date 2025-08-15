import { Button } from "@/components/ui/button";
import { LogOut, User, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onLogout: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export default function Header({ onLogout, onToggleSidebar, sidebarCollapsed }: HeaderProps) {
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
              <DropdownMenuItem 
                onClick={onLogout}
                className="text-red-600 focus:text-red-600"
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