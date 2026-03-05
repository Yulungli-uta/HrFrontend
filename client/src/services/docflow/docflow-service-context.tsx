import { createContext, useContext, useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { IDocflowService } from "./docflow-service.interface";
import { MockDocflowService } from "./mock-docflow-service";
import { ApiDocflowService } from "./api-docflow-service";
import { Loader2 } from "lucide-react";

const DocflowServiceContext = createContext<IDocflowService | null>(null);

export function useDocflowService(): IDocflowService {
  const service = useContext(DocflowServiceContext);
  if (!service) {
    throw new Error("useDocflowService debe usarse dentro de un DocflowServiceProvider");
  }
  return service;
}

const USE_API = !!import.meta.env.VITE_DOCFLOW_API_BASE;

interface DocflowServiceProviderProps {
  children: ReactNode;
  service?: IDocflowService;
}

export function DocflowServiceProvider({ children, service }: DocflowServiceProviderProps) {
  const [isLoading, setIsLoading] = useState(USE_API && !service);
  const [initError, setInitError] = useState<string | null>(null);

  const resolvedService = useMemo(() => {
    if (service) return service;
    return USE_API ? new ApiDocflowService() : new MockDocflowService();
  }, [service]);

  useEffect(() => {
    if (!USE_API || service) return;

    const apiService = resolvedService as ApiDocflowService;
    apiService
      .init()
      .then(() => setIsLoading(false))
      .catch((err) => {
        setInitError(err?.message || "Error al conectar con el servidor");
        setIsLoading(false);
      });
  }, [resolvedService, service]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full" data-testid="loading-docflow-service">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex items-center justify-center h-screen w-full" data-testid="error-docflow-service">
        <div className="flex flex-col items-center gap-3 text-center max-w-md px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold">Error de conexion</h3>
          <p className="text-sm text-muted-foreground">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-retry-connection"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <DocflowServiceContext.Provider value={resolvedService}>
      {children}
    </DocflowServiceContext.Provider>
  );
}
