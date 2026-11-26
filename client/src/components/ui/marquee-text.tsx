import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MarqueeTextProps {
  children: ReactNode;
  /** Texto completo para el tooltip nativo (táctil y movimiento reducido). */
  title?: string;
  className?: string;
}

/**
 * Texto de una sola línea que, si no cabe, se corta con "…" y, al pasar el mouse, enfocar o resaltar la fila
 * (padre con la clase `group`), se desplaza de lado para leerse completo. Nunca sale de su región: el contenedor
 * recorta (overflow hidden) y no cambia el tamaño del padre. Con "movimiento reducido" no se anima (regla global)
 * y queda el tooltip con el texto completo. Estilos en index.css (.marquee).
 */
export function MarqueeText({ children, title, className }: MarqueeTextProps) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    // scrollWidth del texto = ancho completo aunque esté recortado
    const extra = inner.scrollWidth - outer.clientWidth;
    setShift(extra > 1 ? Math.ceil(extra) : 0);
  }, []);

  useEffect(() => {
    measure();
    const outer = outerRef.current;
    if (!outer || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [measure, children]);

  const overflowing = shift > 0;
  const style = overflowing
    ? ({ "--marquee-shift": `-${shift}px`, "--marquee-duration": `${Math.max(3, 1.5 + shift / 40)}s` } as CSSProperties)
    : undefined;

  return (
    <span ref={outerRef} className={cn("marquee block min-w-0 overflow-hidden whitespace-nowrap", className)} title={overflowing ? title : undefined}>
      <span ref={innerRef} className="marquee-inner" data-overflow={overflowing} style={style}>
        {children}
      </span>
    </span>
  );
}
