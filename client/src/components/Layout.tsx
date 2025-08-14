import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export default function Layout({ children, onLogout }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 flex flex-col">
        <Header onLogout={onLogout || (() => {})} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
