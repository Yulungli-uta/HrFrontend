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
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (
              id.includes("/react/") ||
              id.includes("\\react\\") ||
              id.includes("react-dom") ||
              id.includes("react/jsx-runtime")
            ) {
              return "framework";
            }

            if (id.includes("@tanstack/react-query")) {
              return "query";
            }

            if (id.includes("wouter")) {
              return "router";
            }

            if (id.includes("@radix-ui/")) {
              return "radix-ui";
            }

            if (
              id.includes("react-hook-form") ||
              id.includes("@hookform/resolvers")
            ) {
              return "forms";
            }

            if (
              id.includes("zod") ||
              id.includes("date-fns") ||
              id.includes("clsx") ||
              id.includes("tailwind-merge") ||
              id.includes("class-variance-authority")
            ) {
              return "utils";
            }

            if (
              id.includes("lucide-react") ||
              id.includes("react-icons")
            ) {
              return "icons";
            }

            if (
              id.includes("framer-motion") ||
              id.includes("sonner") ||
              id.includes("react-error-boundary") ||
              id.includes("react-day-picker") ||
              id.includes("@microsoft/signalr")
            ) {
              return "misc";
            }

            return "vendor";
          },
        },
      },
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