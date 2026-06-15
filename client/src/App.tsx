// src/App.tsx
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppRouter from "./routes/AppRouter";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Ocurrió un error inesperado
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {(error instanceof Error ? error.message : null) ||
            "Por favor, recarga la página o intenta de nuevo."}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <AppRouter />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
