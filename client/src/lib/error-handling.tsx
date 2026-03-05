import { Component, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  WifiOff,
  ShieldAlert,
  Ban,
  ServerCrash,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Inbox,
} from "lucide-react";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: ApiError };

export const API_ERROR_MESSAGES: Record<number, string> = {
  400: "La solicitud contiene datos invalidos. Verifica la informacion ingresada.",
  401: "Tu sesion ha expirado o no tienes autorizacion. Inicia sesion nuevamente.",
  403: "No tienes permisos para realizar esta accion.",
  404: "El recurso solicitado no fue encontrado.",
  409: "Existe un conflicto con el estado actual del recurso.",
  422: "Los datos enviados no son validos. Revisa los campos marcados.",
  429: "Has realizado demasiadas solicitudes. Espera un momento e intenta de nuevo.",
  500: "Ocurrio un error interno en el servidor. Intenta mas tarde.",
  502: "El servidor no esta disponible temporalmente.",
  503: "El servicio no esta disponible en este momento. Intenta mas tarde.",
  0: "No se pudo conectar con el servidor. Verifica tu conexion a internet.",
};

export function getErrorMessage(status: number): string {
  return API_ERROR_MESSAGES[status] || `Error inesperado (codigo ${status}). Contacta al administrador.`;
}

export function createApiError(
  status: number,
  message: string,
  code?: string,
  details?: ApiErrorDetail[]
): ApiError {
  return {
    status,
    code: code || `ERR_${status}`,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

export function parseApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "status" in error) {
    return error as ApiError;
  }

  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return createApiError(0, API_ERROR_MESSAGES[0], "ERR_NETWORK");
  }

  if (error instanceof Error) {
    const statusMatch = error.message.match(/API Error (\d+)/);
    const status = statusMatch ? parseInt(statusMatch[1]) : 500;
    return createApiError(status, getErrorMessage(status));
  }

  return createApiError(500, API_ERROR_MESSAGES[500], "ERR_UNKNOWN");
}

const STATUS_ICONS: Record<string, typeof AlertCircle> = {
  network: WifiOff,
  auth: ShieldAlert,
  forbidden: Ban,
  server: ServerCrash,
  default: AlertCircle,
};

function getErrorCategory(status: number): string {
  if (status === 0) return "network";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status >= 500) return "server";
  return "default";
}

function getErrorTitle(status: number): string {
  if (status === 0) return "Sin conexion";
  if (status === 401) return "Sesion expirada";
  if (status === 403) return "Acceso denegado";
  if (status === 404) return "No encontrado";
  if (status === 422) return "Datos invalidos";
  if (status === 429) return "Demasiadas solicitudes";
  if (status >= 500) return "Error del servidor";
  return "Error";
}

interface ErrorMessageProps {
  error: ApiError | string | null;
  title?: string;
  onRetry?: () => void;
  variant?: "inline" | "card" | "banner" | "compact";
  className?: string;
}

export function ErrorMessage({ error, title, onRetry, variant = "card", className }: ErrorMessageProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const apiError: ApiError = typeof error === "string"
    ? { status: 500, code: "ERR_UNKNOWN", message: error }
    : error;

  const category = getErrorCategory(apiError.status);
  const Icon = STATUS_ICONS[category] || STATUS_ICONS.default;
  const errorTitle = title || getErrorTitle(apiError.status);
  const errorMessage = apiError.message || getErrorMessage(apiError.status);

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-destructive ${className || ""}`}
        role="alert"
        data-testid="error-compact"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{errorMessage}</span>
        {onRetry && (
          <Button variant="ghost" size="icon" onClick={onRetry} data-testid="button-retry-compact">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/20 ${className || ""}`}
        role="alert"
        data-testid="error-banner"
      >
        <Icon className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{errorTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{errorMessage}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} data-testid="button-retry-banner">
            <RefreshCw className="h-3 w-3 mr-1" />
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={`flex flex-col gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 ${className || ""}`}
        role="alert"
        data-testid="error-inline"
      >
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">{errorTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{errorMessage}</p>
          </div>
        </div>
        {apiError.details && apiError.details.length > 0 && (
          <div className="flex flex-col gap-1 ml-6">
            {apiError.details.map((detail, idx) => (
              <p key={idx} className="text-xs text-destructive">
                {detail.field && <span className="font-medium">{detail.field}: </span>}
                {detail.message}
              </p>
            ))}
          </div>
        )}
        {onRetry && (
          <div className="ml-6">
            <Button variant="outline" size="sm" onClick={onRetry} data-testid="button-retry-inline">
              <RefreshCw className="h-3 w-3 mr-1" />
              Reintentar
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-destructive/30 ${className || ""}`} data-testid="error-card">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
          <Icon className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-base font-semibold" data-testid="text-error-title">
          {errorTitle}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {errorMessage}
        </p>

        {apiError.details && apiError.details.length > 0 && (
          <div className="mt-3 w-full max-w-md">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto transition-colors"
              data-testid="button-toggle-details"
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDetails ? "Ocultar detalles" : "Ver detalles"}
            </button>
            {showDetails && (
              <div className="mt-2 p-3 rounded-md bg-muted/50 text-left">
                {apiError.details.map((detail, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">
                    {detail.field && <span className="font-medium text-foreground">{detail.field}: </span>}
                    {detail.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {apiError.code && (
          <p className="text-xs text-muted-foreground mt-2">
            Codigo: {apiError.code}
          </p>
        )}

        <div className="flex gap-2 mt-4 flex-wrap justify-center">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} data-testid="button-retry-card">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Error capturado:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-6">
          <Card className="w-full max-w-md border-destructive/30" data-testid="error-boundary-card">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-base font-semibold">
                Algo salio mal
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ocurrio un error inesperado al cargar este componente.
              </p>
              {this.state.error && (
                <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted/50 px-3 py-1.5 rounded-md max-w-full truncate">
                  {this.state.error.message}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="mt-4"
                data-testid="button-error-boundary-retry"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AsyncContentProps<T> {
  isLoading?: boolean;
  error?: ApiError | string | null;
  data?: T | null;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
  loadingVariant?: "skeleton" | "spinner" | "inline";
  errorVariant?: "card" | "inline" | "banner" | "compact";
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  skeletonCount?: number;
  skeletonHeight?: string;
  className?: string;
  isEmpty?: (data: T) => boolean;
}

export function AsyncContent<T>({
  isLoading,
  error,
  data,
  onRetry,
  children,
  loadingVariant = "skeleton",
  errorVariant = "card",
  emptyMessage = "No hay datos disponibles",
  emptyIcon,
  skeletonCount = 3,
  skeletonHeight = "h-12",
  className,
  isEmpty,
}: AsyncContentProps<T>) {
  if (isLoading) {
    if (loadingVariant === "spinner") {
      return (
        <div className={`flex items-center justify-center py-12 ${className || ""}`} data-testid="loading-spinner">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </div>
        </div>
      );
    }

    if (loadingVariant === "inline") {
      return (
        <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className || ""}`} data-testid="loading-inline">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando...</span>
        </div>
      );
    }

    return (
      <div className={`flex flex-col gap-3 ${className || ""}`} data-testid="loading-skeleton">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className={`w-full ${skeletonHeight} rounded-md`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        error={error}
        variant={errorVariant}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (data === null || data === undefined) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-muted-foreground ${className || ""}`} data-testid="empty-state">
        {emptyIcon || <Inbox className="h-12 w-12 mb-3" />}
        <p className="text-base font-medium">{emptyMessage}</p>
      </div>
    );
  }

  const dataIsEmpty = isEmpty ? isEmpty(data) : (Array.isArray(data) && data.length === 0);

  if (dataIsEmpty) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-muted-foreground ${className || ""}`} data-testid="empty-state">
        {emptyIcon || <Inbox className="h-12 w-12 mb-3" />}
        <p className="text-base font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children(data)}</>;
}
