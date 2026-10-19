// components/Layout.tsx
// Estructura principal de la aplicación con soporte dark/light mode.
// Principio: usar siempre clases semánticas del tema, nunca colores hardcodeados.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import ResponsiveSidebarShell from "./layout/ResponsiveSidebarShell";
import Header from "./Header";
import { useAuth } from "@/features/auth";
import { useUserPreferences } from "@/features/preferences";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { DEFAULT_PREFERENCES } from "@/types/userPreferences";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, isLoading, user, employeeDetails, logout } = useAuth();

  const { preferences, isReady: preferencesReady, setMenuCollapsed } = useUserPreferences();
  const isDesktop = useIsDesktop();

  // Estado inicial del menú en escritorio según la preferencia; sin preferencia = expandido (como antes).
  const preferredCollapsed = () => {
    const mode = preferences.menuStartMode ?? DEFAULT_PREFERENCES.menuStartMode;
    if (mode === "collapsed") return true;
    if (mode === "expanded") return false;
    return preferences.menuCollapsed ?? false;
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(preferredCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userToggledRef = useRef(false);
  const [, setLocation] = useLocation();

  // Cuando llegan las preferencias del servidor se aplican, salvo que el usuario ya haya tocado el menú.
  useEffect(() => {
    if (preferencesReady && !userToggledRef.current) setSidebarCollapsed(preferredCollapsed());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona a los campos del menú
  }, [preferencesReady, preferences.menuStartMode, preferences.menuCollapsed]);

  // Al pasar a escritorio el panel superpuesto deja de existir.
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  const toggleSidebar = () => {
    if (!isDesktop) {
      setDrawerOpen(open => !open);
      return;
    }
    userToggledRef.current = true;
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    setMenuCollapsed(next);
  };

  const skipToContent = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("main-content")?.focus();
  };

  const currentUserName = user?.displayName || user?.email || "Usuario";
  const currentUserId   = employeeDetails?.personId ?? null;

  /* ── Control de acceso ── */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  /* ── Loader global ── */
  if (isLoading || (!isAuthenticated && isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        {/* Spinner con colores del tema */}
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Cargando sesión…</p>
          <p className="text-xs text-muted-foreground mt-1">Por favor espera</p>
        </div>
      </div>
    );
  }

  /* ── Sin sesión ── */
  if (!isAuthenticated) return null;

  /* ── Render principal ── */
  return (
    <div className="flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-background">
      <a
        href="#main-content"
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>

      <ResponsiveSidebarShell
        isDesktop={isDesktop}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onLogout={logout}
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={isDesktop ? sidebarCollapsed : !drawerOpen}
          mobileMenu={!isDesktop}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />

        {/* Área de contenido principal */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-hidden bg-background flex flex-col focus:outline-none"
        >
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
