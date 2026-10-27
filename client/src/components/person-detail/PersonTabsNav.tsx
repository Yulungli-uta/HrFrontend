// src/components/person-detail/PersonTabsNav.tsx
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResearchProjectsAPI } from "@/lib/api";

export interface PersonTab {
  value: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

interface PersonTabsNavProps {
  tabs: readonly PersonTab[];
  active: string;
  /** Cantidad de registros por pestaña (solo se muestra si es mayor que 0). */
  counts: Record<string, number | undefined>;
  personId: number;
}

/**
 * Navegación de la hoja de vida: en pantallas medianas y grandes las pestañas se reparten en varias filas (todas
 * visibles, sin scroll oculto); en móvil van en una fila con flechas y degradado en los bordes que avisan que hay más.
 * Cada pestaña muestra cuántos registros tiene, para que se note de un vistazo dónde hay información.
 */
export function PersonTabsNav({ tabs, active, counts, personId }: PersonTabsNavProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Misma consulta que usa la pestaña "Investigación" (se comparte la caché): aquí solo para el contador.
  const { data: research } = useQuery({
    queryKey: ["research-participations", personId],
    queryFn: () => ResearchProjectsAPI.getByPerson(personId),
  });
  const allCounts: Record<string, number | undefined> = { ...counts, research: research?.status === "success" ? research.data.length : undefined };

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      observer.disconnect();
    };
  }, [tabs.length]);

  // En móvil, la pestaña elegida se centra para que se vea qué hay a su lado.
  useEffect(() => {
    scrollerRef.current?.querySelector('[data-state="active"]')?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const scrollBy = (delta: number) => scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });

  return (
    <div className="relative">
      {canLeft && (
        <button
          type="button"
          aria-label="Ver pestañas anteriores"
          className="absolute left-0 top-0 z-10 flex h-full w-8 items-center justify-start rounded-l-lg bg-gradient-to-r from-background via-background/80 to-transparent md:hidden"
          onClick={() => scrollBy(-200)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Ver más pestañas"
          className="absolute right-0 top-0 z-10 flex h-full w-8 items-center justify-end rounded-r-lg bg-gradient-to-l from-background via-background/80 to-transparent md:hidden"
          onClick={() => scrollBy(200)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div ref={scrollerRef} className="overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList className="flex h-auto w-max min-w-full flex-nowrap justify-start gap-1 rounded-lg bg-muted p-1 md:w-full md:flex-wrap">
          {tabs.map(({ value, icon: Icon, label }) => {
            const count = allCounts[value];
            return (
              <TabsTrigger key={value} value={value} className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm data-[state=active]:bg-card">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
                {count ? (
                  <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold leading-5 text-primary" aria-label={`${count} registros`}>
                    {count}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </div>
  );
}
