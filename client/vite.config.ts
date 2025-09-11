import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url'; // Importar esto para manejar import.meta

// Obtener el directorio actual
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // runtimeErrorOverlay(), // Comenta si no estás en Replit
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          // Comenta si no estás en Replit
          // await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer())
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Cambiado a ruta relativa
      "@shared": path.resolve(__dirname, "../shared"), // Si necesitas esto
      "@assets": path.resolve(__dirname, "../attached_assets") // Si necesitas esto
    },
  },
  root: path.resolve(__dirname, "./"), // Cambiado al directorio actual
  build: {
    outDir: path.resolve(__dirname, "../dist/public"), // Ajustado
    emptyOutDir: true,
  },
  server: {
    proxy: { // Añade esta sección para conectar con el backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false
      }
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg'],
});