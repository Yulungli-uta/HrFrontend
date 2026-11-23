// src/lib/academicColors.ts
//
// Colores de las categorías y dedicaciones académicas para que se distingan de un vistazo (tarjetas y tabla de
// "Personal Docente"). Las clases se escriben completas (no se arman con plantillas) para que Tailwind las
// detecte al compilar. Un código desconocido usa el tono neutro.

export interface AcademicTone {
  /** Tarjeta: franja izquierda + fondo suave. */
  card: string;
  /** Número grande de la tarjeta. */
  value: string;
  /** Anillo de la tarjeta o chip seleccionado. */
  ring: string;
  /** Etiqueta de categoría (tabla). */
  badge: string;
  /** Etiquetas de nivel 1, 2, 3…: cada nivel un tono más intenso para que se note la progresión. */
  levels: string[];
}

const NEUTRAL: AcademicTone = {
  card: "border-l-muted-foreground/50 bg-muted-foreground/10 hover:bg-muted-foreground/25",
  value: "text-foreground ",
  ring: "ring-muted-foreground/50",
  badge: "bg-muted-foreground/15 text-foreground ",
  levels: [
    "bg-muted-foreground/15 text-foreground ",
    "bg-muted-foreground/30 text-foreground ",
    "bg-muted-foreground/45 text-foreground dark:text-white",
  ],
};

const CATEGORY_TONES: Record<string, AcademicTone> = {
  TITULAR_AUXILIAR: {
    card: "border-l-info bg-info/10 hover:bg-info/25",
    value: "text-info ",
    ring: "ring-info",
    badge: "bg-info/15 text-info ",
    levels: [
      "bg-info/15 text-info ",
      "bg-info/30 text-info ",
      "bg-info/45 text-info ",
    ],
  },
  TITULAR_AGREGADO: {
    card: "border-l-cat-3 bg-cat-3/10 hover:bg-cat-3/25",
    value: "text-cat-3 ",
    ring: "ring-cat-3",
    badge: "bg-cat-3/15 text-cat-3 ",
    levels: [
      "bg-cat-3/15 text-cat-3 ",
      "bg-cat-3/30 text-cat-3 ",
      "bg-cat-3/45 text-cat-3 ",
    ],
  },
  TITULAR_PRINCIPAL: {
    card: "border-l-warning bg-warning/10 hover:bg-warning/25",
    value: "text-warning ",
    ring: "ring-warning",
    badge: "bg-warning/15 text-warning ",
    levels: [
      "bg-warning/15 text-warning ",
      "bg-warning/30 text-warning ",
      "bg-warning/45 text-warning ",
    ],
  },
};

const DEDICATION_TONES: Record<string, AcademicTone> = {
  TC: {
    ...NEUTRAL,
    card: "border-l-success bg-success/10 hover:bg-success/25",
    value: "text-success ",
    ring: "ring-success",
    badge: "bg-success/15 text-success ",
  },
  MT: {
    ...NEUTRAL,
    card: "border-l-cat-2 bg-cat-2/10 hover:bg-cat-2/25",
    value: "text-cat-2 ",
    ring: "ring-cat-2",
    badge: "bg-cat-2/15 text-cat-2 ",
  },
  HORAS: {
    ...NEUTRAL,
    card: "border-l-destructive bg-destructive/10 hover:bg-destructive/25",
    value: "text-destructive ",
    ring: "ring-destructive",
    badge: "bg-destructive/15 text-destructive ",
  },
};

/** Tarjeta "Total": usa el color primario del tema para destacar sobre las demás. */
export const TOTAL_TONE: AcademicTone = {
  ...NEUTRAL,
  card: "border-l-primary bg-primary/10 hover:bg-primary/15",
  value: "text-primary",
  ring: "ring-primary",
};

export const categoryTone = (name?: string | null): AcademicTone => (name && CATEGORY_TONES[name]) || NEUTRAL;
export const dedicationTone = (name?: string | null): AcademicTone => (name && DEDICATION_TONES[name]) || NEUTRAL;

/** NIVEL_2 → posición 1 (para elegir el tono del nivel); desconocido → 0. */
export const levelIndex = (name?: string | null): number => {
  const m = name ? /^NIVEL_(\d+)$/.exec(name) : null;
  return m ? Math.max(0, Math.min(2, Number(m[1]) - 1)) : 0;
};
