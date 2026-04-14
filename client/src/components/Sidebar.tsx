// src/components/Sidebar.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Users, LayoutDashboard, Clock, CalendarCheck, DollarSign, Building2,
  FileText, Settings, Calendar, ClipboardList, UserCog, Timer, LogOut,
  Folder, Bell, ShieldCheck, HardHat, ClipboardCheck, FileCheck,
  FileWarning, FileSignature, FileSearch, FileClock, FileSpreadsheet,
  FilePlus, User, Briefcase, BadgeCheck, Handshake, GraduationCap,
  BookOpen, PenSquare, Clipboard, AlarmClock, CalendarDays, CalendarX,
  CalendarPlus, CalendarSearch, CalendarClock, Cog, Info, HelpCircle,
  MessageSquare, Settings2, Layers, PanelLeftClose, PanelLeftOpen,
  ChevronDown, ChevronRight, Loader2, User2, ChartLine, Search,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import logoPath from "@/assets/LogoUTA.png";

const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";
const logSidebar = (...args: any[]) => { if (DEBUG) console.log("[SIDEBAR]", ...args); };

/* ─── Tipos ─────────────────────────────────────────────────────────────── */
interface NavItem  { id: number; path: string; label: string; icon: React.ComponentType<any>; }
interface NavGroup { id: number; title: string; icon: React.ComponentType<any>; initiallyOpen?: boolean; items: NavItem[]; }
interface NormalizedMenuItem { id: number; parentId: number | null; name: string; url: string | null; icon: string; order: number; }
interface SidebarProps { collapsed: boolean; onToggle: () => void; onLogout?: () => void; }
interface SidebarFooterProps { collapsed: boolean; userName?: string; userType?: string; onLogout: () => void; }

/* ─── Mapa de íconos ─────────────────────────────────────────────────────── */
const iconMap: Record<string, React.ComponentType<any>> = {
  Dashboard: LayoutDashboard, Users, Clock, CalendarCheck, DollarSign,
  Building2, FileText, Settings, Calendar, ClipboardList, UserCog, Timer,
  LogOut, Bell, ShieldCheck, HardHat, ClipboardCheck, FileCheck, FileWarning,
  FileSignature, FileSearch, FileClock, FileSpreadsheet, FilePlus, User,
  Briefcase, BadgeCheck, Handshake, GraduationCap, BookOpen, PenSquare,
  Clipboard, AlarmClock, CalendarDays, CalendarX, CalendarPlus, CalendarSearch,
  CalendarClock, Cog, Info, HelpCircle, MessageSquare, Settings2, Layers,
  ChartLine, Folder,
};

/* ─── Subcomponente: Footer del sidebar ─────────────────────────────────── */
const SidebarFooter: React.FC<SidebarFooterProps> = ({ collapsed, userName, userType, onLogout }) => (
  <div className="sidebar-footer mt-auto shrink-0">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {/* Avatar */}
      <div className="shrink-0 w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center">
        <User2 className="h-3.5 w-3.5 text-sidebar-accent-foreground" />
      </div>
      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
            {userName || "Usuario"}
          </span>
          <span className="text-[10px] text-sidebar-foreground/60 truncate leading-tight">
            {userType === "AzureAD" ? "Cuenta institucional" : "Usuario local"}
          </span>
        </div>
      )}
    </div>
    <button
      onClick={onLogout}
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      className="shrink-0 p-1.5 rounded-lg text-sidebar-foreground/60
                 hover:bg-destructive/15 hover:text-destructive
                 transition-all duration-200 focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LogOut className="h-4 w-4" />
    </button>
  </div>
);

/* ─── Subcomponente: Cabecera del sidebar ───────────────────────────────── */
interface SidebarHeaderProps { collapsed: boolean; onToggle: () => void; }
const SidebarHeader: React.FC<SidebarHeaderProps> = ({ collapsed, onToggle }) => (
  <div className="shrink-0 border-b border-sidebar-border px-3 py-3">
    <div className="flex items-center justify-between gap-2">
      {/* Logo + nombre */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <img
          src={logoPath}
          alt="UTA"
          className="h-8 w-8 shrink-0 object-contain"
        />
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-sidebar-primary leading-tight truncate">
              Universidad Técnica
            </span>
            <span className="text-xs font-bold text-sidebar-primary leading-tight truncate">
              de Ambato
            </span>
            <span className="text-[10px] text-sidebar-foreground/50 leading-tight truncate mt-0.5">
              Sistema de RRHH
            </span>
          </div>
        )}
      </div>
      {/* Botón colapsar */}
      <button
        onClick={onToggle}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg
                   text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                   transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {collapsed
          ? <PanelLeftOpen className="h-4 w-4" />
          : <PanelLeftClose className="h-4 w-4" />
        }
      </button>
    </div>
  </div>
);

/* ─── Componente principal ───────────────────────────────────────────────── */
const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, onLogout }) => {
  const [location] = useLocation();
  const [navGroups, setNavGroups]   = useState<NavGroup[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const { user, isAuthenticated, isLoading } = useAuth();

  /* ── Normalización de ítems del menú ── */
  const normalizeMenuItem = (item: any): NormalizedMenuItem => ({
    id:       item.menuItemId ?? item.id,
    parentId: item.parentId === undefined || item.parentId === null ? null : item.parentId,
    name:     item.menuItemName ?? item.name ?? "",
    url:      item.url ?? null,
    icon:     item.icon ?? "Folder",
    order:    item.order ?? 0,
  });

  /* ── Construcción del árbol de navegación ── */
  useEffect(() => {
    if (!user || typeof (user as any).menuItems === "undefined") {
      setNavGroups([]);
      return;
    }

    const rawItems: any[] = (user.menuItems || []) as any[];
    if (!rawItems.length) { setNavGroups([]); return; }

    const normalized = rawItems.map(normalizeMenuItem);
    const roots = normalized
      .filter(m => m.parentId === null || m.parentId === 0)
      .sort((a, b) => a.order - b.order);

    const groups: NavGroup[] = roots
      .map(root => {
        const IconComponent = iconMap[root.icon] || Folder;
        const children = normalized
          .filter(item => item.parentId === root.id && item.url !== null)
          .sort((a, b) => a.order - b.order)
          .map(item => ({
            id:    item.id,
            path:  item.url || "#",
            label: item.name,
            icon:  iconMap[item.icon] || FileText,
          }));
        return { id: root.id, title: root.name, icon: IconComponent, initiallyOpen: children.length > 0, items: children };
      })
      .filter(g => g.items.length > 0);

    DEBUG && logSidebar("NavGroups finales", groups);
    setNavGroups(groups);

    const initialOpen: Record<string, boolean> = {};
    groups.forEach(g => { initialOpen[g.id.toString()] = g.initiallyOpen || false; });
    setOpenGroups(initialOpen);
  }, [user]);

  const toggleGroup = (key: string) =>
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  /* ── Detección de ruta activa ── */
  const normalizePath = (p: string) => {
    const t = (p || "/").replace(/\/+$/, "");
    return t === "" ? "/" : t;
  };
  const isActivePath = (path: string) => {
    const current = normalizePath(location);
    const target  = normalizePath(path);
    if (target === "/") return current === "/";
    return current === target || current.startsWith(target + "/");
  };

  /* ── Filtro de búsqueda ── */
  const filteredNavGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return navGroups;
    return navGroups
      .map(group => {
        const groupMatches  = group.title.toLowerCase().includes(term);
        const filteredItems = group.items.filter(i => i.label.toLowerCase().includes(term));
        if (!groupMatches && filteredItems.length === 0) return null;
        return { ...group, items: groupMatches ? group.items : filteredItems };
      })
      .filter(Boolean) as NavGroup[];
  }, [navGroups, searchTerm]);

  const handleLogout = () => { if (onLogout) onLogout(); };
  const currentUserName = user?.displayName || user?.email || "Usuario";

  /* ── Clases base del aside ── */
  const asideClass = `${collapsed ? "w-16" : "w-60"} h-screen flex flex-col
    sidebar-base shadow-lg transition-all duration-300 ease-in-out shrink-0`;

  /* ── Estado: cargando ── */
  if (isLoading || (isAuthenticated && user && typeof (user as any).menuItems === "undefined")) {
    return (
      <aside className={asideClass}>
        <SidebarHeader collapsed={collapsed} onToggle={onToggle} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-sidebar-primary" />
          {!collapsed && (
            <span className="ml-2 text-xs text-sidebar-foreground/60 animate-pulse">
              Cargando menú…
            </span>
          )}
        </div>
      </aside>
    );
  }

  /* ── Estado: sin menús asignados ── */
  if (isAuthenticated && navGroups.length === 0) {
    return (
      <aside className={asideClass}>
        <SidebarHeader collapsed={collapsed} onToggle={onToggle} />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
            <Folder className="h-5 w-5 text-sidebar-accent-foreground" />
          </div>
          {!collapsed && (
            <>
              <p className="text-xs font-semibold text-sidebar-foreground">Sin opciones de menú</p>
              <p className="text-[10px] text-sidebar-foreground/50 leading-relaxed">
                Contacta al administrador para asignar tus permisos.
              </p>
            </>
          )}
        </div>
        <SidebarFooter
          collapsed={collapsed}
          userName={user?.displayName || user?.email}
          userType={user?.userType}
          onLogout={handleLogout}
        />
      </aside>
    );
  }

  /* ── Render principal ── */
  return (
    <aside className={asideClass}>

      {/* ── Cabecera ── */}
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} />

      {/* ── Búsqueda (solo expandido) ── */}
      {!collapsed && (      
      <div className="shrink-0 border-b border-sidebar-border px-3 pb-2 pt-2.5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en el menú..."
            className="
              w-full rounded-xl border border-border
              bg-background
              py-2 pl-10 pr-3
              text-sm text-foreground
              placeholder:text-muted-foreground
              shadow-sm
              outline-none
              transition-all duration-200

              hover:bg-muted/40
              focus:border-primary/50
              focus:ring-2 focus:ring-primary/20

              dark:border-slate-700
              dark:bg-slate-900
              dark:text-slate-100
              dark:placeholder:text-slate-400
              dark:hover:bg-slate-800
            "
          />
        </div>
      </div>
    )}

      {/* ── Navegación ── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5" aria-label="Menú principal">
        {filteredNavGroups.map(group => {
          const groupKey = group.id.toString();
          const isOpen   = openGroups[groupKey] ?? group.initiallyOpen ?? false;
          const GroupIcon = group.icon || Folder;

          return (
            <div key={groupKey}>
              {/* ── Encabezado de grupo ── */}
              <button
                onClick={() => toggleGroup(groupKey)}
                aria-expanded={isOpen}
                className={`sidebar-group-header w-full mb-0.5
                  ${isOpen ? "sidebar-group-header-open" : ""}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <GroupIcon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wide">
                      {group.title}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <span className="shrink-0 transition-transform duration-200" style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>

              {/* ── Ítems del grupo ── */}
              {isOpen && (
                <div className="ml-2 mb-1 space-y-0.5 border-l-2 border-sidebar-border pl-2">
                  {group.items.map(item => {
                    const ItemIcon = item.icon;
                    const active   = isActivePath(item.path);
                    return (
                      <Link
                        key={item.id}
                        href={item.path}
                        className={`sidebar-item group relative
                          ${active ? "sidebar-item-active font-semibold" : ""}`}
                        aria-current={active ? "page" : undefined}
                      >
                        {/* Indicador activo */}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[10px]
                                           w-0.5 h-4 rounded-full bg-sidebar-primary-foreground" />
                        )}
                        <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                        {!collapsed && (
                          <span className="truncate text-[11px]">{item.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Sin resultados de búsqueda ── */}
        {!collapsed && searchTerm.trim() && filteredNavGroups.length === 0 && (
          <div className="flex flex-col items-center py-6 gap-2 text-center px-2">
            <Search className="h-5 w-5 text-sidebar-foreground/30" />
            <p className="text-[10px] text-sidebar-foreground/50 leading-relaxed">
              Sin resultados para <strong>"{searchTerm.trim()}"</strong>
            </p>
          </div>
        )}
      </nav>

      {/* ── Footer ── */}
      <SidebarFooter
        collapsed={collapsed}
        userName={currentUserName}
        userType={user?.userType}
        onLogout={handleLogout}
      />
    </aside>
  );
};

export default Sidebar;
