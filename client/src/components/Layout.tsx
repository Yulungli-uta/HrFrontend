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
  const currentUserId = employeeDetails?.employeeID ?? null;

  /* -------------------------------------------
   * Control de acceso (evita layout fantasma)
   * ------------------------------------------ */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  /* -------------------------------------------
   * Loader global mientras el AuthContext trabaja
   * ------------------------------------------ */
  if (isLoading || (!isAuthenticated && isLoading)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-center text-gray-600">
          <div className="text-lg font-semibold">Cargando sesión...</div>
          <div className="text-sm">Por favor espera</div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------
   * Si no hay sesión, no mostrar layout
   * ------------------------------------------ */
  if (!isAuthenticated) return null;

  /* -------------------------------------------
   * Render normal (usuario autenticado)
   * ------------------------------------------ */
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        onLogout={logout}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onLogout={logout}
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
