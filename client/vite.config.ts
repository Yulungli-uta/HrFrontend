import { defineConfig, Plugin, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function drizzleResolverPlugin(): Plugin {
  return {
    name: "drizzle-resolver",
    resolveId(id) {
      if (id === "drizzle-orm/pg-core" || id === "drizzle-zod") {
        return { id, external: true };
      }
      return null;
    },
    load(id) {
      if (id === "drizzle-orm/pg-core" || id === "drizzle-zod") {
        return `
          export const pgTable = () => ({});
          export const text = () => ({});
          export const varchar = () => ({});
          export const integer = () => ({});
          export const decimal = () => ({});
          export const timestamp = () => ({});
          export const date = () => ({});
          export const boolean = () => ({});
          export const bigint = () => ({});
          export const real = () => ({});
          export const createInsertSchema = () => ({});
        `;
      }
      return null;
    },
  };
}

function normalizeBase(base: string | undefined): string {
  const b = (base && base.trim()) || "/";
  if (b === "/") return "/";
  const withLeading = b.startsWith("/") ? b : `/${b}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

export default defineConfig(({ mode }) => {
  // ✅ más seguro que process.cwd(): siempre carga env desde donde vive vite.config.ts
  const env = loadEnv(mode, __dirname, "");

  const base = normalizeBase(env.VITE_BASE_PATH);

  return {
    base,

    plugins: [react(), drizzleResolverPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../shared"),
        "@assets": path.resolve(__dirname, "../attached_assets"),
      },
    },

    build: {
      chunkSizeWarningLimit: 1000,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react/jsx-runtime"],
            "router-vendor": ["wouter"],
            "query-vendor": ["@tanstack/react-query"],
            "radix-base": [
              "@radix-ui/react-slot",
              "@radix-ui/react-toast",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-accordion",
              "@radix-ui/react-tabs",
            ],
            "radix-forms": [
              "@radix-ui/react-label",
              "@radix-ui/react-checkbox",
              "@radix-ui/react-radio-group",
              "@radix-ui/react-select",
              "@radix-ui/react-switch",
              "@radix-ui/react-slider",
            ],
            "radix-dialogs": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-alert-dialog",
              "@radix-ui/react-popover",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-context-menu",
            ],
            "radix-misc": [
              "@radix-ui/react-avatar",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-separator",
              "@radix-ui/react-progress",
              "@radix-ui/react-hover-card",
              "@radix-ui/react-navigation-menu",
              "@radix-ui/react-menubar",
              "@radix-ui/react-collapsible",
              "@radix-ui/react-aspect-ratio",
              "@radix-ui/react-toggle",
              "@radix-ui/react-toggle-group",
            ],
            "forms-vendor": ["react-hook-form", "@hookform/resolvers"],
            "utils-vendor": [
              "zod",
              "date-fns",
              "clsx",
              "tailwind-merge",
              "class-variance-authority",
            ],
            "icons-vendor": ["lucide-react", "react-icons"],
            "misc-vendor": [
              "framer-motion",
              "sonner",
              "react-error-boundary",
              "react-day-picker",
              "@microsoft/signalr",
            ],
          },
        },
      },
      minify: "terser",
    },

    optimizeDeps: {
      include: ["react", "react-dom", "wouter", "@tanstack/react-query"],
    },

    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  };
});
