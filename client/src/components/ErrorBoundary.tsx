import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary para capturar errores en componentes hijos
 * Implementa manejo graceful de errores con UI informativa
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log del error para debugging
    console.error('Error capturado por Error Boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Aquí podrías enviar el error a un servicio de logging
    // como Sentry, LogRocket, etc.
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Si se proporciona un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI por defecto del Error Boundary
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            {/* Icono de error */}
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-100 p-4">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
            </div>

            {/* Título y mensaje */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                ¡Algo salió mal!
              </h1>
              <p className="text-lg text-gray-600">
                Lo sentimos, ocurrió un error inesperado en la aplicación.
              </p>
            </div>

            {/* Detalles del error (solo en desarrollo) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 bg-gray-100 rounded-lg p-4 overflow-auto max-h-60">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Detalles del error (solo visible en desarrollo):
                </p>
                <pre className="text-xs text-red-600 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                      Ver stack trace
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap break-words">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Intentar de nuevo
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Recargar página
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Home className="h-4 w-4" />
                Ir al inicio
              </Button>
            </div>

            {/* Información de contacto */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Si el problema persiste, por favor contacte al administrador del sistema.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para usar Error Boundary con componentes funcionales
 * Permite resetear el error boundary desde componentes hijos
 */
export function useErrorBoundary() {
  const [, setError] = React.useState();
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}
