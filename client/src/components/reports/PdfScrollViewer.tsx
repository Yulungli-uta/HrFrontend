// client/src/components/reports/PdfScrollViewer.tsx
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 1 punto PDF = 1/72 de pulgada; en pantalla 1 pulgada = 96 px. Con esta escala el 100 % es el tamaño real de la hoja. */
const CSS_UNITS = 96 / 72;
/** Límite del lienzo de un navegador (ancho/alto máximo); por encima se baja la nitidez en vez de fallar. */
const MAX_CANVAS_SIDE = 16000;
const PAGE_GAP = 16;
const SCROLL_STEP = 0.7;

interface PageSize {
  width: number;
  height: number;
}

interface PdfScrollViewerProps {
  /** Bytes del PDF; null mientras no hay documento. */
  data: Uint8Array | null;
  /** Zoom en %, donde 100 es el tamaño real de la hoja. */
  zoom: number;
  /** Cada vez que cambia se pide ajustar al ancho: el visor calcula el zoom y lo informa por onZoomChange. */
  fitRequest?: number;
  onZoomChange?: (zoom: number) => void;
  className?: string;
}

/**
 * Visor de PDF propio para vistas previas de reportes. A diferencia del visor nativo del navegador (un iframe cuyas
 * barras no se pueden estilizar), usa barras de desplazamiento gruesas y siempre visibles, arrastre con el ratón,
 * botones ◀ ▶ y zoom. Solo dibuja las hojas que se ven, para que un reporte de cientos de hojas no pese.
 */
export function PdfScrollViewer({ data, zoom, fitRequest = 0, onZoomChange, className }: PdfScrollViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const tasksRef = useRef<Map<number, RenderTask>>(new Map());
  const renderedRef = useRef<Map<number, number>>(new Map());
  const visibleRef = useRef<Set<number>>(new Set());
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const scale = (zoom / 100) * CSS_UNITS;

  const releaseCanvas = useCallback((index: number) => {
    tasksRef.current.get(index)?.cancel();
    tasksRef.current.delete(index);
    renderedRef.current.delete(index);
    const canvas = canvasRefs.current[index];
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }, []);

  const renderPage = useCallback(
    async (index: number) => {
      const doc = docRef.current;
      const canvas = canvasRefs.current[index];
      const pageScale = (zoomRef.current / 100) * CSS_UNITS;
      if (!doc || !canvas || renderedRef.current.get(index) === pageScale) return;

      tasksRef.current.get(index)?.cancel();
      renderedRef.current.set(index, pageScale);
      try {
        const page = await doc.getPage(index + 1);
        const viewport = page.getViewport({ scale: pageScale });
        const output = Math.min(window.devicePixelRatio || 1, 2, MAX_CANVAS_SIDE / viewport.width, MAX_CANVAS_SIDE / viewport.height);
        canvas.width = Math.floor(viewport.width * output);
        canvas.height = Math.floor(viewport.height * output);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext("2d");
        if (!context) return;
        const task = page.render({
          canvasContext: context,
          viewport,
          transform: output !== 1 ? [output, 0, 0, output, 0, 0] : undefined,
        });
        tasksRef.current.set(index, task);
        await task.promise;
      } catch (e) {
        // Una renderización cancelada por zoom o por salir de pantalla no es un error.
        if ((e as { name?: string })?.name !== "RenderingCancelledException") renderedRef.current.delete(index);
      }
    },
    [],
  );

  const renderVisible = useCallback(() => {
    visibleRef.current.forEach((index) => void renderPage(index));
  }, [renderPage]);

  // Carga el documento y mide el tamaño de cada hoja (para reservar el espacio antes de dibujarla).
  useEffect(() => {
    let cancelled = false;
    setCurrentPage(1);
    if (!data) {
      setSizes([]);
      setStatus("idle");
      return undefined;
    }

    setStatus("loading");
    setError(null);
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const doc = await pdfjs.getDocument({ data: data.slice() }).promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        docRef.current = doc;
        const measured: PageSize[] = [];
        for (let i = 1; i <= doc.numPages; i += 1) {
          const viewport = (await doc.getPage(i)).getViewport({ scale: 1 });
          measured.push({ width: viewport.width, height: viewport.height });
          if (cancelled) return;
        }
        setSizes(measured);
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudo abrir el PDF.");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      tasksRef.current.forEach((task) => task.cancel());
      tasksRef.current.clear();
      renderedRef.current.clear();
      visibleRef.current.clear();
      void docRef.current?.destroy();
      docRef.current = null;
    };
  }, [data]);

  // Observa qué hojas están cerca de la pantalla: se dibujan al acercarse y se liberan al alejarse mucho.
  useEffect(() => {
    const container = containerRef.current;
    if (status !== "ready" || !container) return undefined;

    const near = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting) {
            visibleRef.current.add(index);
            void renderPage(index);
          } else {
            visibleRef.current.delete(index);
            releaseCanvas(index);
          }
        });
      },
      { root: container, rootMargin: "900px 600px" },
    );
    pageRefs.current.forEach((el) => el && near.observe(el));
    return () => near.disconnect();
  }, [status, sizes, renderPage, releaseCanvas]);

  // Al cambiar el zoom se descarta lo dibujado y se vuelve a dibujar lo que está a la vista.
  useLayoutEffect(() => {
    if (status !== "ready") return;
    tasksRef.current.forEach((task) => task.cancel());
    tasksRef.current.clear();
    renderedRef.current.clear();
    pageRefs.current.forEach((_, index) => {
      const canvas = canvasRefs.current[index];
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    });
    renderVisible();
  }, [zoom, status, renderVisible]);

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setCanLeft(container.scrollLeft > 4);
    setCanRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 4);

    const middle = container.scrollTop + container.clientHeight / 3;
    let page = 1;
    pageRefs.current.forEach((el, index) => {
      if (el && el.offsetTop <= middle) page = index + 1;
    });
    setCurrentPage(page);
  }, []);

  useEffect(() => {
    updateScrollState();
    const container = containerRef.current;
    if (!container) return undefined;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(container);
    return () => observer.disconnect();
  }, [sizes, zoom, status, updateScrollState]);

  // Ajustar al ancho: el zoom en que la primera hoja ocupa todo el ancho útil del visor.
  useEffect(() => {
    if (fitRequest === 0 || sizes.length === 0 || !onZoomChange) return;
    const container = containerRef.current;
    if (!container) return;
    const available = container.clientWidth - 2 * PAGE_GAP - 16;
    const fit = Math.floor((available / (sizes[0].width * CSS_UNITS)) * 100);
    onZoomChange(Math.max(10, Math.min(300, fit)));
    // Solo reacciona al botón (fitRequest); no al resto de cambios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequest]);

  const scrollByPage = (direction: 1 | -1) => {
    const container = containerRef.current;
    if (container) container.scrollBy({ left: direction * container.clientWidth * SCROLL_STEP, behavior: "smooth" });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const container = event.currentTarget;
    dragRef.current = { x: event.clientX, y: event.clientY, left: container.scrollLeft, top: container.scrollTop };
    container.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start) return;
    event.currentTarget.scrollLeft = start.left - (event.clientX - start.x);
    event.currentTarget.scrollTop = start.top - (event.clientY - start.y);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={cn("relative h-full min-h-0", className)}>
      <div
        ref={containerRef}
        tabIndex={0}
        role="document"
        aria-label="Vista previa del documento"
        onScroll={updateScrollState}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          "scrollbar-prominent h-full overflow-scroll rounded-md bg-muted outline-none",
          dragging ? "cursor-grabbing select-none" : "cursor-grab",
        )}
      >
        <div className="relative flex w-max min-w-full flex-col items-start" style={{ gap: PAGE_GAP, padding: PAGE_GAP }}>
          {sizes.map((size, index) => (
            <div
              key={index}
              ref={(el) => {
                pageRefs.current[index] = el;
              }}
              data-index={index}
              className="bg-white shadow-md"
              style={{ width: size.width * scale, height: size.height * scale }}
            >
              <canvas
                ref={(el) => {
                  canvasRefs.current[index] = el;
                }}
                className="block"
              />
            </div>
          ))}
        </div>
      </div>

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Abriendo el documento…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">
          No se pudo abrir la vista previa. {error}
        </div>
      )}

      {status === "ready" && (
        <>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Desplazar a la izquierda"
            disabled={!canLeft}
            onClick={() => scrollByPage(-1)}
            className="absolute left-5 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full border shadow-lg disabled:opacity-0"
          >
            <ChevronLeft className="h-7 w-7" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Desplazar a la derecha"
            disabled={!canRight}
            onClick={() => scrollByPage(1)}
            className="absolute right-8 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full border shadow-lg disabled:opacity-0"
          >
            <ChevronRight className="h-7 w-7" />
          </Button>
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border bg-background/90 px-3 py-1 text-xs font-medium shadow">
            Hoja {currentPage} de {sizes.length}
          </div>
        </>
      )}
    </div>
  );
}
