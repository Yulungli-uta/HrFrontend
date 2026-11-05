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
  card: "border-l-slate-500 bg-slate-500/10 hover:bg-slate-500/15",
  value: "text-slate-700 dark:text-slate-200",
  ring: "ring-slate-500",
  badge: "bg-slate-500/15 text-slate-700 dark:text-slate-200",
  levels: [
    "bg-slate-500/15 text-slate-700 dark:text-slate-200",
    "bg-slate-500/30 text-slate-800 dark:text-slate-100",
    "bg-slate-500/45 text-slate-900 dark:text-white",
  ],
};

const CATEGORY_TONES: Record<string, AcademicTone> = {
  TITULAR_AUXILIAR: {
    card: "border-l-sky-500 bg-sky-500/10 hover:bg-sky-500/15",
    value: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    levels: [
      "bg-sky-500/15 text-sky-700 dark:text-sky-300",
      "bg-sky-500/30 text-sky-800 dark:text-sky-200",
      "bg-sky-500/45 text-sky-900 dark:text-sky-100",
    ],
  },
  TITULAR_AGREGADO: {
    card: "border-l-violet-500 bg-violet-500/10 hover:bg-violet-500/15",
    value: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    levels: [
      "bg-violet-500/15 text-violet-700 dark:text-violet-300",
      "bg-violet-500/30 text-violet-800 dark:text-violet-200",
      "bg-violet-500/45 text-violet-900 dark:text-violet-100",
    ],
  },
  TITULAR_PRINCIPAL: {
    card: "border-l-amber-500 bg-amber-500/10 hover:bg-amber-500/15",
    value: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    levels: [
      "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      "bg-amber-500/30 text-amber-800 dark:text-amber-200",
      "bg-amber-500/45 text-amber-900 dark:text-amber-100",
    ],
  },
};

const DEDICATION_TONES: Record<string, AcademicTone> = {
  TC: {
    ...NEUTRAL,
    card: "border-l-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15",
    value: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  MT: {
    ...NEUTRAL,
    card: "border-l-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/15",
    value: "text-cyan-600 dark:text-cyan-400",
    ring: "ring-cyan-500",
    badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
  HORAS: {
    ...NEUTRAL,
    card: "border-l-rose-500 bg-rose-500/10 hover:bg-rose-500/15",
    value: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
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
