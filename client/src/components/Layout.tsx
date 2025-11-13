import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout, user, employeeDetails } = useAuth();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const currentUserName = user?.displayName || user?.email || "Usuario";
  const currentUserId = employeeDetails?.employeeID;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        onLogout={logout} 
        collapsed={sidebarCollapsed}
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
