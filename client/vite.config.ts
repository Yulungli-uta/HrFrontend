import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin para resolver drizzle-orm en el build
function drizzleResolverPlugin(): Plugin {
  return {
    name: 'drizzle-resolver',
    resolveId(id) {
      if (id === 'drizzle-orm/pg-core' || id === 'drizzle-zod') {
        return { id, external: true };
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
