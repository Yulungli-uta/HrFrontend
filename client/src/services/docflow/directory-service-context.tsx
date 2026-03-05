import { createContext, useContext, useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { IDirectoryParametersService } from "@/types/docflow/directory.types";
import { MockDirectoryParametersService } from "./mock-directory-service";
import { ApiDirectoryParametersService } from "./api-directory-service";
import { Loader2 } from "lucide-react";

const DirectoryServiceContext = createContext<IDirectoryParametersService | null>(null);

export function useDirectoryService(): IDirectoryParametersService {
  const service = useContext(DirectoryServiceContext);
  if (!service) {
    throw new Error("useDirectoryService debe usarse dentro de un DirectoryServiceProvider");
  }
  return service;
}

const USE_API = !!import.meta.env.VITE_DOCFLOW_API_BASE;

interface DirectoryServiceProviderProps {
  children: ReactNode;
  service?: IDirectoryParametersService;
}

export function DirectoryServiceProvider({ children, service }: DirectoryServiceProviderProps) {
  const [isLoading, setIsLoading] = useState(USE_API && !service);

  const resolvedService = useMemo(() => {
    if (service) return service;
    return USE_API ? new ApiDirectoryParametersService() : new MockDirectoryParametersService();
  }, [service]);

  useEffect(() => {
    if (!USE_API || service) return;

    const apiService = resolvedService as ApiDirectoryParametersService;
    apiService
      .init()
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));
  }, [resolvedService, service]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8" data-testid="loading-directory-service">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando catalogos...</span>
        </div>
      </div>
    );
  }

  return (
    <DirectoryServiceContext.Provider value={resolvedService}>
      {children}
    </DirectoryServiceContext.Provider>
  );
}
