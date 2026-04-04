// components/Layout.tsx
// Estructura principal de la aplicación con soporte dark/light mode.
// Principio: usar siempre clases semánticas del tema, nunca colores hardcodeados.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, isLoading, user, employeeDetails, logout } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [, setLocation] = useLocation();

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  const currentUserName = user?.displayName || user?.email || "Usuario";
  const currentUserId   = employeeDetails?.employeeID ?? null;

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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        onLogout={logout}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onLogout={logout}
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />

        {/* Área de contenido principal */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 sm:p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
