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