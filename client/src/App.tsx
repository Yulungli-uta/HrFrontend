// src/App.tsx
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth";
import { UserPreferencesProvider } from "@/features/preferences";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrowserCompatibilityDialog } from "@/components/BrowserCompatibilityDialog";
import AppRouter from "./routes/AppRouter";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="text-center max-w-md">
        <div className="text-destructive text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Ocurrió un error inesperado
        </h2>
        <p className="text-muted-foreground mb-4">
          {(error instanceof Error ? error.message : null) ||
            "Por favor, recarga la página o intenta de nuevo."}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
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
            <UserPreferencesProvider>
              <TooltipProvider>
                <BrowserCompatibilityDialog />
                <AppRouter />
                <Toaster />
              </TooltipProvider>
            </UserPreferencesProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
