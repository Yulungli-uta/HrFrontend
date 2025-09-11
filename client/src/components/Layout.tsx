import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout } = useAuth();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        onLogout={logout} 
        collapsed={sidebarCollapsed}
      />
      <div className="flex-1 flex flex-col">
        <Header 
          onLogout={logout} 
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}