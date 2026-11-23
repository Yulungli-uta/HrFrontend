import { useEffect } from "react";

/**
 * Modo tarjeta de las tablas en móvil. Marca con `data-stack="true"` toda <table> con encabezados (y copia el texto de cada
 * encabezado como `data-label` de sus celdas); el CSS de index.css la muestra como tarjetas en pantallas < 640 px.
 *
 * Se excluyen las tablas que declaran `data-mobile="scroll"` (prop `mobile="scroll"` de <Table>) o un ancho mínimo (`min-w-…`):
 * matrices y reportes anchos, donde corresponde el desplazamiento horizontal. Se monta una sola vez en el Layout y cubre
 * <Table>, las <table> sueltas y las que aparecen en diálogos.
 */
function prepare(table: HTMLTableElement): void {
  const headers = table.querySelectorAll("thead tr:last-child th");
  const optOut =
    table.dataset.mobile === "scroll" || /(^|\s)min-w-/.test(table.className) || headers.length === 0;
  if (optOut) {
    if (table.dataset.stack) delete table.dataset.stack;
    return;
  }
  table.dataset.stack = "true";
  const labels = Array.from(headers).map((th) => (th.textContent ?? "").trim());
  table.querySelectorAll("tbody tr").forEach((tr) => {
    let col = 0;
    Array.from(tr.children).forEach((child) => {
      const cell = child as HTMLTableCellElement;
      const span = cell.colSpan || 1;
      const label = span === 1 ? labels[col] ?? "" : "";
      if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
      col += span;
    });
  });
}

export function useResponsiveTables(): void {
  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      document.querySelectorAll("table").forEach((t) => prepare(t as HTMLTableElement));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
