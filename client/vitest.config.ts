import { defineConfig } from "vitest/config";

// Config mínima y separada de vite.config.ts (que tiene lógica de build específica del
// proyecto) — las pruebas actuales son sobre módulos puros de TypeScript, sin DOM, así
// que no hace falta jsdom ni los plugins de build.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
