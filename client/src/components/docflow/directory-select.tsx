import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle } from "lucide-react";
import { useDirectoryService } from "@/services/docflow/directory-service-context";
import type { DirectoryType, DirectoryFilter, DirectoryParameter } from "@/types/docflow/directory.types";

interface DirectorySelectProps {
  directoryType: DirectoryType;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  filter?: DirectoryFilter;
  showInactive?: boolean;
  showDescription?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  "data-testid"?: string;
  error?: string;
}

export function DirectorySelect({
  directoryType,
  value,
  onValueChange,
  placeholder = "Selecciona una opcion",
  filter,
  showInactive = false,
  showDescription = false,
  searchable = false,
  disabled = false,
  className,
  includeAllOption = false,
  allOptionLabel = "Todos",
  "data-testid": testId,
  error,
}: DirectorySelectProps) {
  const directoryService = useDirectoryService();
  const [searchTerm, setSearchTerm] = useState("");

  const parameters = useMemo(() => {
    const baseFilter: DirectoryFilter = {
      ...filter,
      isActive: showInactive ? undefined : true,
    };
    return directoryService.getParameters(directoryType, baseFilter);
  }, [directoryService, directoryType, filter, showInactive]);

  const filteredParameters = useMemo(() => {
    if (!searchTerm.trim()) return parameters;
    const q = searchTerm.toLowerCase();
    return parameters.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [parameters, searchTerm]);

  const hasError = !!error;

  return (
    <div className="flex flex-col gap-1">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={`${hasError ? "border-destructive" : ""} ${className || ""}`}
          data-testid={testId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {searchable && (
            <div className="flex items-center gap-2 px-2 pb-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm"
                data-testid={testId ? `${testId}-search` : undefined}
              />
            </div>
          )}

          {includeAllOption && (
            <SelectItem value="__all__" data-testid={testId ? `${testId}-option-all` : undefined}>
              {allOptionLabel}
            </SelectItem>
          )}

          {filteredParameters.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground justify-center">
              <AlertCircle className="h-4 w-4" />
              <span>Sin opciones disponibles</span>
            </div>
          ) : (
            filteredParameters.map((param) => (
              <SelectItem
                key={param.id}
                value={String(param.code)}
                data-testid={testId ? `${testId}-option-${param.code}` : undefined}
              >
                <DirectoryOptionLabel
                  param={param}
                  showDescription={showDescription}
                />
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {hasError && (
        <p className="text-xs text-destructive flex items-center gap-1" data-testid={testId ? `${testId}-error` : undefined}>
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function DirectoryOptionLabel({
  param,
  showDescription,
}: {
  param: DirectoryParameter;
  showDescription: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span>{param.label}</span>
      {!param.isActive && (
        <Badge variant="secondary" className="text-xs">
          Inactivo
        </Badge>
      )}
      {showDescription && param.description && (
        <span className="text-xs text-muted-foreground">
          - {param.description}
        </span>
      )}
    </div>
  );
}

interface DirectoryBadgeProps {
  directoryType: DirectoryType;
  code: string;
  fallback?: string;
  className?: string;
}

export function DirectoryBadge({ directoryType, code, fallback, className }: DirectoryBadgeProps) {
  const directoryService = useDirectoryService();
  const param = directoryService.getParameterByCode(directoryType, code);

  return (
    <Badge
      variant="outline"
      className={className}
      data-testid={`badge-directory-${directoryType}-${code}`}
    >
      {param?.label || fallback || code}
    </Badge>
  );
}
