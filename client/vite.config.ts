import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin para resolver drizzle-orm tanto en dev como en build
function drizzleResolverPlugin(): Plugin {
  return {
    name: 'drizzle-resolver',
    resolveId(id) {
      // Marcar drizzle-orm como external para evitar que Vite intente cargarlo
      if (id === 'drizzle-orm/pg-core' || id === 'drizzle-zod') {
        return { id, external: true };
      }
      return null;
    },
    // Proveer un módulo vacío para desarrollo
    load(id) {
      if (id === 'drizzle-orm/pg-core' || id === 'drizzle-zod') {
        // Retornar un módulo vacío que exporta todo lo necesario
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), drizzleResolverPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@assets': path.resolve(__dirname, '../attached_assets'),
    },
  },
  
  // ============================================
  // OPTIMIZACIONES DE BUILD
  // ============================================
  build: {
    // Aumentar el límite de advertencia de chunk size
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // ============================================
        // MANUAL CHUNKS - Separar vendors grandes
        // ============================================
        manualChunks: {
          // React y relacionados
          'react-vendor': [
            'react',
            'react-dom',
            'react/jsx-runtime',
          ],
          
          // React Router (wouter)
          'router-vendor': [
            'wouter',
          ],
          
          // React Query
          'query-vendor': [
            '@tanstack/react-query',
          ],
          
          // Radix UI - Componentes base
          'radix-base': [
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-tabs',
          ],
          
          // Radix UI - Componentes de formulario
          'radix-forms': [
            '@radix-ui/react-label',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
          ],
          
          // Radix UI - Componentes de diálogo
          'radix-dialogs': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-context-menu',
          ],
          
          // Radix UI - Otros componentes
          'radix-misc': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-progress',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-menubar',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
          ],
          
          // Formularios
          'forms-vendor': [
            'react-hook-form',
            '@hookform/resolvers',
          ],
          
          // Utilidades
          'utils-vendor': [
            'zod',
            'date-fns',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
          ],
          
          // Iconos
          'icons-vendor': [
            'lucide-react',
            'react-icons',
          ],
          
          // Otros
          'misc-vendor': [
            'framer-motion',
            'sonner',
            'react-error-boundary',
            'react-day-picker',
            '@microsoft/signalr',
          ],
        },
      },
    },
    
    // Minificación
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.log en producción
        drop_debugger: true,
      },
    },
  },
  
  // ============================================
  // OPTIMIZACIÓN DE DEPENDENCIAS
  // ============================================
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wouter',
      '@tanstack/react-query',
    ],
  },
  
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
