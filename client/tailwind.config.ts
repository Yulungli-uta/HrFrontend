import type { Config } from "tailwindcss";

/**
 * Los tokens de color (--primary, --success, …) son colores COMPLETOS (hsl(...)), no canales sueltos, por lo que Tailwind
 * no puede aplicarles opacidad: sin esto, clases como `bg-primary/10`, `hover:bg-primary/90` o `border-destructive/30`
 * no generaban CSS y quedaban transparentes. Cada token se declara como función que, cuando hay modificador de opacidad,
 * usa color-mix; sin modificador devuelve el color tal cual.
 */
type AlphaColor = (options: { opacityValue?: string | number }) => string;
const withAlpha = (cssVar: string): AlphaColor => ({ opacityValue }) => {
  // Sin modificador Tailwind pasa `undefined` o su variable interna de opacidad: se devuelve el color tal cual.
  if (opacityValue === undefined) return `var(${cssVar})`;
  const raw = String(opacityValue);
  if (raw.includes("var(")) return `var(${cssVar})`;
  const numeric = Number(raw);
  const percent = Number.isNaN(numeric) ? `calc(${raw} * 100%)` : `${Math.round(numeric * 10000) / 100}%`;
  return `color-mix(in srgb, var(${cssVar}) ${percent}, transparent)`;
};
/** Convierte recursivamente cada "var(--x)" de un grupo de colores en su versión con soporte de opacidad. */
const alphaTokens = <T extends Record<string, unknown>>(colors: T): T =>
  Object.fromEntries(
    Object.entries(colors).map(([key, value]) => {
      if (typeof value === "string") {
        const match = /^var\((--[\w-]+)\)$/.exec(value);
        return [key, match ? withAlpha(match[1]) : value];
      }
      return [key, value && typeof value === "object" ? alphaTokens(value as Record<string, unknown>) : value];
    }),
  ) as T;

export default {
  darkMode: ["class"],
  //content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  content: [
    "./index.html", // Actualizado
    "./src/**/*.{js,jsx,ts,tsx}" // Actualizado
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: alphaTokens({
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Custom colors from design reference
        surface: "var(--surface)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        // UTA Brand Colors
        "uta-blue": {
          DEFAULT: "#1e40af",
          light: "#3b82f6",
          dark: "#1e3a8a",
        },
        "uta-orange": {
          DEFAULT: "#f97316", 
          light: "#fb923c",
          dark: "#ea580c",
        },
      }),
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        inter: ["Inter", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
