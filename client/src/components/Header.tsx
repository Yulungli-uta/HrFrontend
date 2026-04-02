import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { useLocation } from "wouter";
import { ThemeToggle } from "./ThemeToggle";

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

interface HeaderProps {
  onLogout: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  currentUserId?: number | null;
  currentUserName?: string | null;
}

export default function Header({
  onLogout,
  onToggleSidebar,
  sidebarCollapsed,
  currentUserId,
  currentUserName
}: HeaderProps) {
  const [, navigate] = useLocation();

  /* --------------------------------------------
   * Manejar navegación a perfil
   * -------------------------------------------- */
  const handleUpdateData = () => {
    if (typeof currentUserId === "number") {
      navigate(`/people/${currentUserId}`);
    } else {
      if (DEBUG) {
        console.warn("[HEADER] No user ID available for profile update");
      }
    }
  };

  /* --------------------------------------------
   * Mostrar nombre o skeleton
   * -------------------------------------------- */
  const displayName =
    currentUserName && currentUserName.trim() !== ""
      ? currentUserName
      : "Cargando...";

  return (
    <header className="border-b bg-white dark:bg-gray-800 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="text-gray-600 hover:text-gray-900"
              data-testid="sidebar-toggle-button"
              aria-label={sidebarCollapsed ? "Abrir menú" : "Colapsar menú"}
              title={sidebarCollapsed ? "Abrir menú" : "Colapsar menú"}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* MENU USUARIO & TEMA */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <ThemeToggle />
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
                  style={{ backgroundColor: "#265792" }}
                >
                  <User className="h-4 w-4 text-white" />
                </div>

                <span className="text-sm font-medium truncate max-w-[140px]">
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={handleUpdateData}
                className="text-gray-700 cursor-pointer"
                data-testid="update-data-menu-item"
              >
                <UserCog className="mr-2 h-4 w-4" />
                Actualizar Datos
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={onLogout}
                className="text-red-600 cursor-pointer"
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
