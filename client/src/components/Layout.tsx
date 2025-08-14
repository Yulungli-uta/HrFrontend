import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export default function Layout({ children, onLogout }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
