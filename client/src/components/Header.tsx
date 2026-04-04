// components/Header.tsx
// Diseño UX profesional con soporte completo dark/light mode.
// Principio: NUNCA usar colores hardcodeados. Usar siempre variables semánticas del tema.
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, UserCog, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
      : "Mi cuenta";

  /* Iniciales para el avatar */
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="header-base sticky top-0 z-30 px-4 sm:px-6 h-14 flex items-center">
      <div className="flex items-center justify-between w-full gap-4">

        {/* ── Izquierda: toggle sidebar ── */}
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent
                         transition-all duration-200 rounded-lg"
              data-testid="sidebar-toggle-button"
              aria-label={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
              title={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* ── Derecha: tema + usuario ── */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* Toggle de tema */}
          <ThemeToggle />

          {/* Separador visual */}
          <div className="hidden sm:block w-px h-5 bg-border mx-1" />

          {/* Menú de usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 px-2 rounded-lg
                           text-foreground hover:bg-accent hover:text-accent-foreground
                           transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="user-menu-trigger"
                aria-label="Menú de usuario"
              >
                {/* Avatar con iniciales */}
                <div
                  className="w-7 h-7 rounded-full bg-primary flex items-center justify-center
                              text-primary-foreground text-[10px] font-bold shrink-0 select-none"
                >
                  {initials || <User className="h-3.5 w-3.5" />}
                </div>

                {/* Nombre (oculto en móvil) */}
                <span className="hidden sm:block text-sm font-medium truncate max-w-[130px]">
                  {displayName}
                </span>

                <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-52 bg-popover text-popover-foreground border border-border
                         shadow-lg rounded-xl p-1 animate-fade-in"
            >
              {/* Info del usuario */}
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cuenta activa</p>
              </div>

              <DropdownMenuItem
                onClick={handleUpdateData}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                           text-foreground cursor-pointer
                           hover:bg-accent hover:text-accent-foreground
                           transition-colors duration-150"
                data-testid="update-data-menu-item"
              >
                <UserCog className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Actualizar datos</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border my-1" />

              <DropdownMenuItem
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                           text-destructive cursor-pointer
                           hover:bg-destructive/10 hover:text-destructive
                           transition-colors duration-150"
                data-testid="logout-menu-item"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
