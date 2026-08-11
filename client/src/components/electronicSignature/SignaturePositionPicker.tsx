// src/components/electronicSignature/SignaturePositionPicker.tsx
// Selector interactivo de ubicacion Y tamaño del sello de firma: FirmaEC no ofrece esto
// en su cliente, asi que se construye aqui. El usuario ve el PDF real y dibuja (clic +
// arrastrar) el recuadro donde quiere el sello; un clic simple sin arrastrar usa un
// tamaño por defecto razonable. Se manda {page, llx, lly, width, height} al backend —
// llx/lly son la posicion, width/height el tamaño absoluto del sello en puntos (ver
// nota en FirmaEcClient.BuildLaunchUrl sobre por que no son "llx+ancho").
import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Tamaño por defecto cuando el usuario hace un clic simple sin arrastrar. Debe ser
// razonable como punto de partida; el arrastre libre reemplaza esto por completo.
const DEFAULT_STAMP_WIDTH_PT = 100;
const DEFAULT_STAMP_HEIGHT_PT = 100;
const MIN_STAMP_PT = 20;
const CANVAS_MAX_WIDTH = 560;
const CANVAS_MAX_HEIGHT = 620;
const THUMBNAIL_WIDTH = 70;

export interface SignaturePosition {
  page: number;
  llx: number;
  lly: number;
  width: number;
  height: number;
}

interface Props {
  open: boolean;
  documentBlob: Blob | null;
  onConfirm: (position: SignaturePosition) => void;
  onCancel: () => void;
}

type PxBox = { x: number; y: number; width: number; height: number };

export function SignaturePositionPicker({ open, documentBlob, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [scale, setScale] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<PxBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // Carga el documento y ubica la vista en la ultima pagina por defecto.
  useEffect(() => {
    if (!open || !documentBlob) return;
    setLoading(true);
    setPdf(null);
    setBox(null);
    setThumbnails([]);
    let cancelled = false;
    documentBlob.arrayBuffer().then(async (buffer) => {
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      if (cancelled) return;
      setPdf(doc);
      setPageIndex(doc.numPages);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, documentBlob]);

  // Genera miniaturas de todas las páginas para la tira de navegación.
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    (async () => {
      const results: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return;
        const page = await pdf.getPage(i);
        const baseViewport = page.getViewport({ scale: 1 });
        const thumbScale = THUMBNAIL_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale: thumbScale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        results.push(canvas.toDataURL());
      }
      if (!cancelled) setThumbnails(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  // Renderiza la pagina actual, acotando tanto ancho como alto para que el dialog
  // completo (incluido el pie con "Confirmar") siempre quepa en la pantalla.
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    pdf.getPage(pageIndex).then((page) => {
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const renderScale = Math.min(CANVAS_MAX_WIDTH / baseViewport.width, CANVAS_MAX_HEIGHT / baseViewport.height, 1.5);
      const viewport = page.getViewport({ scale: renderScale });
      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setScale(renderScale);
      setPageSize({ width: baseViewport.width, height: baseViewport.height });
      setBox(null);
      const context = canvas.getContext("2d")!;
      page.render({ canvasContext: context, viewport });
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageIndex]);

  const clampBox = (x: number, y: number, width: number, height: number): PxBox => {
    const canvasW = pageSize.width * scale;
    const canvasH = pageSize.height * scale;
    const w = Math.min(width, canvasW);
    const h = Math.min(height, canvasH);
    return {
      x: Math.min(Math.max(x, 0), canvasW - w),
      y: Math.min(Math.max(y, 0), canvasH - h),
      width: w,
      height: h,
    };
  };

  const canvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = canvasPoint(e);
    setDragStart(p);
    setBox(clampBox(p.x, p.y, 1, 1));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStart) return;
    const p = canvasPoint(e);
    const x = Math.min(dragStart.x, p.x);
    const y = Math.min(dragStart.y, p.y);
    const width = Math.abs(p.x - dragStart.x);
    const height = Math.abs(p.y - dragStart.y);
    setBox(clampBox(x, y, width, height));
  };

  const handleMouseUp = () => {
    if (!dragStart || !box) {
      setDragStart(null);
      return;
    }
    // Si el movimiento fue minimo (un clic simple, no un arrastre real), usar el
    // tamaño por defecto centrado en el punto en vez de un recuadro casi invisible.
    if (box.width < MIN_STAMP_PT * scale || box.height < MIN_STAMP_PT * scale) {
      setBox(clampBox(dragStart.x - (DEFAULT_STAMP_WIDTH_PT * scale) / 2, dragStart.y - (DEFAULT_STAMP_HEIGHT_PT * scale) / 2, DEFAULT_STAMP_WIDTH_PT * scale, DEFAULT_STAMP_HEIGHT_PT * scale));
    }
    setDragStart(null);
  };

  // FirmaEC dibuja el QR ocupando aprox. un cuadrado del alto declarado (ury) y, a la
  // derecha de ESE cuadrado, una etiqueta de texto fija ("Validar unicamente en FirmaEC /
  // Firmado electronicamente por: ..."). Confirmado con render real: si el ancho
  // declarado (urx) no deja espacio despues del cuadrado del QR, la etiqueta queda
  // recortada/superpuesta por el propio QR (no es un choque con contenido del documento,
  // es que la anotacion es mas angosta de lo que la etiqueta necesita). El espacio extra
  // que requiere la etiqueta es aprox. FIJO, no proporcional al ancho que dibuje el
  // usuario: una prueba con extra=164pt (200x36) no mostro recorte; una con extra=35pt
  // (91x56, tras aplicar un factor multiplicativo sobre un recuadro angosto) si lo mostro.
  const LABEL_EXTRA_WIDTH_PT = 170;

  const handleConfirm = () => {
    if (!box) return;
    // Convertir a espacio PDF: el backend usa (llx,lly) como esquina inferior-izquierda
    // estandar y arma el rect final como [llx, lly, llx+width, lly+height] (confirmado
    // contra documentos reales) — aqui se manda la esquina inferior del recuadro dibujado.
    // El alto queda tal cual lo definio el usuario (nunca se le agrega margen). El ancho
    // se garantiza como minimo "alto + margen fijo de etiqueta"; si el usuario ya dibujo
    // un recuadro mas ancho que eso, se respeta su ancho tal cual.
    const llx = Math.round(box.x / scale);
    const lly = Math.round(pageSize.height - (box.y + box.height) / scale);
    const height = Math.round(box.height / scale);
    const drawnWidth = Math.round(box.width / scale);
    const minWidthForLabel = height + LABEL_EXTRA_WIDTH_PT;
    const maxWidthOnPage = Math.max(minWidthForLabel, Math.floor(pageSize.width - llx - 5));
    const width = Math.min(Math.max(drawnWidth, minWidthForLabel), maxWidthOnPage);
    onConfirm({ page: pageIndex, llx, lly, width, height });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Elige dónde y de qué tamaño va tu firma</DialogTitle>
          <DialogDescription>
            Haz clic y arrastra sobre el documento para dibujar el recuadro donde quieres el sello. Un clic simple usa un tamaño estándar.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && pdf && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            <div className="mx-auto w-fit shrink-0 rounded border shadow-sm">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="cursor-crosshair select-none"
                />
                {box && (
                  <div
                    className="pointer-events-none absolute border-2 border-primary bg-primary/20"
                    style={{ width: box.width, height: box.height, left: box.x, top: box.y }}
                  />
                )}
              </div>
            </div>

            {pdf.numPages > 1 && (
              <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-1 py-1">
                {thumbnails.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPageIndex(i + 1)}
                    className={cn(
                      "shrink-0 overflow-hidden rounded border-2 transition-colors",
                      pageIndex === i + 1 ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={src} alt={`Página ${i + 1}`} className="block" />
                    <span className="block bg-muted py-0.5 text-center text-[10px] text-muted-foreground">{i + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!box}>
            Confirmar y firmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
